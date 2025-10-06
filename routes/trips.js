const express = require('express');
const { body, validationResult, query, param } = require('express-validator');
const Trip = require('../models/Trip');
const { authenticate, requireResourceOwnership, authorize, logActivity } = require('../middleware/auth');
const router = express.Router();

router.get('/', [
  authenticate,
  query('status')
    .optional()
    .isIn(['draft', 'planned', 'booked', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid status filter'),
  query('tripType')
    .optional()
    .isIn(['leisure', 'business', 'adventure', 'family', 'romantic', 'solo', 'group'])
    .withMessage('Invalid trip type filter'),
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
      tripType,
      limit = 10,
      page = 1,
      sortBy = 'startDate',
      sortOrder = 'desc'
    } = req.query;

    const filter = { user: req.userId };
    if (status) filter.status = status;
    if (tripType) filter.tripType = tripType;

    const skip = (page - 1) * limit;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const trips = await Trip.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v');

    const total = await Trip.countDocuments(filter);

    res.json({
      success: true,
      trips,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalTrips: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trips'
    });
  }
});

router.get('/customer/:customerId', [
  authenticate,
  authorize(['owner']),
  param('customerId').isMongoId().withMessage('Invalid customer ID format')
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

    const customerId = req.params.customerId;

    const trips = await Trip.find({ user: customerId })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      trips
    });

  } catch (error) {
    console.error('Get customer trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer trips'
    });
  }
});

router.get('/:id', [
  authenticate,
  requireResourceOwnership(Trip)
], async (req, res) => {
  try {
    res.json({
      success: true,
      trip: req.resource
    });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trip'
    });
  }
});

router.post('/', [
  authenticate,
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('destination.country')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Destination country is required'),
  body('destination.city')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Destination city is required'),
  body('startDate')
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  body('endDate')
    .isISO8601()
    .withMessage('Please provide a valid end date'),
  body('tripType')
    .isIn(['leisure', 'business', 'adventure', 'family', 'romantic', 'solo', 'group'])
    .withMessage('Please select a valid trip type'),
  body('budget.totalBudget')
    .isFloat({ min: 0 })
    .withMessage('Total budget must be a positive number')
], logActivity('trip_create'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    if (startDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past'
      });
    }

    const tripData = {
      ...req.body,
      user: req.userId,
      startDate,
      endDate
    };

    const trip = new Trip(tripData);
    await trip.save();

    res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      trip
    });

  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating trip'
    });
  }
});

router.put('/:id', [
  authenticate,
  requireResourceOwnership(Trip),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid end date'),
  body('status')
    .optional()
    .isIn(['draft', 'planned', 'booked', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Please select a valid status'),
  body('tripType')
    .optional()
    .isIn(['leisure', 'business', 'adventure', 'family', 'romantic', 'solo', 'group'])
    .withMessage('Please select a valid trip type')
], logActivity('trip_update'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const updates = req.body;

    if (updates.startDate || updates.endDate) {
      const startDate = new Date(updates.startDate || req.resource.startDate);
      const endDate = new Date(updates.endDate || req.resource.endDate);

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Trip updated successfully',
      trip
    });

  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating trip'
    });
  }
});

router.delete('/:id', [
  authenticate,
  requireResourceOwnership(Trip)
], logActivity('trip_delete'), async (req, res) => {
  try {
    await Trip.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Trip deleted successfully'
    });

  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting trip'
    });
  }
});

router.post('/:id/travelers', [
  authenticate,
  requireResourceOwnership(Trip),
  body('travelers')
    .isArray({ min: 1 })
    .withMessage('At least one traveler is required'),
  body('travelers.*.firstName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Traveler first name is required'),
  body('travelers.*.lastName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Traveler last name is required'),
  body('travelers.*.dateOfBirth')
    .isISO8601()
    .withMessage('Valid date of birth is required'),
  body('travelers.*.gender')
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Please select a valid gender'),
  body('travelers.*.nationality')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Nationality is required')
], logActivity('trip_add_travelers'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const trip = req.resource;
    const { travelers } = req.body;

    trip.travelers.push(...travelers);
    await trip.save();

    res.json({
      success: true,
      message: 'Travelers added successfully',
      trip
    });

  } catch (error) {
    console.error('Add travelers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding travelers'
    });
  }
});

