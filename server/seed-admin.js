/**
 * Run once to create the admin account:
 *   node seed-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Admin    = require('./models/Admin');

const EMAIL    = 'tgscstassociationctdept@gmail.com';
const PASSWORD = 'TCTS@2024';
const NAME     = 'TCTS Admin';

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const existing = await Admin.findOne({ email: EMAIL });
    if (existing) {
      console.log('Admin already exists:', EMAIL);
    } else {
      await Admin.create({ name: NAME, email: EMAIL, password: PASSWORD });
      console.log('✓ Admin created:', EMAIL);
      console.log('  Password:', PASSWORD);
    }
    await mongoose.disconnect();
  })
  .catch(err => { console.error(err.message); process.exit(1); });
