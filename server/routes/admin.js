const express = require('express');
const router  = express.Router();
const { param, body, query, validationResult } = require('express-validator');
const path    = require('path');

const Submission    = require('../models/Submission');
const { generateExcel } = require('../utils/excel');
const { getExpectedAmount, setExpectedAmount } = require('../models/Settings');
const { extractTextFromImage, determinePaymentStatus } = require('../utils/ocr');

// ── Helper: build Mongo query from request query-string ───────────────────────
function buildQuery(reqQuery) {
  const { startDate, endDate, status } = reqQuery;
  const q = {};

  if (startDate || endDate) {
    q.submittedAt = {};
    if (startDate) q.submittedAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      q.submittedAt.$lte = end;
    }
  }

  if (status && status !== 'All') {
    q.paymentStatus = status;
  }

  return q;
}

// ── GET  /api/admin/settings ──────────────────────────────────────────────────
router.get('/settings', async (_req, res) => {
  try {
    const expectedAmount = await getExpectedAmount();
    res.json({ success: true, data: { expectedAmount } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT  /api/admin/settings ──────────────────────────────────────────────────
router.put(
  '/settings',
  [body('expectedAmount').isInt({ min: 1, max: 999999 }).withMessage('Amount must be a positive number')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    try {
      const updated = await setExpectedAmount(parseInt(req.body.expectedAmount, 10));
      res.json({ success: true, data: { expectedAmount: updated } });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const [total, paid, paidVerify, pending, unpaid, invalid] = await Promise.all([
      Submission.countDocuments(),
      Submission.countDocuments({ paymentStatus: 'Paid' }),
      Submission.countDocuments({ paymentStatus: 'Paid (Verification Required)' }),
      Submission.countDocuments({ paymentStatus: 'Pending' }),
      Submission.countDocuments({ paymentStatus: 'Unpaid' }),
      Submission.countDocuments({ paymentStatus: 'Invalid Screenshot' }),
    ]);

    res.json({ success: true, data: { total, paid, paidVerify, pending, unpaid, invalid } });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/admin/responses ──────────────────────────────────────────────────
router.get(
  '/responses',
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
    query('status').optional().isIn(['All', 'Paid', 'Paid (Verification Required)', 'Pending', 'Unpaid', 'Invalid Screenshot']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const page  = parseInt(req.query.page  || '1',   10);
      const limit = parseInt(req.query.limit || '100', 10);
      const skip  = (page - 1) * limit;
      const query = buildQuery(req.query);

      const [submissions, total] = await Promise.all([
        Submission.find(query)
          .sort({ submittedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Submission.countDocuments(query),
      ]);

      res.json({
        success: true,
        count:   submissions.length,
        total,
        page,
        pages:   Math.ceil(total / limit),
        data:    submissions,
      });
    } catch (err) {
      console.error('Get responses error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ── GET /api/admin/download-excel ─────────────────────────────────────────────
router.get('/download-excel', async (req, res) => {
  try {
    const query       = buildQuery(req.query);
    const submissions = await Submission.find(query).sort({ submittedAt: -1 }).lean();

    const workbook = await generateExcel(submissions);

    const today    = new Date().toISOString().split('T')[0];
    const filename = `association-data-${today}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('Download excel error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate Excel' });
  }
});

// ── PATCH /api/admin/submissions/:id/status ───────────────────────────────────
router.patch(
  '/submissions/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid submission ID'),
    body('status')
      .isIn(['Paid', 'Paid (Verification Required)', 'Pending', 'Unpaid', 'Invalid Screenshot'])
      .withMessage('Invalid status value'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const updated = await Submission.findByIdAndUpdate(
        req.params.id,
        { paymentStatus: req.body.status, manualOverride: true },
        { new: true }
      ).lean();

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('Update status error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ── POST /api/admin/submissions/:id/rerun-ocr ─────────────────────────────────
router.post(
  '/submissions/:id/rerun-ocr',
  [param('id').isMongoId().withMessage('Invalid submission ID')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: errors.array()[0].msg });

    try {
      const sub = await Submission.findById(req.params.id);
      if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });
      if (!sub.paymentScreenshot)
        return res.status(400).json({ success: false, message: 'No screenshot on file' });

      const screenshotPath = path.join(__dirname, '..', sub.paymentScreenshot);
      const expectedAmount = await getExpectedAmount();
      const { text, amount } = await extractTextFromImage(screenshotPath);

      let paymentStatus  = 'Invalid Screenshot';
      let extractedAmount = null;

      if (text && text.trim().length >= 10) {
        const result = determinePaymentStatus(sub.paymentScreenshot, amount, expectedAmount, text);
        paymentStatus   = result.status;
        extractedAmount = result.amount;
      }

      await sub.updateOne({ $set: { paymentStatus, extractedAmount, ocrText: text || '', manualOverride: false } });

      res.json({ success: true, data: { paymentStatus, extractedAmount } });
    } catch (err) {
      console.error('Re-run OCR error:', err.message);
      res.status(500).json({ success: false, message: 'OCR failed' });
    }
  }
);

// ── DELETE /api/admin/submissions/:id ─────────────────────────────────────────
router.delete(
  '/submissions/:id',
  [param('id').isMongoId().withMessage('Invalid submission ID')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const deleted = await Submission.findByIdAndDelete(req.params.id).lean();
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }
      res.json({ success: true, message: 'Submission deleted' });
    } catch (err) {
      console.error('Delete submission error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
