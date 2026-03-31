const express = require('express');
const router  = express.Router();
const path    = require('path');
const multer  = require('multer');
const { body, validationResult } = require('express-validator');
const { Cashfree } = require('cashfree-pg');

Cashfree.XClientId     = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment  = process.env.CASHFREE_ENV === 'PRODUCTION'
  ? Cashfree.Environment.PRODUCTION
  : Cashfree.Environment.SANDBOX;

const CF_VERSION = '2023-08-01';

const upload     = require('../middleware/upload');
const Submission = require('../models/Submission');
const { extractTextFromImage, determinePaymentStatus } = require('../utils/ocr');
const { getExpectedAmount } = require('../models/Settings');

const formValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).escape(),
  body('parentsName').trim().notEmpty().withMessage("Parent's name is required").isLength({ max: 100 }).escape(),
  body('mobile').trim().notEmpty().withMessage('Mobile number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'),
  body('maritalStatus').isIn(['Married', 'Unmarried']).withMessage('Invalid marital status'),
  body('designation').trim().notEmpty().withMessage('Designation is required').isLength({ max: 100 }).escape(),
  body('division').trim().notEmpty().withMessage('Division is required').isLength({ max: 100 }).escape(),
  body('circle').trim().notEmpty().withMessage('Circle is required').isLength({ max: 100 }).escape(),
  body('educationQualifications').trim().notEmpty().withMessage('Education qualifications are required').isLength({ max: 500 }).escape(),
  body('residenceAddress').optional().trim().isLength({ max: 500 }).escape(),
  body('religion').optional().trim().isLength({ max: 50 }).escape(),
  body('caste').optional().trim().isLength({ max: 50 }).escape(),
  body('interests').optional().trim().isLength({ max: 300 }).escape(),
];

router.post(
  '/submit-form',
  (req, res, next) => {
    upload.fields([{ name: 'passportPhoto', maxCount: 1 }, { name: 'paymentScreenshot', maxCount: 1 }])(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'File size must be under 2 MB' : err.message });
      }
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  formValidation,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });
    }

    try {
      const { name, parentsName, mobile, religion, caste, maritalStatus, designation, division, circle, educationQualifications, residenceAddress, interests } = req.body;

      const passportFile    = req.files?.passportPhoto?.[0];
      const screenshotFile  = req.files?.paymentScreenshot?.[0];
      const cashfreeOrderId = req.body.cashfreeOrderId?.trim() || null;

      if (!passportFile) {
        return res.status(400).json({ success: false, message: 'Passport photo is required.' });
      }

      const passportRelPath   = path.relative(path.join(__dirname, '..'), passportFile.path).replace(/\\/g, '/');
      const screenshotRelPath = screenshotFile
        ? path.relative(path.join(__dirname, '..'), screenshotFile.path).replace(/\\/g, '/')
        : null;

      // If paid via Cashfree, verify before saving
      let initialStatus = 'Unpaid';
      if (cashfreeOrderId) {
        try {
          const cfRes = await Cashfree.PGFetchOrder(CF_VERSION, cashfreeOrderId);
          if (cfRes.data?.order_status === 'PAID') initialStatus = 'Paid';
        } catch (err) {
          console.error('[Cashfree verify on submit] error:', err?.response?.data || err.message);
        }
      }

      const submission = new Submission({
        name, parentsName, mobile,
        religion: religion || '',
        caste: caste || '',
        maritalStatus,
        designation: designation || '',
        division: division || '',
        circle: circle || '',
        educationQualifications,
        residenceAddress: residenceAddress || '',
        interests: interests || '',
        passportPhoto: passportRelPath,
        paymentScreenshot: screenshotRelPath,
        cashfreeOrderId,
        paymentStatus: initialStatus === 'Paid' ? 'Paid' : (screenshotFile ? 'Pending' : 'Unpaid'),
      });

      await submission.save();

      // Respond immediately
      res.status(201).json({
        success: true,
        message: 'Form submitted successfully!',
        paymentStatus: submission.paymentStatus,
      });

      // Run OCR in background only if screenshot was uploaded and not already paid via Cashfree
      if (screenshotFile && initialStatus !== 'Paid') {
        (async () => {
          try {
            const expectedAmount = await getExpectedAmount();
            const { text, amount } = await extractTextFromImage(screenshotFile.path);

            let paymentStatus = 'Invalid Screenshot';
            let extractedAmount = null;

            if (!text || text.trim().length < 10) {
              paymentStatus = 'Invalid Screenshot';
            } else {
              const result = determinePaymentStatus(screenshotRelPath, amount, expectedAmount, text);
              paymentStatus   = result.status;
              extractedAmount = result.amount;
            }

            await submission.updateOne({ $set: { paymentStatus, extractedAmount, ocrText: text || '' } });
          } catch (err) {
            console.error('[OCR] error:', err.message);
            await submission.updateOne({ $set: { paymentStatus: 'Invalid Screenshot' } });
          }
        })();
      }

    } catch (error) {
      console.error('Submit form error:', error);
      return res.status(500).json({ success: false, message: 'An unexpected server error occurred. Please try again.' });
    }
  }
);

module.exports = router;
