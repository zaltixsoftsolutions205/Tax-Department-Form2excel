const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const { body, validationResult } = require('express-validator');
const Submission = require('../models/Submission');
const { extractTextFromImage, determinePaymentStatus } = require('../utils/ocr');
const { getExpectedAmount } = require('../models/Settings');
const { uploadToCloudinary } = require('../utils/cloudinary');
const fs = require('fs');

/* ── Multer — save screenshots to uploads/ ──────────────────────────────── */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename:    (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

/* ── Validation ─────────────────────────────────────────────────────────── */
const formValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).escape(),
  body('parentsName').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).escape(),
  body('mobile').trim().notEmpty().withMessage('Mobile number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'),
  body('caste').optional({ checkFalsy: true }).trim().isIn(['SC', 'ST']).withMessage('Caste must be SC or ST'),
  body('designation').trim().notEmpty().withMessage('Designation is required').isLength({ max: 100 }).escape(),
  body('division').trim().notEmpty().withMessage('Division is required').isLength({ max: 100 }).escape(),
  body('circle').trim().notEmpty().withMessage('Circle is required').isLength({ max: 100 }).escape(),
];

/* ── GET /api/membership-amount ────────────────────────────────────────── */
router.get('/membership-amount', async (_req, res) => {
  try {
    const amount = await getExpectedAmount();
    res.json({ success: true, amount });
  } catch {
    res.json({ success: true, amount: 500 });
  }
});

/* ── POST /api/submit-form ──────────────────────────────────────────────── */
router.post('/submit-form', upload.single('paymentScreenshot'), formValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Payment screenshot is required.' });
  }

  const { name, parentsName, mobile, caste, designation, division, circle } = req.body;

  try {
    const submission = new Submission({
      name,
      parentsName:       parentsName || '',
      mobile,
      caste:             caste || '',
      designation,
      division,
      circle,
      paymentScreenshot: `uploads/${req.file.filename}`,
      paymentStatus:     'Pending',
    });

    await submission.save();

    // Respond immediately — Cloudinary upload + OCR runs in background
    res.status(201).json({
      success: true,
      message: 'Form submitted! Your payment screenshot is being verified automatically.',
    });

    // ── Background: Cloudinary upload + OCR ──────────────────────────────
    (async () => {
      const localPath = path.join(__dirname, '..', 'uploads', req.file.filename);
      try {
        // 1. Run OCR on local file
        const expectedAmount = await getExpectedAmount();
        const { text, amount } = await extractTextFromImage(localPath);
        const { status, amount: extractedAmount } = determinePaymentStatus(null, amount, expectedAmount, text);

        // 2. Upload to Cloudinary for permanent storage
        let screenshotUrl = `uploads/${req.file.filename}`;
        try {
          screenshotUrl = await uploadToCloudinary(localPath);
        } catch (cdnErr) {
          console.error('[Cloudinary] upload error:', cdnErr.message);
        }

        // 3. Update submission with Cloudinary URL + OCR result
        await Submission.findByIdAndUpdate(submission._id, {
          paymentScreenshot: screenshotUrl,
          paymentStatus:     status,
          extractedAmount:   extractedAmount ?? null,
          ocrText:           text ? text.substring(0, 500) : null,
        });
        console.log(`[OCR] submission ${submission._id} → ${status} (₹${extractedAmount})`);

        // 4. Delete local file
        fs.unlink(localPath, () => {});
      } catch (err) {
        console.error('[Background] error:', err.message);
      }
    })();

  } catch (error) {
    console.error('Submit form error:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again.' });
  }
});

module.exports = router;
