-- =====================================================================
-- Salon Booking System — Schema (safe to run against production)
-- Target DB : salon_db (already created in pgAdmin, owner postgres)
-- PG        : 13+ (uses gen_random_uuid())
-- Scale     : designed for lakhs of users (indexes on all hot paths,
--             partial indexes where useful, FK indexes, timestamp indexes)
--
-- This file is schema ONLY — tables, types, indexes, triggers. No demo
-- data, no seeded accounts. It is safe to run against a real production
-- database (though the DROP TABLE/TYPE block below is destructive to
-- pre-existing data of the SAME name, so still be careful re-running it
-- against a database that already has real rows).
--
-- For local development, seed data (fake customers/staff/services/a
-- working demo admin login) lives separately in salon_db_seed.sql — run
-- this file first, then that one. NEVER run salon_db_seed.sql against a
-- production database; see the banner at the top of that file.
--
-- This file is now a reference snapshot, not the live-deploy path — the
-- real, versioned schema history lives in backend/migrations/ (run via
-- `npm run migrate:up` in backend/), starting from a single init migration
-- that mirrors this exact schema. Any future schema change should be a new
-- migration file, not an edit to this file or a re-run of it against a
-- database that already has data.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- for exclusion constraint on appointments

-- ---------------------------------------------------------------------
-- Fresh start (safe: only drops OUR tables, never the database)
-- Uncomment when you want to wipe everything and re-run.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS salon_holidays CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS salon_settings CASCADE;
DROP TABLE IF EXISTS coupon_template_design CASCADE;
DROP TABLE IF EXISTS coupon_redemptions CASCADE;
DROP TABLE IF EXISTS sale_payments CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS coupon_items CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS appointment_services CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS staff_availability CASCADE;
DROP TABLE IF EXISTS staff_specialties CASCADE;
DROP TABLE IF EXISTS staff_profiles CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS package_services CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS service_categories CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS otp_tokens CASCADE;
DROP TABLE IF EXISTS oauth_accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE  IF EXISTS user_role CASCADE;
DROP TYPE  IF EXISTS service_gender CASCADE;
DROP TYPE  IF EXISTS appointment_status CASCADE;
DROP TYPE  IF EXISTS sale_item_type CASCADE;
DROP TYPE  IF EXISTS payment_method CASCADE;
DROP TYPE  IF EXISTS sale_status CASCADE;
DROP TYPE  IF EXISTS coupon_discount_type CASCADE;
DROP TYPE  IF EXISTS coupon_scope CASCADE;

-- ---------------------------------------------------------------------
-- Enums (typed & indexable)
-- ---------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('customer', 'staff', 'admin');
CREATE TYPE service_gender AS ENUM ('male', 'female', 'unisex');
CREATE TYPE appointment_status AS ENUM (
  'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
);
-- POS / billing enums
CREATE TYPE sale_item_type AS ENUM ('service', 'product', 'package');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'upi');
CREATE TYPE sale_status AS ENUM ('completed', 'void');
-- Coupon enums
CREATE TYPE coupon_discount_type AS ENUM ('flat', 'percent');
CREATE TYPE coupon_scope AS ENUM ('bill', 'items');

-- ---------------------------------------------------------------------
-- Helper: updated_at trigger function (single function, reused)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 1. USERS  — customers, staff, admins in one table (role-based)
--   - Customers: password login by default (bcrypt) or Google login;
--     email OTP remains available if enabled in salon_settings
--   - Staff/Admin: password_hash always required (bcrypt)
--   - failed_login_attempts + locked_until for brute-force lockout
-- =====================================================================
CREATE TABLE users (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(120) NOT NULL,
  email                  VARCHAR(180) NOT NULL,
  email_lower            VARCHAR(180) GENERATED ALWAYS AS (LOWER(email)) STORED,
  phone                  VARCHAR(20),
  role                   user_role NOT NULL DEFAULT 'customer',
  password_hash          TEXT,
  avatar_url             TEXT,
  -- Customer-facing notification toggles (Profile page). Keys:
  -- appointmentReminders, promotionalOffers, newsletter — all booleans.
  notification_prefs     JSONB NOT NULL DEFAULT
    '{"appointmentReminders":true,"promotionalOffers":false,"newsletter":true}'::jsonb,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_attempts  INTEGER NOT NULL DEFAULT 0,
  locked_until           TIMESTAMPTZ,
  last_login_at          TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_lower_unique UNIQUE (email_lower),
  CONSTRAINT users_staff_admin_must_have_password
    CHECK (role = 'customer' OR password_hash IS NOT NULL)
);

