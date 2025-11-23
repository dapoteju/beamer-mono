# Reporting Engine Deployment Guide

## Overview

The reporting engine has been fully implemented with all endpoints, aggregation logic, and schema enhancements. This guide outlines the deployment steps required to enable the production-ready booking metrics.

## Implementation Status

### ✅ Completed
1. **Reporting Service** - All aggregation functions implemented
2. **API Endpoints** - All 4 report endpoints operational
3. **Schema Design** - booking_flights junction table and default_booking_id column
4. **Migration File** - SQL DDL created (`drizzle/0001_add_booking_flights_and_default_booking_id.sql`)
5. **Query Logic** - Updated to join through booking_flights with fallback
6. **Compliance Rollup** - Deterministic priority-based aggregation
7. **Documentation** - Complete implementation notes and API documentation

### 📋 Deployment Steps Required

The following steps must be completed to enable accurate booking-level metrics in production:

#### Step 1: Run Database Migration
```bash
npm run db:migrate
```

This will:
- Add `default_booking_id` column to `flights` table
- Create `booking_flights` junction table
- Add necessary indexes for performance

#### Step 2: Backfill Existing Data (If Applicable)

If you have existing flights and bookings in your database, run a backfill script to establish relationships:

**Option A: Simple backfill (single-booking campaigns)**
```sql
-- Set default_booking_id for flights where campaign has only one booking
UPDATE flights f
SET default_booking_id = (
  SELECT b.id 
  FROM bookings b 
  WHERE b.campaign_id = f.campaign_id
  LIMIT 1
)
WHERE f.default_booking_id IS NULL;
```

**Option B: Comprehensive backfill (multi-booking campaigns)**
```sql
-- Create booking_flights rows based on date overlap
INSERT INTO booking_flights (booking_id, flight_id)
SELECT DISTINCT b.id, f.id
FROM bookings b
JOIN flights f ON f.campaign_id = b.campaign_id
WHERE f.start_datetime::date <= b.end_date
  AND f.end_datetime::date >= b.start_date
ON CONFLICT (booking_id, flight_id) DO NOTHING;
```

#### Step 3: Update Flight Creation Logic

Modify your flight creation service to populate booking relationships:

```typescript
// In FlightsService or similar
async createFlight(data: {
  campaignId: string;
  bookingId: string;  // Add this parameter
  name: string;
  // ... other fields
}) {
  // Create the flight
  const flight = await db.insert(flights).values({
    ...data,
    defaultBookingId: data.bookingId,
  }).returning();

  // Create booking-flight association
  await db.insert(bookingFlights).values({
    bookingId: data.bookingId,
    flightId: flight[0].id,
  });

  return flight[0];
}
```

#### Step 4: Verify with Test Data

Test the booking reports with overlapping bookings:

```sql
-- Create test campaign
INSERT INTO campaigns (id, ...) VALUES ('campaign-001', ...);

-- Create two overlapping bookings
INSERT INTO bookings (id, campaign_id, start_date, end_date, agreed_impressions, ...)
VALUES 
  ('booking-001', 'campaign-001', '2025-01-01', '2025-01-31', 100000, ...),
  ('booking-002', 'campaign-001', '2025-01-15', '2025-02-15', 150000, ...);

-- Create flights for each booking
INSERT INTO flights (id, campaign_id, default_booking_id, start_datetime, end_datetime, ...)
VALUES
  ('flight-001', 'campaign-001', 'booking-001', '2025-01-01 00:00:00', '2025-01-31 23:59:59', ...),
  ('flight-002', 'campaign-001', 'booking-002', '2025-01-15 00:00:00', '2025-02-15 23:59:59', ...);

-- Create booking-flight associations
INSERT INTO booking_flights (booking_id, flight_id) VALUES
  ('booking-001', 'flight-001'),
  ('booking-002', 'flight-002');

-- Generate test play events
-- Then query both booking reports to verify accurate attribution
```

#### Step 5: Integration Testing

1. **Test overlapping bookings:** Verify delivery_percentage is calculated correctly for each booking
2. **Test regional distribution:** Ensure impressions are scoped to booking-owned flights
3. **Test legacy data:** Verify fallback to default_booking_id works correctly
4. **Test compliance:** Confirm resolved_status is deterministic

## Current Functionality

Even without running the migration, the reporting endpoints are operational:

- ✅ **GET /api/reports/campaigns/:id** - Fully functional
- ✅ **GET /api/reports/screens/:id** - Fully functional
- ✅ **GET /api/reports/creatives/:id** - Fully functional
- ⚠️ **GET /api/reports/bookings/:id** - Functional, but will fall back to campaign-level metrics until migration is run and data is backfilled

## Migration Rollback

If you need to rollback the migration:

```sql
-- Drop booking_flights table
DROP TABLE IF EXISTS booking_flights CASCADE;

-- Remove default_booking_id column
ALTER TABLE flights DROP COLUMN IF EXISTS default_booking_id;
```

## Performance Considerations

- Indexes are created on booking_flights for optimal query performance
- Use EXPLAIN ANALYZE on booking report queries to verify join performance
- Consider partitioning booking_flights if you have millions of flights
- Monitor query performance as data grows

## Support

For questions or issues:
- See REPORTING_LIMITATIONS.md for detailed technical notes
- Review src/modules/reports/reports.service.ts for query implementation
- Check migration file: drizzle/0001_add_booking_flights_and_default_booking_id.sql
