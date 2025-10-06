# Database Scripts

This directory contains scripts for managing and retrieving data from the MongoDB database.

## Available Scripts

### 1. Get Trip Data (`getTripData.js`)
Retrieves and displays all customer and trip data from the database in a formatted console output.

**Usage:**
```bash
cd backend
node scripts/getTripData.js
```

**Features:**
- Displays all customer information
- Shows trip data organized by status (approved, pending, cancelled, etc.)
- Provides complete trip details including:
  - Basic information (title, description, dates)
  - Customer details
  - Destination information
  - Travelers list
  - Budget breakdown
  - Accommodations
  - Transportation
  - Itinerary summary
- Shows database statistics and financial summaries

### 2. Export Trip Data (`exportTripData.js`)
Exports all database data to JSON and CSV formats for backup or analysis.

**Usage:**
```bash
cd backend
node scripts/exportTripData.js
```

**Output Files (in `backend/exports/` directory):**
- `customers_[timestamp].json` - All customer data
- `trips_[timestamp].json` - All trip data with populated customer info
- `complete_export_[timestamp].json` - Combined export with statistics
- `trips_[timestamp].csv` - Basic trip information in CSV format

## Database Information

- **Database Name:** `travel_app` (configured in `.env` as `MONGODB_URI`)
- **Collections:**
  - `users` - Customer/user data
  - `trips` - Trip information with all details

## Data Models

### User (Customer) Model
- Personal information (name, email, phone, DOB)
- Address details
- Emergency contact
- Travel documents (passport)
- Account status and preferences
- Security information

### Trip Model
- Basic trip information (title, description, status)
- Customer reference
- Destination details with coordinates
- Trip dates and duration
- List of travelers with their details
- Complete itinerary with daily activities
- Accommodation bookings
- Transportation arrangements
- Budget planning and tracking
- Emergency contacts
- Important documents
- Photos and memories
- Sharing settings

## Trip Status Types
- `draft` - Trip being planned
- `planned` - Trip fully planned but not booked
- `booked` - Trip booked and confirmed
- `in_progress` - Currently on trip
- `completed` - Trip completed
- `cancelled` - Trip cancelled

## Running Scripts

1. Make sure MongoDB is running locally or the connection string in `.env` is correct
2. Navigate to the backend directory: `cd backend`
3. Run the desired script: `node scripts/[scriptname].js`

## Notes

- The database is currently connected to `mongodb://localhost:27017/travel_app`
- Scripts will create necessary directories (like `exports/`) if they don't exist
- All exports include timestamps in filenames for version control
- CSV exports only include basic trip information for spreadsheet compatibility
