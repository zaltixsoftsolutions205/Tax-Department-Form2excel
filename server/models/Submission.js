const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    // Personal Details
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    parentsName: {
      type: String,
      trim: true,
      maxlength: [100, "Parent's name cannot exceed 100 characters"],
      default: '',
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Invalid mobile number'],
    },
    caste: {
      type: String,
      trim: true,
      default: '',
    },

    // Working Place
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
      maxlength: [100, 'Designation cannot exceed 100 characters'],
    },
    division: {
      type: String,
      required: [true, 'Division is required'],
      trim: true,
      maxlength: [100, 'Division cannot exceed 100 characters'],
    },
    circle: {
      type: String,
      required: [true, 'Circle is required'],
      trim: true,
      maxlength: [100, 'Circle cannot exceed 100 characters'],
    },

    // Payment Info
    paymentScreenshot: {
      type: String,
      default: null,
    },
    extractedAmount: {
      type: Number,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Unpaid', 'Invalid Screenshot', 'Paid (Verification Required)'],
      default: 'Unpaid',
    },
    ocrText: {
      type: String,
      default: null,
    },
    // Cashfree order
    cashfreeOrderId: {
      type: String,
      trim: true,
      default: null,
    },
    // PhonePe / UPI transaction fields
    transactionId: {
      type: String,
      trim: true,
      default: null,
    },
    paymentAttempted: {
      type: Boolean,
      default: false,
    },
    manualOverride: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'submittedAt', updatedAt: 'updatedAt' },
  }
);

// Index for efficient filtering
submissionSchema.index({ submittedAt: -1 });
submissionSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