CREATE INDEX idx_users_role         ON users(role);
CREATE INDEX idx_users_created_at   ON users(created_at DESC);
CREATE INDEX idx_users_phone        ON users(phone) WHERE phone IS NOT NULL;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 2. OAUTH_ACCOUNTS — social login providers (google, etc.)
-- =====================================================================
CREATE TABLE oauth_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          VARCHAR(32) NOT NULL,          -- 'google'
  provider_user_id  VARCHAR(191) NOT NULL,         -- Google's sub / provider ID
  email             VARCHAR(180),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT oauth_provider_unique UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_oauth_user_id ON oauth_accounts(user_id);

-- =====================================================================
-- 3. OTP_TOKENS — email OTPs for passwordless customer login
--   - Store HASH of OTP, never the OTP itself
--   - Purpose: 'login' | 'verify_email' | 'change_email' | 'password_reset'
--   - attempts tracks failed verifications
-- =====================================================================
CREATE TABLE otp_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(180) NOT NULL,
  purpose       VARCHAR(32) NOT NULL DEFAULT 'login',
  otp_hash      TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  attempts      SMALLINT NOT NULL DEFAULT 0,
  ip_address    VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_email_purpose ON otp_tokens(LOWER(email), purpose);
CREATE INDEX idx_otp_expires_at    ON otp_tokens(expires_at);

-- =====================================================================
-- 4. REFRESH_TOKENS — server-tracked refresh tokens for revocation
--   - Store HASH, not raw token
--   - Rotation: when refreshed, revoke old and issue new
-- =====================================================================
CREATE TABLE refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  replaced_by  UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  user_agent   TEXT,
  ip_address   VARCHAR(64),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_user_id     ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_expires_at  ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_active
  ON refresh_tokens(user_id)
  WHERE revoked_at IS NULL;

