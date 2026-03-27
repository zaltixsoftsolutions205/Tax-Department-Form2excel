const { createWorker } = require('tesseract.js');

// Expected amount is fetched dynamically from DB at submission time (passed as arg)
// Fallback used only in standalone tests
const DEFAULT_EXPECTED = parseInt(process.env.EXPECTED_AMOUNT || '1', 10);

// Account number to verify in screenshot
const ACCOUNT_NO = process.env.ACCOUNT_NO || '081710100101759';

/**
 * Checks whether OCR text contains the bank account number.
 * Handles masked formats like XX1759, ****101759, etc.
 */
function checkAccountInText(text) {
  if (!text) return false;
  const normalized = text.replace(/[\s\-\.]/g, '');
  const last4  = ACCOUNT_NO.slice(-4);   // 1759
  const last6  = ACCOUNT_NO.slice(-6);   // 101759
  // Full match
  if (normalized.includes(ACCOUNT_NO)) return true;
  // Masked format: XX1759 / ****1759 / x...x1759
  if (new RegExp(`[Xx*]{1,}${last6}`).test(text)) return true;
  if (new RegExp(`[Xx*]{1,}${last4}`).test(text)) return true;
  // Some apps show only last 4 digits on success screen
  if (new RegExp(`\\b${last4}\\b`).test(text)) return true;
  return false;
}

/**
 * Runs Tesseract OCR on a local image file.
 * Returns { text: string, amount: number|null }
 */
async function extractTextFromImage(imagePath) {
  let worker;
  try {
    worker = await createWorker('eng', 1, { logger: () => {} });
    const { data } = await worker.recognize(imagePath);
    const text = data.text || '';
    console.log('\n── OCR RAW TEXT ──────────────────────');
    console.log(text.trim());
    console.log('──────────────────────────────────────\n');
    const amount = extractPaymentAmount(text);
    console.log('Extracted amount:', amount);
    return { text, amount };
  } catch (err) {
    console.error('OCR error:', err.message);
    return { text: '', amount: null };
  } finally {
    if (worker) await worker.terminate();
  }
}

/**
 * Smart extractor for Indian UPI / bank payment screenshots.
 * Handles PhonePe, GPay, Paytm, BHIM, bank SMS-style text.
 */
function extractPaymentAmount(text) {
  if (!text) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // ── Step 1: Blocklist lines we must ignore ──────────────────────────────
  // These lines contain numbers that are NOT amounts
  const isNoiseLine = (line) => {
    const upper = line.toUpperCase();
    return (
      /TRANSACTION\s*ID/i.test(line) ||
      /UTR/i.test(line) ||
      /ORDER\s*ID/i.test(line) ||
      /REFERENCE/i.test(line) ||
      /MOBILE|PHONE|@|\.COM/i.test(line) ||
      /XXXX|XXXXXXX/i.test(line) ||          // masked account numbers
      /\d{10,}/.test(line) ||                 // 10+ digit strings = IDs/phone numbers
      /\d{4}\s*\d{4}\s*\d{4}/.test(line)    // card numbers
    );
  };

  const cleanLines = lines.filter(l => !isNoiseLine(l));

  const candidates = [];

  // ── Step 2: Priority patterns (most reliable) ───────────────────────────

  // ₹500 or ₹ 500 (explicit rupee symbol)
  for (const line of cleanLines) {
    const m = line.match(/₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/);
    if (m) candidates.push({ val: parseNum(m[1]), priority: 10 });
  }

  // Rs 500 / Rs.500
  for (const line of cleanLines) {
    const m = line.match(/Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (m) candidates.push({ val: parseNum(m[1]), priority: 10 });
  }

  // INR 500
  for (const line of cleanLines) {
    const m = line.match(/INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (m) candidates.push({ val: parseNum(m[1]), priority: 10 });
  }

  // "Amount: 500" / "Total: 500" / "Paid: 500"
  for (const line of cleanLines) {
    const m = line.match(/(?:Amount|Total|Fee|Membership|Paid|Payment)\s*[:\-]?\s*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (m) candidates.push({ val: parseNum(m[1]), priority: 9 });
  }

  // ── Step 3: UPI app specific patterns ───────────────────────────────────

  // PhonePe / GPay: "Paid to\n[Merchant Name] [AMOUNT]"
  // The line after "Paid to" often ends with the amount
  for (let i = 0; i < lines.length; i++) {
    if (/^paid\s+to$/i.test(lines[i].trim()) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (!isNoiseLine(nextLine)) {
        const m = nextLine.match(/([0-9,]+(?:\.[0-9]{1,2})?)$/);
        if (m) candidates.push({ val: parseNum(m[1]), priority: 8 });
      }
    }
  }

  // "Debited INR 500" / "Debited ₹500" / "Debited: 500"
  for (const line of cleanLines) {
    const m = line.match(/Debited\s*(?:INR|₹|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (m) candidates.push({ val: parseNum(m[1]), priority: 8 });
  }

  // "Sent ₹500" / "Transferred ₹500"
  for (const line of cleanLines) {
    const m = line.match(/(?:Sent|Transferred|Credited|Received)\s*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (m) candidates.push({ val: parseNum(m[1]), priority: 7 });
  }

  // ── Step 4: Fallback — standalone amounts on short lines ────────────────
  // Lines that are ONLY a number (or ₹number) — typical of app UI headers
  for (const line of cleanLines) {
    const m = line.match(/^(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)$/i);
    if (m) {
      const val = parseNum(m[1]);
      if (val >= 10) candidates.push({ val, priority: 5 });
    }
  }

  // ── Step 5: Pick best candidate ─────────────────────────────────────────
  if (candidates.length === 0) return null;

  // Filter obviously invalid values
  const valid = candidates.filter(c => c.val > 0 && c.val <= 999999);
  if (valid.length === 0) return null;

  // Sort by priority desc, then by value desc
  valid.sort((a, b) => b.priority - a.priority || b.val - a.val);

  console.log('Amount candidates:', valid.slice(0, 5));
  return valid[0].val;
}

function parseNum(str) {
  return parseFloat(String(str).replace(/,/g, ''));
}

/**
 * Determines payment status from screenshot OCR.
 * Rules:
 *   - No screenshot                          → Unpaid
 *   - Screenshot + account found + amount OK → Paid
 *   - Anything else                          → Unpaid
 *
 * @param {string|null} screenshotPath
 * @param {number|null} amount         - extracted by OCR
 * @param {number}      expectedAmount - from DB settings
 * @param {string}      ocrText        - full OCR text for account check
 */
function determinePaymentStatus(screenshotPath, amount, expectedAmount = DEFAULT_EXPECTED, ocrText = '') {
  if (!screenshotPath)                          return { status: 'Unpaid', amount: null };
  const accountFound = checkAccountInText(ocrText);
  const amountOk     = amount !== null && amount >= expectedAmount;
  if (accountFound && amountOk)                 return { status: 'Paid',   amount };
  return                                               { status: 'Unpaid', amount };
}

module.exports = { extractTextFromImage, determinePaymentStatus, extractPaymentAmount };
