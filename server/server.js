require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const mongoose  = require('mongoose');
const path      = require('path');
const fs        = require('fs');

const formRoutes        = require('./routes/form');
const adminRoutes       = require('./routes/admin');
const authRoutes        = require('./routes/auth');
const paymentRoutes     = require('./routes/payment');
const authMiddleware    = require('./middleware/authMiddleware');

const app = express();

// ── Ensure uploads directory exists ──────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── Middleware ────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://zaltixsoftsolutions.com',
  'https://www.zaltixsoftsolutions.com',
  'https://membershipdrive.in',
  'https://www.membershipdrive.in',
  'https://tcts.membershipdrive.in',
  'https://tctsmembershipdrive.zaltixsoftsolutions.com',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, mobile)
      if (!origin) return callback(null, true);
      // Allow any vercel.app preview/production URL automatically
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve uploaded screenshots (used for admin image preview)
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', formRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', authMiddleware, adminRoutes); // protected

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Connect to MongoDB then start server ──────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000', 10);

async function seedAdmin() {
  const Admin = require('./models/Admin');
  const email = 'tgscstassociationctdept@gmail.com';
  const exists = await Admin.findOne({ email });
  if (!exists) {
    await Admin.create({ name: 'TCTS Admin', email, password: 'TCTS@2024' });
    console.log('✅ Admin account created:', email);
  }
}

async function seedSettings() {
  const { Settings } = require('./models/Settings');
  const amount = parseInt(process.env.EXPECTED_AMOUNT || '500', 10);
  await Settings.findOneAndUpdate(
    { key: 'global' },
    { $set: { expectedAmount: amount } },
    { upsert: true }
  );
  console.log(`✅ Payment amount set to ₹${amount}`);
}

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await seedAdmin();
    await seedSettings();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   Form  → http://localhost:5173/form`);
      console.log(`   Admin → http://localhost:5173/admin`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