-- =====================================================================
-- 5. SERVICE_CATEGORIES — hair, skin, nails, makeup, spa, grooming
-- =====================================================================
CREATE TABLE service_categories (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key            VARCHAR(32) NOT NULL UNIQUE,
  label          VARCHAR(80) NOT NULL,
  display_order  SMALLINT NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 6. SERVICES — haircut, facial, etc.
-- =====================================================================
CREATE TABLE services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       UUID NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  name              VARCHAR(150) NOT NULL,
  slug              VARCHAR(180) NOT NULL UNIQUE,
  description       TEXT,
  gender            service_gender NOT NULL DEFAULT 'unisex',
  price_inr         NUMERIC(10,2) NOT NULL CHECK (price_inr >= 0),
  duration_minutes  INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 600),
  image_url         TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  -- How many customers this service can serve at the same time (e.g. a
  -- 5-chair haircut station vs. a single bridal-makeup artist). NULL =
  -- unlimited (default — matches every service's behavior until an
  -- admin opts one in).
  max_concurrent_bookings  INTEGER CHECK (max_concurrent_bookings IS NULL OR max_concurrent_bookings > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active   ON services(is_active) WHERE is_active;
CREATE INDEX idx_services_gender   ON services(gender);

CREATE TRIGGER trg_services_updated
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 6b. PACKAGES — sellable bundles (memberships, groom/bridal packages,
--     destination packages, ...). `category` is free text, admin-defined
--     (e.g. "Membership for Female", "Groom Package") rather than a
--     separate lookup table — low cardinality, same simplification as
--     other admin-authored labels in this schema.
-- =====================================================================
CREATE TABLE packages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(150) NOT NULL,
  slug              VARCHAR(180) NOT NULL UNIQUE,
  category          VARCHAR(100) NOT NULL,
  gender            service_gender NOT NULL DEFAULT 'unisex',
  description       TEXT,
  price_inr         NUMERIC(10,2) NOT NULL CHECK (price_inr >= 0),
  worth_inr         NUMERIC(10,2) CHECK (worth_inr IS NULL OR worth_inr >= price_inr),
  validity_label    VARCHAR(60),
  inclusions        TEXT[] NOT NULL DEFAULT '{}',
  image_url         TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  display_order     INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_packages_active   ON packages(is_active) WHERE is_active;
CREATE INDEX idx_packages_category ON packages(category);

CREATE TRIGGER trg_packages_updated
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Which services a package bundles. A package with zero rows here is
-- "enquiry-only" (e.g. memberships, destination packages) — bookability
-- is derived from this at query time, never stored, so it can't drift.
CREATE TABLE package_services (
  package_id  UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  PRIMARY KEY (package_id, service_id)
);

CREATE INDEX idx_package_services_service ON package_services(service_id);

-- =====================================================================
-- 7. STAFF_PROFILES — extended info for staff-role users
-- =====================================================================
CREATE TABLE staff_profiles (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role_title        VARCHAR(120) NOT NULL,
  bio               TEXT,
  rating            NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  experience_years  SMALLINT NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_active ON staff_profiles(is_active) WHERE is_active;

CREATE TRIGGER trg_staff_updated
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 8. STAFF_SPECIALTIES — which categories a staff member can handle
-- =====================================================================
CREATE TABLE staff_specialties (
  staff_user_id  UUID NOT NULL REFERENCES staff_profiles(user_id) ON DELETE CASCADE,
  category_id    UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_user_id, category_id)
);

CREATE INDEX idx_staff_specialties_cat ON staff_specialties(category_id);

-- =====================================================================
-- 9. STAFF_AVAILABILITY — weekly recurring hours
--   day_of_week: 0 = Sunday ... 6 = Saturday (ISO)
-- =====================================================================
CREATE TABLE staff_availability (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id  UUID NOT NULL REFERENCES staff_profiles(user_id) ON DELETE CASCADE,
  day_of_week    SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  is_available   BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (start_time < end_time),
  -- One row per staff member per weekday — the app models a day as a
  -- single on/off toggle + one time range, not multiple blocks. Lets
  -- PATCH /staff/availability upsert with ON CONFLICT.
  CONSTRAINT staff_availability_staff_day_unique UNIQUE (staff_user_id, day_of_week)
);

CREATE INDEX idx_avail_staff_day ON staff_availability(staff_user_id, day_of_week);

-- =====================================================================
-- 10. APPOINTMENTS — bookings
--   - Slot locking via EXCLUSION CONSTRAINT:
--     prevents overlapping active appointments for the same staff.
--   - Constraint AUTOMATICALLY excludes cancelled/no_show rows (WHERE clause).
-- =====================================================================
CREATE TABLE appointments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  staff_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_date      DATE NOT NULL,
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  status                appointment_status NOT NULL DEFAULT 'pending',
  total_inr             NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_inr >= 0),
  package_id            UUID REFERENCES packages(id) ON DELETE SET NULL,
  notes                 TEXT,
  cancellation_reason   TEXT,
  cancelled_at          TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (start_time < end_time),

  -- SLOT LOCKING: no two active appointments for the same staff can overlap.
  -- tsrange over (date + time) captures the actual time window.
  CONSTRAINT no_double_booking EXCLUDE USING gist (
    staff_id WITH =,
    tsrange(
      (appointment_date + start_time)::timestamp,
      (appointment_date + end_time)::timestamp
    ) WITH &&
  ) WHERE (status NOT IN ('cancelled', 'no_show') AND staff_id IS NOT NULL)
);

