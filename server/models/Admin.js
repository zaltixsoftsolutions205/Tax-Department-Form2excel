const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  name: {
    type: String, required: true, trim: true,
  },
  // Either email or mobile must be provided
  email: {
    type: String, trim: true, lowercase: true, default: null,
  },
  mobile: {
    type: String, trim: true, default: null,
  },
  password: {
    type: String, required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before save
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
adminSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