router.put('/:id/accommodations', [
  authenticate,
  requireResourceOwnership(Trip),
  body('accommodations')
    .isArray()
    .withMessage('Accommodations must be an array'),
  body('accommodations.*.name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Accommodation name is required'),
  body('accommodations.*.type')
    .isIn(['hotel', 'hostel', 'apartment', 'resort', 'bed_and_breakfast', 'vacation_rental', 'camping'])
    .withMessage('Please select a valid accommodation type'),
  body('accommodations.*.checkIn')
    .isISO8601()
    .withMessage('Valid check-in date is required'),
  body('accommodations.*.checkOut')
    .isISO8601()
    .withMessage('Valid check-out date is required')
], logActivity('trip_update_accommodations'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const trip = req.resource;
    const { accommodations } = req.body;

    for (let accommodation of accommodations) {
      const checkIn = new Date(accommodation.checkIn);
      const checkOut = new Date(accommodation.checkOut);

      if (checkOut <= checkIn) {
        return res.status(400).json({
          success: false,
          message: 'Check-out date must be after check-in date'
        });
      }

      if (checkIn < trip.startDate || checkOut > trip.endDate) {
        return res.status(400).json({
          success: false,
          message: 'Accommodation dates must be within trip dates'
        });
      }
    }

    trip.accommodations = accommodations;
    await trip.save();

    res.json({
      success: true,
      message: 'Accommodations updated successfully',
      trip
    });

  } catch (error) {
    console.error('Update accommodations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating accommodations'
    });
  }
});

router.put('/:id/itinerary', [
  authenticate,
  requireResourceOwnership(Trip),
  body('itinerary')
    .isArray()
    .withMessage('Itinerary must be an array'),
  body('itinerary.*.day')
    .isInt({ min: 1 })
    .withMessage('Day must be a positive integer'),
  body('itinerary.*.date')
    .isISO8601()
    .withMessage('Valid date is required for each itinerary day')
], logActivity('trip_update_itinerary'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const trip = req.resource;
    const { itinerary } = req.body;

    for (let day of itinerary) {
      const dayDate = new Date(day.date);
      if (dayDate < trip.startDate || dayDate > trip.endDate) {
        return res.status(400).json({
          success: false,
          message: `Itinerary day ${day.day} date must be within trip dates`
        });
      }
    }

    trip.itinerary = itinerary;
    await trip.save();

    res.json({
      success: true,
      message: 'Itinerary updated successfully',
      trip
    });

  } catch (error) {
    console.error('Update itinerary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating itinerary'
    });
  }
});

router.get('/booked-dates', async (req, res) => {
  try {

    const trips = await Trip.find({
      status: { $ne: 'cancelled' }
    }).select('date startDate');

    const bookedDates = trips.map(trip => trip.date || trip.startDate).filter(date => date);

    res.json({
      success: true,
      bookedDates
    });
  } catch (error) {
    console.error('Get booked dates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booked dates'
    });
  }
});

router.post('/book', async (req, res) => {
  try {
    const {
      userId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      from,
      to,
      date,
      travelDate,
      pickupType,
      pickupTime,
      timeSlot,
      acType,
      cost,
      travelers
    } = req.body;

    const tripData = {
      user: userId || customerId,
      title: `Trip to ${to}`,
      description: `Tour bus trip from ${from} to ${to}`,
      destination: {
        country: 'India',
        city: to,
        address: `${from} to ${to}`
      },
      startDate: new Date(date),
      endDate: new Date(date),
      date: new Date(date),
      travelDate: travelDate ? new Date(travelDate) : new Date(date),
      tripType: 'leisure',
      status: 'pending',
      budget: {
        totalBudget: cost || 0,
        currency: 'INR'
      },
      from,
      to,
      pickupType,
      pickupTime: pickupTime || timeSlot,
      timeSlot: timeSlot || pickupTime,
      acType,
      cost,
      customerName,
      customerEmail,
      customerPhone,
      travelers: travelers || [],
      paymentStatus: 'unpaid',
      createdAt: new Date(),
      requestedAt: new Date()
    };

    const trip = new Trip(tripData);
    await trip.save();

    res.status(201).json({
      success: true,
      message: 'Trip booking request created successfully',
      trip
    });
  } catch (error) {
    console.error('Book trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while booking trip'
    });
  }
});

router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const stats = await Trip.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          completedTrips: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          upcomingTrips: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['planned', 'booked']] },
                    { $gte: ['$startDate', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalBudget: { $sum: '$budget.totalBudget' },
          totalSpent: { $sum: { $add: [
            '$budget.actualSpent.accommodation',
            '$budget.actualSpent.transportation',
            '$budget.actualSpent.food',
            '$budget.actualSpent.activities',
            '$budget.actualSpent.shopping',
            '$budget.actualSpent.miscellaneous'
          ]}},
          avgTripDuration: {
            $avg: {
              $divide: [
                { $subtract: ['$endDate', '$startDate'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      }
    ]);

    const tripsByStatus = await Trip.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const tripsByType = await Trip.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$tripType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalTrips: 0,
        completedTrips: 0,
        upcomingTrips: 0,
        totalBudget: 0,
        totalSpent: 0,
        avgTripDuration: 0
      },
      tripsByStatus,
      tripsByType
    });

  } catch (error) {
    console.error('Get trip stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trip statistics'
    });
  }
});

module.exports = router;
