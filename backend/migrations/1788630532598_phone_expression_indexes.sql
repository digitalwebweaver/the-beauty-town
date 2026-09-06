-- Up Migration
-- =====================================================================
-- Normalized-phone expression indexes
--
-- Several places compare phone numbers by their last 10 digits only
-- (right(regexp_replace(phone, '\D', '', 'g'), 10)) so formatting
-- differences (spaces, +91, dashes, an older record entered inconsistently)
-- never cause a false miss — guest-booking dedup, the admin customer
-- list's sales-by-phone LATERAL join, a customer's own sales history, and
-- coupon per-customer redemption limits. A plain btree on the raw column
-- (idx_users_phone) can't serve any of these — Postgres has to fall back
-- to a sequential scan every time. These expression indexes match the
-- exact expression used in those queries so it can be used instead.
-- =====================================================================

CREATE INDEX idx_users_phone_normalized
  ON users (right(regexp_replace(phone, '\D', '', 'g'), 10))
  WHERE phone IS NOT NULL;

CREATE INDEX idx_sales_customer_phone_normalized
  ON sales (right(regexp_replace(customer_phone, '\D', '', 'g'), 10))
  WHERE customer_phone IS NOT NULL;

CREATE INDEX idx_coupon_redemptions_customer_phone_normalized
  ON coupon_redemptions (right(regexp_replace(customer_phone, '\D', '', 'g'), 10))
  WHERE customer_phone IS NOT NULL;


-- Down Migration
DROP INDEX IF EXISTS idx_users_phone_normalized;
DROP INDEX IF EXISTS idx_sales_customer_phone_normalized;
DROP INDEX IF EXISTS idx_coupon_redemptions_customer_phone_normalized;
