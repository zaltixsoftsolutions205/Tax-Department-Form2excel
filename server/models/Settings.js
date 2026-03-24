const mongoose = require('mongoose');

// Single-document settings store (always upserted with key = 'global')
const settingsSchema = new mongoose.Schema({
  key:            { type: String, default: 'global', unique: true },
  expectedAmount: { type: Number, default: 500, min: 1 },
});

const Settings = mongoose.model('Settings', settingsSchema);

/** Returns the current expected amount (creates default if missing) */
async function getExpectedAmount() {
  const doc = await Settings.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { expectedAmount: parseInt(process.env.EXPECTED_AMOUNT || '500', 10) } },
    { upsert: true, new: true }
  );
  return doc.expectedAmount;
}

/** Updates the expected amount */
async function setExpectedAmount(amount) {
  const doc = await Settings.findOneAndUpdate(
    { key: 'global' },
    { expectedAmount: amount },
    { upsert: true, new: true }
  );
  return doc.expectedAmount;
}

module.exports = { Settings, getExpectedAmount, setExpectedAmount };