-- Hot-path indexes for dashboards and lookups
CREATE INDEX idx_appointments_customer_date   ON appointments(customer_id, appointment_date DESC);
CREATE INDEX idx_appointments_staff_date      ON appointments(staff_id, appointment_date);
CREATE INDEX idx_appointments_date_status     ON appointments(appointment_date, status);
CREATE INDEX idx_appointments_status_created  ON appointments(status, created_at DESC);
CREATE INDEX idx_appointments_active
  ON appointments(staff_id, appointment_date)
  WHERE status NOT IN ('cancelled', 'no_show', 'completed');
CREATE INDEX idx_appointments_package
  ON appointments(package_id) WHERE package_id IS NOT NULL;

CREATE TRIGGER trg_appointments_updated
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 11. APPOINTMENT_SERVICES — a single booking may include multiple services
--   Prices are snapshotted so historical bookings stay accurate.
-- =====================================================================
CREATE TABLE appointment_services (
  appointment_id       UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id           UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  price_at_booking     NUMERIC(10,2) NOT NULL CHECK (price_at_booking >= 0),
  duration_at_booking  INTEGER NOT NULL CHECK (duration_at_booking > 0),
  PRIMARY KEY (appointment_id, service_id)
);

CREATE INDEX idx_appt_services_service ON appointment_services(service_id);

-- =====================================================================
-- 12. REVIEWS
-- =====================================================================
CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_staff        ON reviews(staff_id);
CREATE INDEX idx_reviews_created_at   ON reviews(created_at DESC);

-- =====================================================================
-- 13. PRODUCTS — retail / inventory
-- =====================================================================
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(150) NOT NULL,
  brand           VARCHAR(100),
  category        VARCHAR(80),
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price_inr       NUMERIC(10,2) NOT NULL CHECK (price_inr >= 0),
  reorder_level   INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_active ON products(is_active) WHERE is_active;
CREATE INDEX idx_products_low_stock
  ON products(stock)
  WHERE stock <= reorder_level;

CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 14. COUPONS — promotional codes, admin-created, staff-redeemed at POS
--   - code_upper (generated) makes matching case-insensitive, same pattern
--     as users.email_lower.
--   - scope='bill' discounts the whole sale; scope='items' restricts the
--     discount to whatever's listed in coupon_items.
--   - redemptions_count is a denormalized counter, incremented atomically
--     (guarded UPDATE) at redemption time so the total cap is race-safe
--     without scanning coupon_redemptions on every checkout.
-- =====================================================================
CREATE TABLE coupons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(30) NOT NULL,
  code_upper          VARCHAR(30) GENERATED ALWAYS AS (UPPER(code)) STORED,
  description         VARCHAR(200),
  discount_type       coupon_discount_type NOT NULL,
  discount_value      NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_discount_inr    NUMERIC(10,2),
  min_spend_inr       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_spend_inr >= 0),
  scope               coupon_scope NOT NULL DEFAULT 'bill',
  starts_at           TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  max_redemptions     INTEGER CHECK (max_redemptions > 0),
  redemptions_count   INTEGER NOT NULL DEFAULT 0,
  per_customer_limit  INTEGER DEFAULT 1 CHECK (per_customer_limit > 0),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT coupons_code_upper_unique UNIQUE (code_upper),
  CONSTRAINT coupons_percent_range
    CHECK (discount_type = 'flat' OR discount_value <= 100),
  CONSTRAINT coupons_validity_order
    CHECK (starts_at IS NULL OR expires_at IS NULL OR starts_at < expires_at)
);

CREATE INDEX idx_coupons_active ON coupons(is_active) WHERE is_active;

