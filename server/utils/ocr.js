const { createWorker } = require('tesseract.js');

// Expected amount is fetched dynamically from DB at submission time (passed as arg)
// Fallback used only in standalone tests
const DEFAULT_EXPECTED = parseInt(process.env.EXPECTED_AMOUNT || '1000', 10);

// Account number to verify in screenshot
const ACCOUNT_NO = process.env.ACCOUNT_NO || '081710100101759';

// UPI ID to verify in screenshot (PhonePe/GPay show UPI ID, not bank account)
const UPI_ID = process.env.UPI_ID || 'aguru79621@ybl';

/**
 * Checks whether OCR text contains the bank account number.
 * Handles masked formats like XX1759, ****101759, etc.
 */
function checkAccountInText(text) {
  if (!text) return false;
  const normalized = text.replace(/[\s\-\.]/g, '');
  const last4  = ACCOUNT_NO.slice(-4);
  const last6  = ACCOUNT_NO.slice(-6);
  if (normalized.includes(ACCOUNT_NO)) return true;
  if (new RegExp(`[Xx*]{1,}${last6}`).test(text)) return true;
  if (new RegExp(`[Xx*]{1,}${last4}`).test(text)) return true;
  if (new RegExp(`\\b${last4}\\b`).test(text)) return true;
  return false;
}

/**
 * Checks whether OCR text contains the UPI ID.
 * PhonePe/GPay screenshots show UPI ID instead of bank account number.
 */
function checkUpiInText(text) {
  if (!text) return false;
  return text.toLowerCase().includes(UPI_ID.toLowerCase());
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
 * Extracts payment amount from OCR text of any Indian payment screenshot.
 * Strategy: pull every number from the text, discard obvious non-amounts
 * (transaction IDs, phone numbers, years), return the best match.
 */
function extractPaymentAmount(text) {
  if (!text) return null;

  console.log('\n── extractPaymentAmount ──');

  const candidates = [];

  // ── Pass 1: currency-tagged numbers (highest confidence) ────────────────
  // Matches: ₹500  ₹500.00  Rs500  Rs.500  INR500  INR 500.00
  // Also handles OCR misreads of ₹ as %, §, £, ¥, z, F followed by digits
  const currencyRe = /(?:₹|Rs\.?|INR|[%§£¥])[\s]?([0-9,]+(?:\.[0-9]{1,2})?)/gi;
  let m;
  while ((m = currencyRe.exec(text)) !== null) {
    const val = parseNum(m[1]);
    if (val >= 1 && val <= 999999) candidates.push({ val, priority: 10 });
  }

  // ── Pass 2: keyword-prefixed amounts ────────────────────────────────────
  // "Amount : 500"  "Total 500.00"  "Paid ₹500"  "Debited 500"  etc.
  const keywordRe = /(?:amount|total|paid|payment|debit(?:ed)?|credit(?:ed)?|transferred?|sent|fee|membership)\s*[:\-]?\s*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi;
  while ((m = keywordRe.exec(text)) !== null) {
    const val = parseNum(m[1]);
    if (val >= 1 && val <= 999999) candidates.push({ val, priority: 9 });
  }

  // ── Pass 3: all standalone decimal numbers (e.g. 500.00) ────────────────
  // Grab every number with exactly 2 decimal places — very common in payment apps
  const decimalRe = /(?<![0-9])([0-9]{1,6}\.[0-9]{2})(?![0-9])/g;
  while ((m = decimalRe.exec(text)) !== null) {
    const val = parseNum(m[1]);
    if (val >= 1 && val <= 999999) candidates.push({ val, priority: 7 });
  }

  // ── Pass 4: whole numbers on their own line ──────────────────────────────
  // Lines that are purely a number like "500" or "1,000"
  for (const line of text.split('\n').map(l => l.trim())) {
    const wm = line.match(/^([0-9]{1,3}(?:,[0-9]{3})*)$/);
    if (wm) {
      const val = parseNum(wm[1]);
      // Exclude years (1900-2099), single/double digits, phone-sized numbers
      if (val >= 10 && val <= 99999 && !(val >= 1900 && val <= 2099)) {
        candidates.push({ val, priority: 6 });
      }
    }
  }

  if (candidates.length === 0) {
    console.log('No amount candidates found');
    return null;
  }

  // Remove duplicates, keep highest priority per value
  const map = new Map();
  for (const c of candidates) {
    if (!map.has(c.val) || map.get(c.val).priority < c.priority) map.set(c.val, c);
  }
  const valid = [...map.values()].filter(c => c.val > 0);
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
 *   - No amount found in screenshot  → Invalid Screenshot (irrelevant image)
 *   - Amount found = expectedAmount  → Paid
 *   - Amount found ≠ expectedAmount  → Unpaid
 */
function determinePaymentStatus(screenshotPath, amount, expectedAmount = DEFAULT_EXPECTED, ocrText = '') {
  if (amount === null || amount === undefined) {
    console.log(`[OCR] No amount found — Invalid Screenshot`);
    return { status: 'Invalid Screenshot', amount: null };
  }
  const amountOk = amount >= expectedAmount;
  console.log(`[OCR] amount=${amount} expected=${expectedAmount} amountOk=${amountOk}`);
  if (amountOk) return { status: 'Paid',   amount };
  return               { status: 'Unpaid', amount };
}

module.exports = { extractTextFromImage, determinePaymentStatus, extractPaymentAmount };
