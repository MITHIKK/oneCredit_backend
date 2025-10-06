const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Payment = require('../models/Payment');
const Trip = require('../models/Trip');
const { authenticate, requireResourceOwnership, logActivity } = require('../middleware/auth');
const router = express.Router();

router.get('/', [
  authenticate,
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'])
    .withMessage('Invalid status filter'),
  query('category')
    .optional()
    .isIn(['accommodation', 'transportation', 'food', 'activities', 'shopping', 'insurance', 'visa', 'miscellaneous'])
    .withMessage('Invalid category filter'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      status,
      category,
      tripId,
      startDate,
      endDate,
      limit = 10,
      page = 1,
      sortBy = 'paymentDate',
      sortOrder = 'desc'
    } = req.query;

    const filter = { user: req.userId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (tripId) filter.trip = tripId;
    
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const payments = await Payment.find(filter)
      .populate('trip', 'title destination startDate endDate')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v');

    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPayments: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching payments'
    });
  }
});

router.get('/:id', [
  authenticate,
  requireResourceOwnership(Payment)
], async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('trip', 'title destination startDate endDate');

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching payment'
    });
  }
});

router.post('/', [
  authenticate,
  body('trip')
    .isMongoId()
    .withMessage('Valid trip ID is required'),
  body('description')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Description must be between 3 and 200 characters'),
  body('category')
    .isIn(['accommodation', 'transportation', 'food', 'activities', 'shopping', 'insurance', 'visa', 'miscellaneous'])
    .withMessage('Please select a valid category'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .isIn(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'KRW'])
    .withMessage('Please select a valid currency'),
  body('paymentMethod.type')
    .isIn(['credit_card', 'debit_card', 'bank_transfer', 'paypal', 'cash', 'crypto', 'check', 'other'])
    .withMessage('Please select a valid payment method'),
  body('vendor.name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Vendor name is required'),
  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid payment date')
], logActivity('payment_create'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const trip = await Trip.findOne({
      _id: req.body.trip,
      user: req.userId
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or access denied'
      });
    }

    const paymentData = {
      ...req.body,
      user: req.userId,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date()
    };

    const payment = new Payment(paymentData);
    await payment.save();

    await payment.populate('trip', 'title destination startDate endDate');

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      payment
    });

  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating payment'
    });
  }
});

router.put('/:id', [
  authenticate,
  requireResourceOwnership(Payment),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Description must be between 3 and 200 characters'),
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'])
    .withMessage('Please select a valid status'),
  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid payment date')
], logActivity('payment_update'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    if (req.resource.status === 'completed' && req.body.amount) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify amount of completed payment'
      });
    }

    const updates = req.body;
    if (updates.paymentDate) {
      updates.paymentDate = new Date(updates.paymentDate);
    }

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('trip', 'title destination startDate endDate');

    res.json({
      success: true,
      message: 'Payment updated successfully',
      payment
    });

  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating payment'
    });
  }
});

router.delete('/:id', [
  authenticate,
  requireResourceOwnership(Payment)
], logActivity('payment_delete'), async (req, res) => {
  try {
    
    if (!['pending', 'failed', 'cancelled'].includes(req.resource.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete processed payments'
      });
    }

    await Payment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });

  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting payment'
    });
  }
});

router.post('/:id/refund', [
  authenticate,
  requireResourceOwnership(Payment),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Refund amount must be a positive number'),
  body('reason')
    .isIn(['cancellation', 'no_show', 'service_issue', 'duplicate_charge', 'fraud', 'other'])
    .withMessage('Please select a valid refund reason'),
  body('refundMethod')
    .isIn(['original_payment_method', 'bank_transfer', 'check', 'store_credit', 'other'])
    .withMessage('Please select a valid refund method'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
], logActivity('payment_refund'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const payment = req.resource;
    const { amount, reason, refundMethod, notes } = req.body;

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot refund non-completed payment'
      });
    }

    const totalRefunded = payment.totalRefunded || 0;
    const maxRefundable = payment.totalAmount - totalRefunded;

    if (amount > maxRefundable) {
      return res.status(400).json({
        success: false,
        message: `Refund amount cannot exceed ${maxRefundable} ${payment.currency}`
      });
    }

    const refund = {
      amount,
      reason,
      refundDate: new Date(),
      refundMethod,
      notes,
      processedBy: req.user.email
    };

    payment.refunds.push(refund);

    const newTotalRefunded = totalRefunded + amount;
    if (newTotalRefunded >= payment.totalAmount) {
      payment.status = 'refunded';
    } else {
      payment.status = 'partially_refunded';
    }

    await payment.save();

    res.json({
      success: true,
      message: 'Refund processed successfully',
      payment
    });

  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing refund'
    });
  }
});

