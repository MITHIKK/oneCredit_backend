const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: [true, 'Trip reference is required']
  },
  
  description: {
    type: String,
    required: [true, 'Payment description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  category: {
    type: String,
    enum: ['accommodation', 'transportation', 'food', 'activities', 'shopping', 'insurance', 'visa', 'miscellaneous'],
    required: [true, 'Payment category is required']
  },
  
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'KRW'],
    default: 'USD'
  },
  
  exchangeRate: {
    rate: { type: Number, min: 0 },
    fromCurrency: { type: String },
    toCurrency: { type: String },
    rateDate: { type: Date }
  },
  
  paymentMethod: {
    type: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'paypal', 'cash', 'crypto', 'check', 'other'],
      required: true
    },
    
    cardDetails: {
      lastFourDigits: { 
        type: String, 
        match: /^\d{4}$/,
        select: false 
      },
      cardType: { 
        type: String, 
        enum: ['visa', 'mastercard', 'amex', 'discover', 'other'] 
      },
      expiryMonth: { 
        type: Number, 
        min: 1, 
        max: 12,
        select: false
      },
      expiryYear: { 
        type: Number,
        select: false
      },
      cardholderName: { 
        type: String, 
        trim: true,
        select: false
      }
    },
    
    bankDetails: {
      bankName: { type: String, trim: true },
      accountNumber: { 
        type: String, 
        trim: true,
        select: false
      },
      routingNumber: { 
        type: String, 
        trim: true,
        select: false
      },
      swiftCode: { type: String, trim: true }
    },
    
    digitalWallet: {
      provider: { 
        type: String, 
        enum: ['paypal', 'apple_pay', 'google_pay', 'samsung_pay', 'venmo', 'zelle'] 
      },
      accountId: { 
        type: String, 
        trim: true,
        select: false
      }
    }
  },
  
  transactionId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true 
  },
  paymentGateway: {
    type: String,
    enum: ['stripe', 'paypal', 'square', 'razorpay', 'manual', 'other'],
    default: 'manual'
  },
  gatewayTransactionId: { type: String, trim: true },
  
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  
  paymentDate: {
    type: Date,
    required: [true, 'Payment date is required'],
    default: Date.now
  },
  dueDate: { type: Date },
  processedDate: { type: Date },
  
  vendor: {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      zipCode: { type: String, trim: true }
    },
    vendorType: {
      type: String,
      enum: ['hotel', 'airline', 'restaurant', 'tour_operator', 'transport', 'retail', 'service', 'other']
    }
  },
  
  confirmationNumber: { type: String, trim: true },
  bookingReference: { type: String, trim: true },
  invoiceNumber: { type: String, trim: true },
  
  taxes: [{
    type: { 
      type: String, 
      enum: ['vat', 'sales_tax', 'service_tax', 'city_tax', 'airport_tax', 'other'],
      required: true 
    },
    amount: { type: Number, required: true, min: 0 },
    rate: { type: Number, min: 0, max: 100 }, 
    description: { type: String, trim: true }
  }],
  fees: [{
    type: { 
      type: String, 
      enum: ['processing_fee', 'service_fee', 'booking_fee', 'cancellation_fee', 'convenience_fee', 'other'],
      required: true 
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true }
  }],
  
  refunds: [{
    amount: { type: Number, required: true, min: 0 },
    reason: { 
      type: String, 
      enum: ['cancellation', 'no_show', 'service_issue', 'duplicate_charge', 'fraud', 'other'],
      required: true 
    },
    refundDate: { type: Date, required: true },
    refundMethod: { 
      type: String, 
      enum: ['original_payment_method', 'bank_transfer', 'check', 'store_credit', 'other'],
      required: true 
    },
    refundTransactionId: { type: String, trim: true },
    processedBy: { type: String, trim: true },
    notes: { type: String, trim: true }
  }],
  
  installments: [{
    installmentNumber: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },
    status: { 
      type: String, 
      enum: ['pending', 'paid', 'overdue', 'cancelled'],
      default: 'pending' 
    },
    transactionId: { type: String, trim: true }
  }],
  
  receipt: {
    receiptNumber: { type: String, trim: true },
    filePath: { type: String, trim: true }, 
    fileUrl: { type: String, trim: true }, 
    ocrText: { type: String }, 
    verified: { type: Boolean, default: false }
  },
  
  notes: { type: String, trim: true },
  tags: [String],
  
  activityReference: {
    itineraryDay: { type: Number },
    activityIndex: { type: Number }
  },
  
  isRecurring: { type: Boolean, default: false },
  recurringDetails: {
    frequency: { 
      type: String, 
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
      required: function() { return this.parent().isRecurring; }
    },
    nextPaymentDate: { type: Date },
    endDate: { type: Date },
    totalInstallments: { type: Number, min: 1 },
    completedInstallments: { type: Number, default: 0 }
  },
  
  riskScore: { type: Number, min: 0, max: 100 },
  fraudFlags: [String],
  
  accountingCategory: { type: String, trim: true },
  costCenter: { type: String, trim: true },
  budgetCode: { type: String, trim: true },
  
  approvalStatus: {
    type: String,
    enum: ['not_required', 'pending_approval', 'approved', 'rejected'],
    default: 'not_required'
  },
  approvedBy: {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date },
    comments: { type: String, trim: true }
  },
  
  ipAddress: { type: String, trim: true },
  userAgent: { type: String, trim: true },
  deviceInfo: { type: String, trim: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

paymentSchema.virtual('totalAmount').get(function() {
  let total = this.amount;
  
  if (this.taxes) {
    total += this.taxes.reduce((sum, tax) => sum + tax.amount, 0);
  }
  
  if (this.fees) {
    total += this.fees.reduce((sum, fee) => sum + fee.amount, 0);
  }
  
  return total;
});

paymentSchema.virtual('totalRefunded').get(function() {
  if (!this.refunds || this.refunds.length === 0) return 0;
  return this.refunds.reduce((sum, refund) => sum + refund.amount, 0);
});

paymentSchema.virtual('netAmount').get(function() {
  return this.totalAmount - this.totalRefunded;
});

paymentSchema.virtual('installmentProgress').get(function() {
  if (!this.installments || this.installments.length === 0) return null;
  
  const paid = this.installments.filter(inst => inst.status === 'paid').length;
  const total = this.installments.length;
  
  return {
    paid,
    total,
    percentage: Math.round((paid / total) * 100)
  };
});

paymentSchema.index({ user: 1, paymentDate: -1 });
paymentSchema.index({ trip: 1, category: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentDate: 1 });
paymentSchema.index({ vendor: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ confirmationNumber: 1 });

paymentSchema.index({
  description: 'text',
  'vendor.name': 'text',
  notes: 'text'
});

paymentSchema.pre('save', function(next) {
  if (!this.transactionId && this.isNew) {
    
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.transactionId = `TXN-${timestamp}-${random}`;
  }
  
  if (this.isModified('status') && this.status === 'completed' && !this.processedDate) {
    this.processedDate = new Date();
  }
  
  next();
});

paymentSchema.statics.getPaymentStats = function(userId, startDate, endDate) {
  const matchStage = {
    user: mongoose.Types.ObjectId(userId),
    status: 'completed'
  };
  
  if (startDate && endDate) {
    matchStage.paymentDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        totalPayments: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
};

paymentSchema.statics.getSpendingTrends = function(userId, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        status: 'completed',
        paymentDate: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$paymentDate' },
          month: { $month: '$paymentDate' }
        },
        totalSpent: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
};

module.exports = mongoose.model('Payment', paymentSchema);
