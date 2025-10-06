const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  
  title: {
    type: String,
    required: [true, 'Trip title is required'],
    trim: true,
    maxlength: [100, 'Trip title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  
  destination: {
    country: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    region: { type: String, trim: true },
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    }
  },
  
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    validate: {
      validator: function(value) {
        return value >= new Date();
      },
      message: 'Start date cannot be in the past'
    }
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  
  status: {
    type: String,
    enum: ['draft', 'planned', 'booked', 'in_progress', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  tripType: {
    type: String,
    enum: ['leisure', 'business', 'adventure', 'family', 'romantic', 'solo', 'group'],
    required: true
  },
  
  travelers: [{
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { 
      type: String, 
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      required: true 
    },
    nationality: { type: String, required: true, trim: true },
    passport: {
      number: { type: String, trim: true },
      expiryDate: { type: Date },
      issuingCountry: { type: String, trim: true }
    },
    dietaryRestrictions: [String],
    accessibilityNeeds: [String],
    relationship: { 
      type: String, 
      enum: ['self', 'spouse', 'child', 'parent', 'sibling', 'friend', 'colleague'],
      default: 'self'
    }
  }],
  
  itinerary: [{
    day: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true },
    activities: [{
      title: { type: String, required: true, trim: true },
      description: { type: String, trim: true },
      startTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      endTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      location: {
        name: { type: String, trim: true },
        address: { type: String, trim: true },
        coordinates: {
          latitude: { type: Number, min: -90, max: 90 },
          longitude: { type: Number, min: -180, max: 180 }
        }
      },
      cost: {
        amount: { type: Number, min: 0 },
        currency: { type: String, default: 'USD' }
      },
      category: {
        type: String,
        enum: ['accommodation', 'transport', 'food', 'sightseeing', 'entertainment', 'shopping', 'other']
      },
      bookingStatus: {
        type: String,
        enum: ['not_booked', 'pending', 'confirmed', 'cancelled'],
        default: 'not_booked'
      },
      confirmationNumber: { type: String, trim: true },
      notes: { type: String, trim: true }
    }],
    notes: { type: String, trim: true }
  }],
  
  accommodations: [{
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['hotel', 'hostel', 'apartment', 'resort', 'bed_and_breakfast', 'vacation_rental', 'camping'],
      required: true
    },
    address: { type: String, required: true, trim: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    roomType: { type: String, trim: true },
    numberOfRooms: { type: Number, min: 1, default: 1 },
    guests: { type: Number, min: 1, required: true },
    cost: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'USD' },
      totalAmount: { type: Number, required: true, min: 0 }
    },
    bookingStatus: {
      type: String,
      enum: ['not_booked', 'pending', 'confirmed', 'cancelled'],
      default: 'not_booked'
    },
    confirmationNumber: { type: String, trim: true },
    contactInfo: {
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true }
    },
    amenities: [String],
    notes: { type: String, trim: true }
  }],
  
  transportation: [{
    type: {
      type: String,
      enum: ['flight', 'train', 'bus', 'car_rental', 'taxi', 'cruise', 'ferry'],
      required: true
    },
    departureLocation: {
      name: { type: String, required: true, trim: true },
      code: { type: String, trim: true }, 
      address: { type: String, trim: true }
    },
    arrivalLocation: {
      name: { type: String, required: true, trim: true },
      code: { type: String, trim: true },
      address: { type: String, trim: true }
    },
    departureDateTime: { type: Date, required: true },
    arrivalDateTime: { type: Date, required: true },
    duration: { type: String, trim: true }, 
    carrier: { type: String, trim: true }, 
    flightNumber: { type: String, trim: true }, 
    seat: { type: String, trim: true },
    class: {
      type: String,
      enum: ['economy', 'premium_economy', 'business', 'first', 'standard'],
      default: 'economy'
    },
    cost: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'USD' }
    },
    bookingStatus: {
      type: String,
      enum: ['not_booked', 'pending', 'confirmed', 'cancelled'],
      default: 'not_booked'
    },
    confirmationNumber: { type: String, trim: true },
    baggage: {
      checkedBags: { type: Number, default: 0 },
      carryOnBags: { type: Number, default: 1 },
      weight: { type: String, trim: true }
    },
    notes: { type: String, trim: true }
  }],
  
  budget: {
    totalBudget: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    categories: {
      accommodation: { type: Number, default: 0 },
      transportation: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      activities: { type: Number, default: 0 },
      shopping: { type: Number, default: 0 },
      miscellaneous: { type: Number, default: 0 }
    },
    actualSpent: {
      accommodation: { type: Number, default: 0 },
      transportation: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      activities: { type: Number, default: 0 },
      shopping: { type: Number, default: 0 },
      miscellaneous: { type: Number, default: 0 }
    }
  },
  
  emergencyContacts: [{
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    location: { type: String, trim: true }
  }],
  
  documents: [{
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['passport', 'visa', 'id_card', 'driver_license', 'insurance', 'vaccination', 'booking_confirmation', 'other'],
      required: true
    },
    documentNumber: { type: String, trim: true },
    expiryDate: { type: Date },
    issuingAuthority: { type: String, trim: true },
    filePath: { type: String, trim: true }, 
    notes: { type: String, trim: true }
  }],
  
  notes: { type: String, trim: true },
  photos: [{ type: String }], 
  
  isPublic: { type: Boolean, default: false },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    }
  }],
  
  tags: [String],
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String, trim: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

tripSchema.virtual('duration').get(function() {
  const diffTime = Math.abs(this.endDate - this.startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

tripSchema.virtual('totalSpent').get(function() {
  if (!this.budget || !this.budget.actualSpent) return 0;
  
  const spent = this.budget.actualSpent;
  return spent.accommodation + spent.transportation + spent.food + 
         spent.activities + spent.shopping + spent.miscellaneous;
});

tripSchema.virtual('budgetRemaining').get(function() {
  return this.budget.totalBudget - this.totalSpent;
});

tripSchema.virtual('totalTravelers').get(function() {
  return this.travelers ? this.travelers.length : 0;
});

tripSchema.index({ user: 1, startDate: -1 });
tripSchema.index({ 'destination.country': 1, 'destination.city': 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ tripType: 1 });
tripSchema.index({ startDate: 1, endDate: 1 });
tripSchema.index({ tags: 1 });

tripSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  
  if (this.accommodations) {
    for (let accommodation of this.accommodations) {
      if (accommodation.checkIn < this.startDate || accommodation.checkOut > this.endDate) {
        return next(new Error('Accommodation dates must be within trip dates'));
      }
    }
  }
  
  next();
});

module.exports = mongoose.model('Trip', tripSchema);