router.get('/stats/overview', [
  authenticate,
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { startDate, endDate } = req.query;
    
    const [paymentStats, spendingTrends] = await Promise.all([
      Payment.getPaymentStats(req.userId, startDate, endDate),
      Payment.getSpendingTrends(req.userId, 6)
    ]);

    const filter = { user: req.userId, status: 'completed' };
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const overallStats = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
          avgPayment: { $avg: '$amount' },
          totalRefunded: { $sum: { $sum: '$refunds.amount' } }
        }
      }
    ]);

    const paymentMethods = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$paymentMethod.type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json({
      success: true,
      overview: overallStats[0] || {
        totalAmount: 0,
        totalPayments: 0,
        avgPayment: 0,
        totalRefunded: 0
      },
      paymentsByCategory: paymentStats,
      spendingTrends,
      paymentMethods
    });

  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching payment statistics'
    });
  }
});

router.get('/trip/:tripId', [
  authenticate
], async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      user: req.userId
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or access denied'
      });
    }

    const payments = await Payment.find({
      trip: tripId,
      user: req.userId
    }).sort({ paymentDate: -1 });

    const summary = await Payment.aggregate([
      {
        $match: {
          trip: mongoose.Types.ObjectId(tripId),
          user: mongoose.Types.ObjectId(req.userId)
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalSpent = payments.reduce((sum, payment) => {
      if (payment.status === 'completed') {
        return sum + (payment.amount - (payment.totalRefunded || 0));
      }
      return sum;
    }, 0);

    res.json({
      success: true,
      payments,
      summary,
      totalSpent,
      trip: {
        title: trip.title,
        budget: trip.budget.totalBudget,
        remaining: trip.budget.totalBudget - totalSpent
      }
    });

  } catch (error) {
    console.error('Get trip payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trip payments'
    });
  }
});

router.post('/bulk', [
  authenticate,
  body('payments')
    .isArray({ min: 1, max: 10 })
    .withMessage('Must provide 1-10 payments'),
  body('payments.*.trip')
    .isMongoId()
    .withMessage('Valid trip ID is required'),
  body('payments.*.description')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Description must be between 3 and 200 characters'),
  body('payments.*.category')
    .isIn(['accommodation', 'transportation', 'food', 'activities', 'shopping', 'insurance', 'visa', 'miscellaneous'])
    .withMessage('Please select a valid category'),
  body('payments.*.amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number')
], logActivity('payment_bulk_create'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { payments: paymentData } = req.body;
    const createdPayments = [];
    const errors_occurred = [];

    for (let i = 0; i < paymentData.length; i++) {
      try {
        
        const trip = await Trip.findOne({
          _id: paymentData[i].trip,
          user: req.userId
        });

        if (!trip) {
          errors_occurred.push({
            index: i,
            error: 'Trip not found or access denied'
          });
          continue;
        }

        const payment = new Payment({
          ...paymentData[i],
          user: req.userId
        });

        await payment.save();
        await payment.populate('trip', 'title destination startDate endDate');
        createdPayments.push(payment);

      } catch (error) {
        errors_occurred.push({
          index: i,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdPayments.length} payments created successfully`,
      payments: createdPayments,
      errors: errors_occurred
    });

  } catch (error) {
    console.error('Bulk create payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating payments'
    });
  }
});

module.exports = router;
