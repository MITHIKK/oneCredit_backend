const mongoose = require('mongoose');
const fs = require('fs');
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

const exportAllData = async () => {
  try {
    console.log('\n=================================================');
    console.log('EXPORTING ALL DATA FROM DATABASE');
    console.log('=================================================\n');

    const exportDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    console.log('Exporting customer data...');
    const users = await User.find({}).lean();
    const usersFile = path.join(exportDir, `customers_${timestamp}.json`);
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    console.log(`✓ Customers exported to: ${usersFile}`);
    console.log(`  Total customers: ${users.length}`);

    console.log('\nExporting trip data...');
    const trips = await Trip.find({}).populate('user').lean();
    const tripsFile = path.join(exportDir, `trips_${timestamp}.json`);
    fs.writeFileSync(tripsFile, JSON.stringify(trips, null, 2));
    console.log(`✓ Trips exported to: ${tripsFile}`);
    console.log(`  Total trips: ${trips.length}`);

    console.log('\nCreating combined export...');
    const combinedData = {
      exportDate: new Date().toISOString(),
      database: process.env.MONGODB_URI || 'mongodb:
      statistics: {
        totalCustomers: users.length,
        totalTrips: trips.length,
        tripsByStatus: {},
        tripsByType: {},
        totalBudget: 0,
        totalSpent: 0
      },
      customers: users,
      trips: trips
    };

    trips.forEach(trip => {
      
      combinedData.statistics.tripsByStatus[trip.status] = 
        (combinedData.statistics.tripsByStatus[trip.status] || 0) + 1;
      
      combinedData.statistics.tripsByType[trip.tripType] = 
        (combinedData.statistics.tripsByType[trip.tripType] || 0) + 1;
      
      if (trip.budget) {
        combinedData.statistics.totalBudget += trip.budget.totalBudget || 0;
        
        if (trip.budget.actualSpent) {
          const spent = Object.values(trip.budget.actualSpent).reduce((sum, amount) => sum + amount, 0);
          combinedData.statistics.totalSpent += spent;
        }
      }
    });

    const combinedFile = path.join(exportDir, `complete_export_${timestamp}.json`);
    fs.writeFileSync(combinedFile, JSON.stringify(combinedData, null, 2));
    console.log(`✓ Combined export created: ${combinedFile}`);

    console.log('\nCreating CSV export for trips...');
    if (trips.length > 0) {
      const csvHeaders = [
        'Trip ID',
        'Title',
        'Customer Name',
        'Customer Email',
        'Destination',
        'Start Date',
        'End Date',
        'Status',
        'Type',
        'Budget',
        'Spent',
        'Travelers Count'
      ];

      const csvRows = trips.map(trip => {
        const customerName = trip.user ? `${trip.user.firstName} ${trip.user.lastName}` : 'N/A';
        const customerEmail = trip.user ? trip.user.email : 'N/A';
        const destination = `${trip.destination?.city || ''}, ${trip.destination?.country || ''}`;
        const spent = trip.budget?.actualSpent ? 
          Object.values(trip.budget.actualSpent).reduce((sum, amount) => sum + amount, 0) : 0;
        
        return [
          trip._id,
          trip.title,
          customerName,
          customerEmail,
          destination,
          new Date(trip.startDate).toLocaleDateString(),
          new Date(trip.endDate).toLocaleDateString(),
          trip.status,
          trip.tripType,
          trip.budget?.totalBudget || 0,
          spent,
          trip.travelers?.length || 0
        ];
      });

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const csvFile = path.join(exportDir, `trips_${timestamp}.csv`);
      fs.writeFileSync(csvFile, csvContent);
      console.log(`✓ CSV export created: ${csvFile}`);
    } else {
      console.log('  No trips to export to CSV');
    }

    console.log('\n=================================================');
    console.log('EXPORT SUMMARY');
    console.log('=================================================');
    console.log(`Export directory: ${exportDir}`);
    console.log(`Total files created: ${trips.length > 0 ? 4 : 3}`);
    console.log(`Total customers exported: ${users.length}`);
    console.log(`Total trips exported: ${trips.length}`);
    
    if (trips.length > 0) {
      console.log('\nTrip Statistics:');
      console.log('  By Status:');
      Object.entries(combinedData.statistics.tripsByStatus).forEach(([status, count]) => {
        console.log(`    - ${status}: ${count}`);
      });
      console.log('  By Type:');
      Object.entries(combinedData.statistics.tripsByType).forEach(([type, count]) => {
        console.log(`    - ${type}: ${count}`);
      });
      console.log(`\n  Total Budget: $${combinedData.statistics.totalBudget.toFixed(2)}`);
      console.log(`  Total Spent: $${combinedData.statistics.totalSpent.toFixed(2)}`);
    }

  } catch (error) {
    console.error('Error exporting data:', error);
  }
};

const main = async () => {
  try {
    await connectDB();
    await exportAllData();
    
    console.log('\n=================================================');
    console.log('DATA EXPORT COMPLETED SUCCESSFULLY');
    console.log('=================================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to execute export:', error);
    process.exit(1);
  }
};

main();
