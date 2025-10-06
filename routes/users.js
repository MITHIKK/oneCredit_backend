const express = require('express');
const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

router.get('/:id', [
  authenticate,
  authorize(['owner']),
  param('id').isMongoId().withMessage('Invalid user ID format')
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

    const userId = req.params.id;

    const user = await User.findById(userId).select('-password -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile'
    });
  }
});

router.get('/', [
  authenticate,
  authorize(['owner'])
], async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.isActive = status === 'active';
    }

    const users = await User.find(query)
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: skip + users.length < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

router.put('/:id', [
  authenticate,
  authorize(['owner']),
  param('id').isMongoId().withMessage('Invalid user ID format'),
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/),
  body('isActive').optional().isBoolean()
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

    const userId = req.params.id;
    const updates = req.body;

    delete updates.password;
    delete updates._id;
    delete updates.__v;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `A user with this ${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
});

router.get('/:id/stats', [
  authenticate,
  authorize(['owner']),
  param('id').isMongoId().withMessage('Invalid user ID format')
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

    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const stats = {
      memberSince: user.createdAt,
      lastActive: user.lastLoginAt,
      profileCompletion: calculateProfileCompletion(user),
      isVerified: user.isEmailVerified,
      status: user.isActive ? 'active' : 'inactive'
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user statistics'
    });
  }
});

function calculateProfileCompletion(user) {
  const fields = [
    user.firstName,
    user.lastName,
    user.email,
    user.phone,
    user.dateOfBirth,
    user.gender,
    user.nationality,
    user.address?.city,
    user.address?.state,
    user.address?.country,
    user.address?.zipCode
  ];

  const completedFields = fields.filter(field => field && field.toString().trim()).length;
  return Math.round((completedFields / fields.length) * 100);
}

module.exports = router;
