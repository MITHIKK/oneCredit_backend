const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://127.0.0.1:3000', 
    'http://127.0.0.1:3001', 
    'https://accounts.google.com',
    'https://onecredit-frontend.onrender.com',
    'https://onecredit-backend-8p7u.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

app.use((req, res, next) => {
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

const DB_NAME = process.env.DB_NAME || 'oneCredit';
const MONGODB_URI = process.env.MONGODB_URI || `mongodb+srv://mkmithik2005:Mithik2005@cluster1.kdkc6ne.mongodb.net/oneCredit?retryWrites=true&w=majority&appName=Cluster1`;
console.log(`🔗 Connecting to database: ${DB_NAME}`);

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('✅ Connected to MongoDB Atlas');
  console.log(`📊 Database: ${MONGODB_URI}`);
});

// Define schemas since we don't have separate model files
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  username: { type: String },
  password: { type: String },
  googleId: { type: String },
  picture: { type: String },
  role: { type: String, default: 'customer' },
  firstName: { type: String },
  lastName: { type: String },
  dateOfBirth: { type: Date },
  gender: { type: String },
  nationality: { type: String },
  address: {
    city: { type: String },
    state: { type: String },
    country: { type: String },
    zipCode: { type: String }
  },
  emergencyContact: {
    name: { type: String },
    phone: { type: String },
    relationship: { type: String }
  },
  createdAt: { type: Date, default: Date.now }
});

// Add virtual for fullName
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.name;
});

const User = mongoose.model('User', UserSchema);

const TripSchema = new mongoose.Schema({
  customerId: { type: String },
  customerName: { type: String },
  customerEmail: { type: String },
  customerPhone: { type: String },
  from: { type: String },
  to: { type: String },
  date: { type: Date },
  timeSlot: { type: String },
  acType: { type: String },
  cost: { type: Number },
  status: { type: String, enum: ['pending', 'approved', 'confirmed', 'completed', 'cancelled', 'draft', 'planned', 'booked'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' },
  paymentMethod: { type: String },
  advancePaid: { type: Number, default: 0 },
  paymentDate: { type: Date },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  confirmedAt: { type: Date },
  // Additional fields from root server
  title: { type: String },
  description: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  destination: {
    country: { type: String },
    city: { type: String },
    region: { type: String }
  },
  startDate: { type: Date },
  endDate: { type: Date },
  tripType: { type: String },
  travelers: [{ type: String }],
  budget: {
    totalBudget: { type: Number },
    currency: { type: String },
    categories: {
      transportation: { type: Number }
    }
  },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Trip = mongoose.model('Trip', TripSchema);

const PaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  description: { type: String },
  category: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paymentMethod: {
    type: { type: String }
  },
  vendor: {
    name: { type: String }
  },
  status: { type: String, default: 'completed' },
  createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', PaymentSchema);

// Add bcrypt for password hashing
const bcrypt = require('bcryptjs');

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend connected successfully!',
    database: 'MongoDB Atlas',
    timestamp: new Date().toISOString()
  });
});

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

// Additional endpoints from root server
app.post('/api/auth/google', async (req, res) => {
  try {
    const { token, userData } = req.body;
    console.log('🔐 Google login request received:', userData.email);
    
    let user = await User.findOne({ email: userData.email });
    
    if (user) {
      if (!user.googleId) {
        user.googleId = userData.googleId;
        user.picture = userData.picture;
        await user.save();
      }
      console.log('✅ Existing user logged in via Google:', user.email);
    } else {
      const username = userData.email.split('@')[0] + Math.random().toString(36).substr(2, 4);
      
      user = new User({
        name: userData.name,
        email: userData.email,
        username: username,
        googleId: userData.googleId,
        picture: userData.picture,
        phone: '',
        password: 'google-oauth-user',
        role: 'customer'
      });
      
      await user.save();
      console.log('✅ New user created via Google:', user.email);
    }
    
    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json({
      message: 'Google login successful',
      user: {
        ...userWithoutPassword,
        _id: user._id.toString(),
        id: user._id.toString(),
        role: 'customer'
      }
    });
  } catch (error) {
    console.error('❌ Google login error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); 
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trips', async (req, res) => {
  try {
    console.log('📝 Trip request received:', req.body);
    
    const newTrip = new Trip(req.body);
    const savedTrip = await newTrip.save();
    
    console.log('✅ Trip saved successfully:', savedTrip._id);
    res.status(201).json({
      message: 'Trip request created successfully',
      trip: savedTrip
    });
  } catch (error) {
    console.error('❌ Trip creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/trips', async (req, res) => {
  try {
    const trips = await Trip.find().sort({ requestedAt: -1 });
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/trips/owner/all', async (req, res) => {
  try {
    console.log('📋 Fetching all trips for owner dashboard...');
    
    const allTrips = await Trip.find().sort({ requestedAt: -1 });
    
    const pendingTrips = allTrips.filter(t => t.status === 'pending');
    const approvedTrips = allTrips.filter(t => t.status === 'approved' && t.paymentStatus !== 'paid');
    const upcomingTrips = allTrips.filter(t => 
      (t.status === 'confirmed' || t.paymentStatus === 'paid') && t.status !== 'completed'
    );
    const completedTrips = allTrips.filter(t => t.status === 'completed');
    
    console.log('✅ Trip breakdown for owner:');
    console.log(`   - Pending: ${pendingTrips.length}`);
    console.log(`   - Approved (unpaid): ${approvedTrips.length}`);
    console.log(`   - Upcoming (paid): ${upcomingTrips.length}`);
    console.log(`   - Completed: ${completedTrips.length}`);
    
    res.json({
      success: true,
      pendingTrips,
      approvedTrips,
      upcomingTrips,
      completedTrips,
      allTrips
    });
  } catch (error) {
    console.error('❌ Error fetching owner trips:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.put('/api/trips/:tripId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const tripId = req.params.tripId;
    
    const updateData = { status };
    if (status === 'approved') {
      updateData.approvedAt = new Date();
    } else if (status === 'confirmed') {
      updateData.confirmedAt = new Date();
    }
    
    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      updateData,
      { new: true }
    );
    
    if (!updatedTrip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    
    console.log(`✅ Trip ${tripId} status updated to ${status}`);
    res.json({
      message: 'Trip status updated successfully',
      trip: updatedTrip
    });
  } catch (error) {
    console.error('❌ Trip status update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trips/:tripId/payment', async (req, res) => {
  try {
    const { paymentMethod, advancePaid } = req.body;
    const tripId = req.params.tripId;
    
    console.log(`💰 Processing payment for trip ${tripId}:`, { paymentMethod, advancePaid });
    
    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      {
        paymentStatus: 'paid',
        paymentMethod,
        advancePaid,
        paymentDate: new Date(),
        status: 'confirmed',
        confirmedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedTrip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    
    console.log(`✅ Payment confirmed for trip ${tripId}`);
    res.json({
      message: 'Payment processed and trip confirmed successfully',
      trip: updatedTrip
    });
  } catch (error) {
    console.error('❌ Payment processing error:', error);
    res.status(500).json({ error: error.message });
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
