const express = require('express');
const router  = express.Router();
const path    = require('path');
const multer  = require('multer');
const { body, validationResult } = require('express-validator');

const upload       = require('../middleware/upload');
const Submission   = require('../models/Submission');

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

  body('religion')
    .trim().notEmpty().withMessage('Religion is required')
    .isLength({ max: 50 }).escape(),

  body('caste')
    .trim().notEmpty().withMessage('Caste is required')
    .isLength({ max: 50 }).escape(),

  body('maritalStatus')
    .isIn(['Married', 'Unmarried'])
    .withMessage('Invalid marital status'),

  body('designation').optional().trim().isLength({ max: 100 }).escape(),
  body('division').optional().trim().isLength({ max: 100 }).escape(),
  body('circle').optional().trim().isLength({ max: 100 }).escape(),

  body('educationQualifications')
    .trim().notEmpty().withMessage('Education qualifications are required')
    .isLength({ max: 500 }).escape(),

  body('residenceAddress')
    .trim().notEmpty().withMessage('Residence address is required')
    .isLength({ max: 500 }).escape(),

  body('interests').optional().trim().isLength({ max: 300 }).escape(),
  body('transactionId').optional().trim().isLength({ max: 100 }).escape(),
  body('paymentAttempted').optional().isBoolean(),
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
        name, parentsName, religion, caste, maritalStatus,
        designation, division, circle,
        educationQualifications, residenceAddress, interests,
        transactionId,
      } = req.body;

      const txnId    = transactionId?.trim() || null;
      const attempted = req.body.paymentAttempted === 'true' || req.body.paymentAttempted === true;

      // ── Payment status logic ──────────────────────────────────────────────
      // transactionId provided → needs admin verification
      // paymentAttempted but no txnId → Pending (paid but didn't enter ID yet)
      // neither → Unpaid
      let paymentStatus     = 'Unpaid';
      let screenshotRelPath = null;

      if (txnId) {
        paymentStatus = 'Paid (Verification Required)';
      } else if (attempted) {
        paymentStatus = 'Pending';
      }

      if (req.file) {
        screenshotRelPath = path.relative(
          path.join(__dirname, '..'),
          req.file.path
        ).replace(/\\/g, '/');
      }

      const submission = new Submission({
        name,
        parentsName,
        religion,
        caste,
        maritalStatus,
        designation:             designation            || '',
        division:                division               || '',
        circle:                  circle                 || '',
        educationQualifications,
        residenceAddress,
        interests:               interests              || '',
        paymentScreenshot:       screenshotRelPath,
        paymentStatus,
        transactionId:           txnId,
        paymentAttempted:        attempted,
      });

      await submission.save();

      return res.status(201).json({
        success:       true,
        message:       'Form submitted successfully!',
        paymentStatus,
      });
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
