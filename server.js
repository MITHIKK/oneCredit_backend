const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100 
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tripdb', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

connectDB();

const User = require('./models/User');
const Trip = require('./models/Trip');
const Payment = require('./models/Payment');

app.post('/api/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (role === 'owner' && username === 'srimuruganbusowner' && password === 'muruganbus') {
      return res.json({
        success: true,
        user: {
          _id: 'owner-1',
          username: 'srimuruganbusowner',
          role: 'owner',
          name: 'Bus Owner',
          email: 'owner@srimurugan.com'
        }
      });
    }
    
    if (role === 'customer') {
      
      let user = await User.findOne({ email: username }).select('+password');
      
      if (!user) {
        
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await User.create({
          firstName: username.split('@')[0],
          lastName: 'User',
          email: username,
          password: hashedPassword,
          phone: '+91 9999999999',
          dateOfBirth: new Date('1990-01-01'),
          gender: 'prefer_not_to_say',
          nationality: 'Indian',
          address: {
            city: 'Chennai',
            state: 'Tamil Nadu',
            country: 'India',
            zipCode: '600001'
          },
          emergencyContact: {
            name: 'Emergency Contact',
            phone: '+91 8888888888',
            relationship: 'Friend'
          }
        });
      } else {
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
          });
        }
      }
      
      return res.json({
        success: true,
        user: {
          _id: user._id,
          username: user.email,
          role: 'customer',
          name: user.fullName,
          email: user.email
        }
      });
    }
    
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
});

app.post('/api/signup', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    
    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ') || 'User';
    
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone: '+91 9999999999',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'prefer_not_to_say',
      nationality: 'Indian',
      address: {
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        zipCode: '600001'
      },
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '+91 8888888888',
        relationship: 'Friend'
      }
    });
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.fullName,
        username: email,
        email: user.email,
        role: 'customer'
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during signup'
    });
  }
});

app.post('/api/trips/book', async (req, res) => {
  try {
    const { userId, from, to, date, acType, travelers, cost } = req.body;
    
    const trip = await Trip.create({
      title: `Trip from ${from} to ${to}`,
      description: `Bus trip with ${acType} accommodation`,
      user: userId,
      destination: {
        country: 'India',
        city: to,
        region: to
      },
      startDate: new Date(date),
      endDate: new Date(date),
      status: 'draft', 
      tripType: 'group',
      travelers: travelers || [],
      budget: {
        totalBudget: cost,
        currency: 'INR',
        categories: {
          transportation: cost
        }
      },
      notes: `AC Type: ${acType}, From: ${from}`
    });
    
    res.json({
      success: true,
      trip
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating trip booking'
    });
  }
});

app.get('/api/trips/customer/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const trips = await Trip.find({ user: userId })
      .sort({ createdAt: -1 });
    
    const pendingTrips = trips.filter(t => t.status === 'draft' || t.status === 'planned');
    const approvedTrips = trips.filter(t => t.status === 'booked');
    const completedTrips = trips.filter(t => t.status === 'completed');
    
    res.json({
      success: true,
      pendingTrips,
      approvedTrips,
      completedTrips,
      allTrips: trips
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching trips'
    });
  }
});

app.get('/api/trips/pending', async (req, res) => {
  try {
    const trips = await Trip.find({ status: 'draft' })
      .populate('user', 'firstName lastName email phone')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      trips
    });
  } catch (error) {
    console.error('Error fetching pending trips:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching pending trips'
    });
  }
});

app.put('/api/trips/:tripId/approve', async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const trip = await Trip.findByIdAndUpdate(
      tripId,
      { status: 'planned' }, 
      { new: true }
    );
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found'
      });
    }
    
    res.json({
      success: true,
      trip
    });
  } catch (error) {
    console.error('Error approving trip:', error);
    res.status(500).json({
      success: false,
      error: 'Error approving trip'
    });
  }
});

app.post('/api/payments/create', async (req, res) => {
  try {
    const { tripId, userId, amount } = req.body;
    
    const payment = await Payment.create({
      user: userId,
      trip: tripId,
      description: 'Advance payment for trip booking',
      category: 'transportation',
      amount: amount || 5000,
      currency: 'INR',
      paymentMethod: {
        type: 'credit_card'
      },
      vendor: {
        name: 'Sri Murugan Holidays'
      },
      status: 'completed'
    });
    
    await Trip.findByIdAndUpdate(tripId, { status: 'booked' });
    
    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Error processing payment'
    });
  }
});

app.get('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const trips = await Trip.find({ user: userId });
    const completedTrips = trips.filter(t => t.status === 'completed').length;
    const pendingTrips = trips.filter(t => 
      t.status === 'draft' || t.status === 'planned' || t.status === 'booked'
    ).length;
    
    res.json({
      success: true,
      user: {
        ...user.toObject(),
        completedTrips,
        pendingTrips
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching user profile'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running successfully', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'production' ? {} : err.message 
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