CREATE TRIGGER trg_coupons_updated
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 15. COUPON_ITEMS — which services/products a scope='items' coupon
--   applies to. Empty (no rows) for scope='bill' coupons. Reuses
--   sale_item_type rather than introducing a duplicate enum.
-- =====================================================================
CREATE TABLE coupon_items (
  coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  item_type   sale_item_type NOT NULL,
  service_id  UUID REFERENCES services(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,

  CONSTRAINT coupon_items_one_ref CHECK (
    (item_type = 'service' AND service_id IS NOT NULL AND product_id IS NULL) OR
    (item_type = 'product' AND product_id IS NOT NULL AND service_id IS NULL)
  )
);

CREATE UNIQUE INDEX idx_coupon_items_unique
  ON coupon_items (coupon_id, COALESCE(service_id, product_id));
CREATE INDEX idx_coupon_items_coupon ON coupon_items(coupon_id);

-- =====================================================================
-- 16. SALES — POS / quick-billing ticket header
--   - Either stands alone (walk-in) or checks out an appointment
--     (appointment_id set) — in both cases it's the source of truth
--     for what was actually charged and how it was paid.
--   - customer_id is nullable: a pure walk-in can be billed against
--     just a name/phone snapshot without creating a real account.
--   - subtotal/discount/total are computed server-side from locked
--     services/products rows at sale time — never trusted from the client.
-- =====================================================================
CREATE TABLE sales (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id      UUID REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name       VARCHAR(120),
  customer_phone      VARCHAR(20),
  staff_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  subtotal_inr        NUMERIC(10,2) NOT NULL CHECK (subtotal_inr >= 0),
  discount_inr        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_inr >= 0),
  total_inr           NUMERIC(10,2) NOT NULL CHECK (total_inr >= 0),
  coupon_id           UUID REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_code         VARCHAR(30),
  coupon_discount_inr NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (coupon_discount_inr >= 0),
  status              sale_status NOT NULL DEFAULT 'completed',
  notes               TEXT,
  voided_at           TIMESTAMPTZ,
  void_reason         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (discount_inr <= subtotal_inr)
);

CREATE INDEX idx_sales_customer_date  ON sales(customer_id, created_at DESC);
CREATE INDEX idx_sales_staff_date     ON sales(staff_id, created_at DESC);
CREATE INDEX idx_sales_status_created ON sales(status, created_at DESC);
CREATE INDEX idx_sales_appointment    ON sales(appointment_id) WHERE appointment_id IS NOT NULL;

CREATE TRIGGER trg_sales_updated
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 17. SALE_ITEMS — line items on a bill; a service, a product, or a
--   package (billed at the package's own flat price).
--   Prices are snapshotted (name_at_sale / unit_price_inr) exactly like
--   appointment_services, so a later catalog change never rewrites
--   a historical receipt. Own UUID PK (not composite) because a walk-in
--   can buy the same product more than once as separate lines.
-- =====================================================================
CREATE TABLE sale_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id          UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_type        sale_item_type NOT NULL,
  service_id       UUID REFERENCES services(id) ON DELETE RESTRICT,
  product_id       UUID REFERENCES products(id) ON DELETE RESTRICT,
  package_id       UUID REFERENCES packages(id) ON DELETE RESTRICT,
  name_at_sale     VARCHAR(150) NOT NULL,
  unit_price_inr   NUMERIC(10,2) NOT NULL CHECK (unit_price_inr >= 0),
  quantity         INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  discount_inr     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_inr >= 0),
  line_total_inr   NUMERIC(10,2) NOT NULL CHECK (line_total_inr >= 0),

  CONSTRAINT sale_items_one_ref CHECK (
    (item_type = 'service' AND service_id IS NOT NULL AND product_id IS NULL AND package_id IS NULL) OR
    (item_type = 'product' AND product_id IS NOT NULL AND service_id IS NULL AND package_id IS NULL) OR
    (item_type = 'package' AND package_id IS NOT NULL AND service_id IS NULL AND product_id IS NULL)
  )
);

