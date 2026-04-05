const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    // Employee ID
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      trim: true,
      maxlength: [50, 'Employee ID cannot exceed 50 characters'],
    },

    // Personal Details
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    parentsName: {
      type: String,
      required: [true, "Parent's name is required"],
      trim: true,
      maxlength: [100, "Parent's name cannot exceed 100 characters"],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Invalid mobile number'],
    },
    religion: {
      type: String,
      trim: true,
      maxlength: [50, 'Religion cannot exceed 50 characters'],
      default: '',
    },
    caste: {
      type: String,
      trim: true,
      maxlength: [50, 'Caste cannot exceed 50 characters'],
      default: '',
    },
    subCaste: {
      type: String,
      trim: true,
      maxlength: [50, 'Sub Caste cannot exceed 50 characters'],
      default: '',
    },
    maritalStatus: {
      type: String,
      required: [true, 'Marital status is required'],
      enum: ['Married', 'Unmarried'],
    },

    // Working Place
    designation: {
      type: String,
      trim: true,
      maxlength: [100, 'Designation cannot exceed 100 characters'],
      default: '',
    },
    division: {
      type: String,
      trim: true,
      maxlength: [100, 'Division cannot exceed 100 characters'],
      default: '',
    },
    circle: {
      type: String,
      trim: true,
      maxlength: [100, 'Circle cannot exceed 100 characters'],
      default: '',
    },

    // Qualifications & Address
    educationQualifications: {
      type: String,
      required: [true, 'Education qualifications are required'],
      trim: true,
      maxlength: [500, 'Education qualifications cannot exceed 500 characters'],
    },
    residenceAddress: {
      type: String,
      trim: true,
      maxlength: [500, 'Residence address cannot exceed 500 characters'],
      default: '',
    },
    interests: {
      type: String,
      trim: true,
      maxlength: [300, 'Interests cannot exceed 300 characters'],
      default: '',
    },

    // Passport Photo
    passportPhoto: {
      type: String,
      default: null,
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
