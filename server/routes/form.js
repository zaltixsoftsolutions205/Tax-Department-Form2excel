const express = require('express');
const router  = express.Router();
const path    = require('path');
const multer  = require('multer');
const { body, validationResult } = require('express-validator');

const upload       = require('../middleware/upload');
const Submission   = require('../models/Submission');
const { extractTextFromImage, determinePaymentStatus } = require('../utils/ocr');
const { getExpectedAmount } = require('../models/Settings');
const { sendSMS }  = require('../utils/sms');

// ── Validation rules ──────────────────────────────────────────────────────────
const formValidation = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name must be under 100 characters')
    .escape(),

  body('parentsName')
    .trim().notEmpty().withMessage("Parent's name is required")
    .isLength({ max: 100 }).withMessage("Parent's name must be under 100 characters")
    .escape(),

  body('maritalStatus')
    .isIn(['Married', 'Unmarried'])
    .withMessage('Invalid marital status'),

  body('designation').trim().notEmpty().withMessage('Designation is required').isLength({ max: 100 }).escape(),
  body('division').trim().notEmpty().withMessage('Division is required').isLength({ max: 100 }).escape(),
  body('circle').trim().notEmpty().withMessage('Circle is required').isLength({ max: 100 }).escape(),

  body('educationQualifications')
    .trim().notEmpty().withMessage('Education qualifications are required')
    .isLength({ max: 500 }).escape(),

  body('residenceAddress')
    .trim().notEmpty().withMessage('Residence address is required')
    .isLength({ max: 500 }).escape(),

  body('mobile')
    .trim().notEmpty().withMessage('Mobile number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'),

  body('religion').optional().trim().isLength({ max: 50 }).escape(),
  body('caste').optional().trim().isLength({ max: 50 }).escape(),
  body('interests').optional().trim().isLength({ max: 300 }).escape(),
];

// ── POST /api/submit-form ─────────────────────────────────────────────────────
router.post(
  '/submit-form',
  (req, res, next) => {
    // Handle multer errors gracefully before validation
    upload.single('paymentScreenshot')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const msg =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'File size must be under 2 MB'
            : err.message || 'File upload error';
        return res.status(400).json({ success: false, message: msg });
      }
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  formValidation,
  async (req, res) => {
    // Validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    try {
      const {
        name, parentsName, mobile, religion, caste, maritalStatus,
        designation, division, circle,
        educationQualifications, residenceAddress, interests,
      } = req.body;

      // ── Save immediately with Pending status ─────────────────────────────
      let screenshotRelPath = null;

      if (req.file) {
        screenshotRelPath = path.relative(
          path.join(__dirname, '..'),
          req.file.path
        ).replace(/\\/g, '/');
      }

      const submission = new Submission({
        name,
        parentsName,
        mobile,
        religion:                religion               || '',
        caste:                   caste                  || '',
        maritalStatus,
        designation:             designation            || '',
        division:                division               || '',
        circle:                  circle                 || '',
        educationQualifications,
        residenceAddress:        residenceAddress       || '',
        interests:               interests              || '',
        paymentScreenshot:       screenshotRelPath,
        paymentStatus:           screenshotRelPath ? 'Pending' : 'Unpaid',
      });

      await submission.save();

      // ── Respond immediately so user doesn't wait ──────────────────────────
      res.status(201).json({
        success:       true,
        message:       'Form submitted successfully!',
        paymentStatus: submission.paymentStatus,
      });

      // ── Run OCR + SMS in background after response is sent ────────────────
      if (req.file) {
        (async () => {
          try {
            const { text, amount } = await extractTextFromImage(req.file.path);
            const expected         = await getExpectedAmount();
            const result           = determinePaymentStatus(screenshotRelPath, amount, expected, text);

            await submission.updateOne({
              paymentStatus:   result.status,
              extractedAmount: result.amount,
              ocrText:         text,
            });

            const smsMessage = result.status === 'Paid'
              ? `Dear ${name}, you have been successfully registered with Commercial Taxes SC & ST Employees Association. Your payment has been verified. Welcome!`
              : `Dear ${name}, your registration with Commercial Taxes SC & ST Employees Association has been received. Please complete your payment to activate your membership.`;

            await sendSMS(mobile, smsMessage);
          } catch (err) {
            console.error('Background OCR/SMS error:', err.message);
          }
        })();
      } else {
        // No screenshot — send registration received SMS immediately
        const smsMessage = `Dear ${name}, your registration with Commercial Taxes SC & ST Employees Association has been received. Please complete your payment to activate your membership.`;
        sendSMS(mobile, smsMessage).catch(() => {});
      }
    } catch (error) {
      console.error('Submit form error:', error);
      return res.status(500).json({
        success: false,
        message: 'An unexpected server error occurred. Please try again.',
      });
    }
  }
);

module.exports = router;
