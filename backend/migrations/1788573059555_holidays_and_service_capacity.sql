-- Up Migration
-- =====================================================================
-- Salon-wide holidays + per-service concurrency caps
--
-- - salon_holidays: dates the whole salon is closed (festivals, owner
--   leave, etc). One row per date; enforced at booking time and folded
--   into the availability grid the customer sees.
-- - services.max_concurrent_bookings: optional "how many customers can
--   this service serve at the same time" cap (e.g. a haircut station
--   with 5 chairs vs. a single bridal-makeup artist). NULL (default)
--   means unlimited — unchanged behavior for every existing service
--   until an admin opts one in.
-- =====================================================================

CREATE TABLE salon_holidays (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date  DATE NOT NULL UNIQUE,
  reason        VARCHAR(200),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_salon_holidays_date ON salon_holidays(holiday_date);

ALTER TABLE services
  ADD COLUMN max_concurrent_bookings INTEGER
    CHECK (max_concurrent_bookings IS NULL OR max_concurrent_bookings > 0);


-- Down Migration
ALTER TABLE services DROP COLUMN IF EXISTS max_concurrent_bookings;
DROP TABLE IF EXISTS salon_holidays CASCADE;