CREATE INDEX idx_sale_items_sale    ON sale_items(sale_id);
CREATE INDEX idx_sale_items_service ON sale_items(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX idx_sale_items_product ON sale_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_sale_items_package ON sale_items(package_id) WHERE package_id IS NOT NULL;

-- =====================================================================
-- 18. SALE_PAYMENTS — one row per payment method used on a bill.
--   A single-method sale is one row; a split payment (e.g. part cash,
--   part UPI) is two. SUM(amount_inr) is validated against sales.total_inr
--   in the service layer at write time (cross-row sums aren't a plain CHECK).
-- =====================================================================
CREATE TABLE sale_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id      UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method       payment_method NOT NULL,
  amount_inr   NUMERIC(10,2) NOT NULL CHECK (amount_inr > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_payments_sale ON sale_payments(sale_id);

-- =====================================================================
-- 19. COUPON_REDEMPTIONS — usage ledger. Enforces per_customer_limit
--   (matched by phone — the same identity most POS sales carry, since
--   customer_id is often null for a plain walk-in) and gives a real
--   "who redeemed what, when, worth how much" report.
-- =====================================================================
CREATE TABLE coupon_redemptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id            UUID NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  sale_id              UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  customer_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_phone       VARCHAR(20),
  discount_applied_inr NUMERIC(10,2) NOT NULL CHECK (discount_applied_inr >= 0),
  redeemed_by_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  redeemed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_phone  ON coupon_redemptions(coupon_id, customer_phone);

-- =====================================================================
-- 20. AUDIT_LOGS — track sensitive actions
-- =====================================================================
CREATE TABLE audit_logs (
  id           BIGSERIAL PRIMARY KEY,
  actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action       VARCHAR(80) NOT NULL,
  target_type  VARCHAR(40),
  target_id    UUID,
  meta         JSONB,
  ip_address   VARCHAR(64),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor      ON audit_logs(actor_id);
CREATE INDEX idx_audit_action     ON audit_logs(action);
CREATE INDEX idx_audit_created    ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_target     ON audit_logs(target_type, target_id);

-- =====================================================================
-- 21. SALON_SETTINGS — one salon, one row of admin-editable business info
--   Shown on the public site (Navbar/Footer) and on printed receipts.
--   Singleton enforced with CHECK (id = 1) — there is nothing to key on.
-- =====================================================================
CREATE TABLE salon_settings (
  id             SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name           VARCHAR(150) NOT NULL,
  tagline        VARCHAR(200),
  address        VARCHAR(300),
  phone          VARCHAR(20),
  email          VARCHAR(180),
  gstin          VARCHAR(20),
  hours          VARCHAR(150),
  instagram_url  TEXT,
  facebook_url   TEXT,
  otp_login_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_salon_settings_updated
  BEFORE UPDATE ON salon_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 22. COUPON_TEMPLATE_DESIGN — one drag-and-drop printable coupon layout,
--   reused (auto-filled) for every coupon. Singleton, same id=1 pattern
--   as SALON_SETTINGS. `design` is the whole canvas as JSON (size,
--   background, and a list of positioned text/image/shape/qrcode
--   elements) — the shape is owned by the frontend
--   (frontend/src/lib/couponDesign.ts), the backend just stores it.
--   An empty `elements` array (the seeded default) means "never
--   customized yet" — the frontend falls back to its own built-in
--   starter layout in that case, both in the designer and on print.
-- =====================================================================
CREATE TABLE coupon_template_design (
  id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  design      JSONB NOT NULL DEFAULT '{"width":440,"height":200,"backgroundColor":"#ffffff","backgroundImageUrl":null,"elements":[]}'::jsonb,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_coupon_template_design_updated
  BEFORE UPDATE ON coupon_template_design
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 23. SALON_HOLIDAYS — dates the whole salon is closed (festivals,
--   owner leave, etc). Salon-wide, not per-staff: a holiday closes
--   booking for every staff member and service on that date.
-- =====================================================================
CREATE TABLE salon_holidays (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date  DATE NOT NULL UNIQUE,
  reason        VARCHAR(200),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_salon_holidays_date ON salon_holidays(holiday_date);

