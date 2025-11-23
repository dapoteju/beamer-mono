-- Migration: Add booking-flights junction table and default_booking_id to flights
-- This enables accurate booking-level metrics even with overlapping bookings

-- Add default_booking_id column to flights table (nullable for backward compatibility)
ALTER TABLE flights ADD COLUMN default_booking_id UUID REFERENCES bookings(id);

-- Create booking_flights junction table
CREATE TABLE booking_flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_flights_unique UNIQUE (booking_id, flight_id)
);

-- Create indexes for performance
CREATE INDEX idx_booking_flights_booking_id ON booking_flights(booking_id);
CREATE INDEX idx_booking_flights_flight_id ON booking_flights(flight_id);
CREATE INDEX idx_flights_default_booking_id ON flights(default_booking_id) WHERE default_booking_id IS NOT NULL;

-- Migration notes:
-- 1. This migration adds the schema changes needed for accurate booking metrics
-- 2. After running this migration, you should backfill existing flights:
--    - For single-booking campaigns: set default_booking_id or create booking_flights row
--    - For multi-booking campaigns: create booking_flights rows based on flight dates
-- 3. Update flight creation/update logic to populate booking_flights or default_booking_id
-- 4. See REPORTING_LIMITATIONS.md for detailed migration strategy
