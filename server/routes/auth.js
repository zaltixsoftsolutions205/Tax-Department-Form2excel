const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Admin   = require('../models/Admin');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
    body('identifier')
      .trim().notEmpty()
      .withMessage('Email or mobile number is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: errors.array()[0].msg });

    const { name, identifier, password } = req.body;

    // Detect if identifier is email or mobile
    const isEmail  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isMobile = /^[6-9]\d{9}$/.test(identifier);

    if (!isEmail && !isMobile)
      return res.status(400).json({ success: false, message: 'Enter a valid email or 10-digit mobile number.' });

    try {
      // Check duplicate
      const existing = isEmail
        ? await Admin.findOne({ email: identifier.toLowerCase() })
        : await Admin.findOne({ mobile: identifier });

      if (existing)
        return res.status(409).json({ success: false, message: 'This email / mobile is already registered.' });

      const admin = await Admin.create({
        name,
        email:  isEmail  ? identifier.toLowerCase() : null,
        mobile: isMobile ? identifier : null,
        password,
      });

      const token = signToken(admin._id);
      res.status(201).json({
        success: true,
        message: 'Registered successfully.',
        token,
        admin: { id: admin._id, name: admin.name, email: admin.email, mobile: admin.mobile },
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  }
);

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('identifier').trim().notEmpty().withMessage('Email or mobile is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: errors.array()[0].msg });

    const { identifier, password } = req.body;

    const isEmail  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    try {
      const admin = isEmail
        ? await Admin.findOne({ email: identifier.toLowerCase() })
        : await Admin.findOne({ mobile: identifier });

      if (!admin)
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });

      const match = await admin.comparePassword(password);
      if (!match)
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });

      const token = signToken(admin._id);
      res.json({
        success: true,
        message: 'Login successful.',
        token,
        admin: { id: admin._id, name: admin.name, email: admin.email, mobile: admin.mobile },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  }
);

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const authMiddleware = require('../middleware/authMiddleware');
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select('-password');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });
    res.json({ success: true, admin });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
