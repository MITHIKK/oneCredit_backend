const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Trip = require('../models/Trip');
const User = require('../models/User');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb:
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const getAllTripData = async () => {
  try {
    console.log('\n=================================================');
    console.log('FETCHING ALL TRIP DATA FROM DATABASE');
    console.log('=================================================\n');

    console.log('1. CUSTOMER DATA:');
    console.log('-----------------');
    const users = await User.find({}).select('+password');
    console.log(`Total Customers: ${users.length}`);
    
    if (users.length > 0) {
      users.forEach((user, index) => {
        console.log(`\nCustomer ${index + 1}:`);
        console.log('  ID:', user._id);
        console.log('  Name:', user.fullName || `${user.firstName} ${user.lastName}`);
        console.log('  Email:', user.email);
        console.log('  Phone:', user.phone);
        console.log('  Nationality:', user.nationality);
        console.log('  Age:', user.age);
        console.log('  Email Verified:', user.isEmailVerified);
        console.log('  Account Active:', user.isActive);
        console.log('  Created At:', user.createdAt);
        console.log('  Last Login:', user.lastLogin || 'Never');
        
        if (user.address) {
          console.log('  Address:', `${user.address.street || ''}, ${user.address.city}, ${user.address.state}, ${user.address.country} ${user.address.zipCode}`);
        }
        
        if (user.emergencyContact) {
          console.log('  Emergency Contact:', `${user.emergencyContact.name} (${user.emergencyContact.relationship}) - ${user.emergencyContact.phone}`);
        }
      });
    } else {
      console.log('No customers found in the database.');
    }

    console.log('\n\n2. TRIP DATA:');
    console.log('-------------');
    const trips = await Trip.find({}).populate('user', 'firstName lastName email phone');
    console.log(`Total Trips: ${trips.length}`);

    if (trips.length > 0) {
      
      const approvedTrips = trips.filter(trip => 
        trip.status === 'booked' || trip.status === 'confirmed' || trip.status === 'completed'
      );
      const pendingTrips = trips.filter(trip => 
        trip.status === 'draft' || trip.status === 'planned'
      );
      const cancelledTrips = trips.filter(trip => trip.status === 'cancelled');
      const inProgressTrips = trips.filter(trip => trip.status === 'in_progress');

      console.log(`\nTrips by Status:`);
      console.log(`  - Approved/Booked/Completed: ${approvedTrips.length}`);
      console.log(`  - Pending (Draft/Planned): ${pendingTrips.length}`);
      console.log(`  - In Progress: ${inProgressTrips.length}`);
      console.log(`  - Cancelled: ${cancelledTrips.length}`);

      if (approvedTrips.length > 0) {
        console.log('\n\n3. APPROVED/BOOKED TRIPS:');
        console.log('-------------------------');
        approvedTrips.forEach((trip, index) => {
          console.log(`\nApproved Trip ${index + 1}:`);
          displayTripDetails(trip);
        });
      }

      console.log('\n\n4. ALL TRIPS - COMPLETE DETAILS:');
      console.log('--------------------------------');
      trips.forEach((trip, index) => {
        console.log(`\n${'-'.repeat(80)}`);
        console.log(`TRIP ${index + 1} - FULL DETAILS`);
        console.log(`${'-'.repeat(80)}`);
        displayFullTripDetails(trip);
      });
    } else {
      console.log('No trips found in the database.');
    }

    console.log('\n\n5. DATABASE STATISTICS:');
    console.log('----------------------');
    console.log(`Total Collections Used: 2 (users, trips)`);
    console.log(`Total Documents:`);
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Trips: ${trips.length}`);
    
    if (trips.length > 0) {
      const totalBudget = trips.reduce((sum, trip) => 
        sum + (trip.budget?.totalBudget || 0), 0
      );
      const totalSpent = trips.reduce((sum, trip) => 
        sum + (trip.totalSpent || 0), 0
      );
      
      console.log(`\nFinancial Summary:`);
      console.log(`  - Total Budget Allocated: $${totalBudget.toFixed(2)}`);
      console.log(`  - Total Amount Spent: $${totalSpent.toFixed(2)}`);
      console.log(`  - Total Remaining: $${(totalBudget - totalSpent).toFixed(2)}`);
    }

  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

const displayTripDetails = (trip) => {
  console.log('  Trip ID:', trip._id);
  console.log('  Title:', trip.title);
  console.log('  Status:', trip.status);
  console.log('  Customer:', trip.user ? `${trip.user.firstName} ${trip.user.lastName} (${trip.user.email})` : 'Not assigned');
  console.log('  Destination:', `${trip.destination.city}, ${trip.destination.country}`);
  console.log('  Dates:', `${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`);
  console.log('  Duration:', `${trip.duration} days`);
  console.log('  Trip Type:', trip.tripType);
  console.log('  Total Travelers:', trip.totalTravelers);
  console.log('  Budget:', `$${trip.budget.totalBudget} (Spent: $${trip.totalSpent || 0})`);
};

const displayFullTripDetails = (trip) => {
  
  console.log('\nBASIC INFORMATION:');
  console.log('  Trip ID:', trip._id);
  console.log('  Title:', trip.title);
  console.log('  Description:', trip.description || 'No description');
  console.log('  Status:', trip.status);
  console.log('  Trip Type:', trip.tripType);
  console.log('  Created:', new Date(trip.createdAt).toLocaleString());
  console.log('  Last Updated:', new Date(trip.updatedAt).toLocaleString());

  console.log('\nCUSTOMER:');
  if (trip.user) {
    console.log('  Name:', `${trip.user.firstName} ${trip.user.lastName}`);
    console.log('  Email:', trip.user.email);
    console.log('  Phone:', trip.user.phone);
    console.log('  User ID:', trip.user._id);
  } else {
    console.log('  No customer assigned');
  }

  console.log('\nDESTINATION:');
  console.log('  Country:', trip.destination.country);
  console.log('  City:', trip.destination.city);
  console.log('  Region:', trip.destination.region || 'Not specified');
  if (trip.destination.coordinates?.latitude) {
    console.log('  Coordinates:', `${trip.destination.coordinates.latitude}, ${trip.destination.coordinates.longitude}`);
  }

  console.log('\nDATES:');
  console.log('  Start Date:', new Date(trip.startDate).toLocaleString());
  console.log('  End Date:', new Date(trip.endDate).toLocaleString());
  console.log('  Duration:', `${trip.duration} days`);

  console.log('\nTRAVELERS:', `(${trip.travelers.length} total)`);
  trip.travelers.forEach((traveler, idx) => {
    console.log(`  Traveler ${idx + 1}:`);
    console.log(`    - Name: ${traveler.firstName} ${traveler.lastName}`);
    console.log(`    - Gender: ${traveler.gender}`);
    console.log(`    - DOB: ${new Date(traveler.dateOfBirth).toLocaleDateString()}`);
    console.log(`    - Nationality: ${traveler.nationality}`);
    console.log(`    - Relationship: ${traveler.relationship}`);
    if (traveler.passport?.number) {
      console.log(`    - Passport: ${traveler.passport.number} (Expires: ${new Date(traveler.passport.expiryDate).toLocaleDateString()})`);
    }
  });

  console.log('\nBUDGET:');
  console.log('  Total Budget:', `$${trip.budget.totalBudget}`);
  console.log('  Currency:', trip.budget.currency);
  console.log('  Budget Allocation:');
  Object.entries(trip.budget.categories).forEach(([category, amount]) => {
    if (amount > 0) {
      console.log(`    - ${category}: $${amount}`);
    }
  });
  console.log('  Actual Spending:');
  Object.entries(trip.budget.actualSpent).forEach(([category, amount]) => {
    if (amount > 0) {
      console.log(`    - ${category}: $${amount}`);
    }
  });
  console.log('  Total Spent:', `$${trip.totalSpent || 0}`);
  console.log('  Remaining:', `$${trip.budgetRemaining || trip.budget.totalBudget}`);

  if (trip.accommodations && trip.accommodations.length > 0) {
    console.log('\nACCOMMODATIONS:');
    trip.accommodations.forEach((acc, idx) => {
      console.log(`  Accommodation ${idx + 1}:`);
      console.log(`    - Name: ${acc.name}`);
      console.log(`    - Type: ${acc.type}`);
      console.log(`    - Check-in: ${new Date(acc.checkIn).toLocaleDateString()}`);
      console.log(`    - Check-out: ${new Date(acc.checkOut).toLocaleDateString()}`);
      console.log(`    - Status: ${acc.bookingStatus}`);
      console.log(`    - Cost: $${acc.cost.totalAmount}`);
      if (acc.confirmationNumber) {
        console.log(`    - Confirmation: ${acc.confirmationNumber}`);
      }
    });
  }

  if (trip.transportation && trip.transportation.length > 0) {
    console.log('\nTRANSPORTATION:');
    trip.transportation.forEach((trans, idx) => {
      console.log(`  Transport ${idx + 1}:`);
      console.log(`    - Type: ${trans.type}`);
      console.log(`    - From: ${trans.departureLocation.name}`);
      console.log(`    - To: ${trans.arrivalLocation.name}`);
      console.log(`    - Departure: ${new Date(trans.departureDateTime).toLocaleString()}`);
      console.log(`    - Status: ${trans.bookingStatus}`);
      console.log(`    - Cost: $${trans.cost.amount}`);
      if (trans.confirmationNumber) {
        console.log(`    - Confirmation: ${trans.confirmationNumber}`);
      }
    });
  }

  if (trip.itinerary && trip.itinerary.length > 0) {
    console.log(`\nITINERARY: (${trip.itinerary.length} days planned)`);
    console.log(`  Total Activities: ${trip.itinerary.reduce((sum, day) => sum + day.activities.length, 0)}`);
  }

  if (trip.tags && trip.tags.length > 0) {
    console.log('\nTAGS:', trip.tags.join(', '));
  }
  if (trip.rating) {
    console.log('RATING:', `${trip.rating}/5`);
  }
  if (trip.review) {
    console.log('REVIEW:', trip.review);
  }
};

const main = async () => {
  try {
    await connectDB();
    await getAllTripData();
    
    console.log('\n\n=================================================');
    console.log('DATA RETRIEVAL COMPLETED SUCCESSFULLY');
    console.log('=================================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to execute script:', error);
    process.exit(1);
  }
};

main();
