const express  = require('express');
const router   = express.Router();
const https    = require('https');
const { body, validationResult } = require('express-validator');

const Submission = require('../models/Submission');

/* ── Verify Cashfree order status ───────────────────────────────────────── */
function verifyCashfreeOrder(orderId) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.cashfree.com',
      path:     `/pg/orders/${orderId}`,
      method:   'GET',
      headers: {
        'x-client-id':     process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version':   '2023-08-01',
        'Content-Type':    'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.order_status || 'UNKNOWN');
        } catch { resolve('UNKNOWN'); }
      });
    });
    req.on('error', () => resolve('UNKNOWN'));
    req.end();
  });
}

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
  body('cashfreeOrderId').trim().notEmpty().withMessage('Payment order ID is required'),
];

/* ── POST /api/submit-form ──────────────────────────────────────────────── */
router.post('/submit-form', formValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }

  const { name, parentsName, mobile, caste, designation, division, circle, cashfreeOrderId } = req.body;

  try {
    /* Verify payment status with Cashfree */
    const cfStatus     = await verifyCashfreeOrder(cashfreeOrderId);
    const paymentStatus = cfStatus === 'PAID' ? 'Paid' : 'Pending';

    const submission = new Submission({
      name,
      parentsName:    parentsName || '',
      mobile,
      caste:          caste || '',
      designation,
      division,
      circle,
      cashfreeOrderId,
      paymentStatus,
    });

    await submission.save();

    return res.status(201).json({
      success: true,
      message: 'Form submitted successfully!',
      paymentStatus,
    });

  } catch (error) {
    console.error('Submit form error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again.',
    });
  }
});

module.exports = router;
