-- =====================================================================
--                    ⚠️  DEMO / DEVELOPMENT SEED DATA  ⚠️
--
--   DO NOT RUN THIS FILE AGAINST A PRODUCTION DATABASE.
--
--   It creates fake customers, a fake service menu, fake staff, fake
--   past appointments/sales/reviews — AND a fully working admin login
--   (admin@salon.com / Admin@123) whose password is printed below in
--   plain sight. Fine for local development and demos; a real liability
--   if it ever ends up seeded into a database real customers can reach.
--
--   Run salon_db_schema.sql first (schema only, safe for production),
--   then this file, for a working local dev environment.
--
--   Setting up a REAL production database instead? Run
--   salon_db_schema.sql only, then use the app itself (the Admin →
--   Settings screen, the Services/Staff/Packages management pages) to
--   enter the salon's real data. The two singleton config rows below
--   (salon_settings, coupon_template_design) are the one exception —
--   they're required bootstrap rows the app expects to exist, not fake
--   people. Everything below the "DEMO DATA BELOW THIS LINE" marker is
--   not.
-- =====================================================================

-- =====================================================================
--                              SEED DATA
-- =====================================================================

-- Salon settings (singleton row — admin-editable via /admin/settings).
-- NOTE: keep seed text ASCII-only. psql -f on Windows has been observed
-- mangling non-ASCII bytes (e.g. en-dashes) read from a script file even
-- when client/server encoding both report UTF8. Editing via the app's
-- /api/settings PATCH endpoint (Node/pg, not psql) is unaffected — real
-- UTF-8 there round-trips fine.
INSERT INTO salon_settings (id, name, tagline, address, phone, email, gstin, hours, instagram_url, facebook_url, otp_login_enabled)
VALUES (
  1,
  'The Beauty Town',
  'Your beauty, our craft.',
  'First Floor, Vidhi Square Complex, Near Govardhan Nathji Haveli, B.P.C. Road, Alkapuri, Vadodara, Gujarat 390007',
  '+91 91578 19391',
  'Payalshah1814@gmail.com',
  NULL,
  'Mon-Sun, 10:00 AM - 9:00 PM',
  'https://instagram.com/thebeautytown',
  'https://facebook.com/thebeautytown',
  FALSE
);

-- Coupon template design (singleton row — left at the built-in default;
-- the frontend renders its own starter layout whenever `elements` is
-- empty, so there is nothing else to seed here).
INSERT INTO coupon_template_design (id) VALUES (1);

-- =====================================================================
--                    DEMO DATA BELOW THIS LINE
--   Categories are debatable (a real salon likely wants similar labels
--   too), but everything from here down — users, staff, services,
--   products, reviews, appointments — is fake development/demo content.
-- =====================================================================

-- Categories
INSERT INTO service_categories (key, label, display_order) VALUES
  ('hair',     'Hair',           1),
  ('skin',     'Skin & Facial',  2),
  ('nails',    'Nails',          3),
  ('makeup',   'Makeup',         4),
  ('spa',      'Spa & Massage',  5),
  ('grooming', 'Grooming',       6);

-- Users (customers, staff, admin)
-- Admin default password: Admin@123   (bcrypt hash below)
-- Staff default password: Staff@123
-- Customer default password: Customer@123 (customers can also register their own)
INSERT INTO users (id, name, email, phone, role, password_hash, avatar_url, email_verified)
VALUES
  ('11111111-1111-1111-1111-111111111111',
   'Anjali Kapoor', 'admin@salon.com', '+91 90000 00001', 'admin',
   '$2b$10$NIfVYxd4vlXGHeCNum.lf.z6tv55/qNtqr173u.a3gINwAGW1qLDC',
   'https://i.pravatar.cc/150?img=32', TRUE),

  ('22222222-2222-2222-2222-222222222222',
   'Rahul Verma', 'rahul.staff@salon.com', '+91 98111 22233', 'staff',
   '$2b$10$ExtknE.FVLeDzgmJldEi5OtbrZhOuv0/2W9venoAlLtA7mi7Cospy',
   'https://i.pravatar.cc/150?img=12', TRUE),

  ('33333333-3333-3333-3333-333333333333',
   'Sneha Iyer', 'sneha.staff@salon.com', '+91 98222 33344', 'staff',
   '$2b$10$ExtknE.FVLeDzgmJldEi5OtbrZhOuv0/2W9venoAlLtA7mi7Cospy',
   'https://i.pravatar.cc/150?img=25', TRUE),

  ('44444444-4444-4444-4444-444444444444',
   'Meera Nair', 'meera.staff@salon.com', '+91 98333 44455', 'staff',
   '$2b$10$ExtknE.FVLeDzgmJldEi5OtbrZhOuv0/2W9venoAlLtA7mi7Cospy',
   'https://i.pravatar.cc/150?img=48', TRUE),

  ('55555555-5555-5555-5555-555555555555',
   'Karan Malhotra', 'karan.staff@salon.com', '+91 98444 55566', 'staff',
   '$2b$10$ExtknE.FVLeDzgmJldEi5OtbrZhOuv0/2W9venoAlLtA7mi7Cospy',
   'https://i.pravatar.cc/150?img=15', TRUE),

  ('66666666-6666-6666-6666-666666666666',
   'Priya Sharma', 'priya@example.com', '9876543210', 'customer',
   '$2b$10$cKnGE0G5HDXGHgpn5Vz9ae1Y26qlH1e/hZr9UT9DmBg52iwEq8prC',
   'https://i.pravatar.cc/150?img=47', TRUE),

  ('77777777-7777-7777-7777-777777777777',
   'Aditya Rao', 'aditya@example.com', '9988766554', 'customer',
   '$2b$10$cKnGE0G5HDXGHgpn5Vz9ae1Y26qlH1e/hZr9UT9DmBg52iwEq8prC',
   'https://i.pravatar.cc/150?img=54', TRUE);

-- Staff profiles
INSERT INTO staff_profiles (user_id, role_title, bio, rating, experience_years) VALUES
  ('22222222-2222-2222-2222-222222222222',
   'Senior Hair Stylist',
   '10+ years crafting cuts inspired by international runways.',
   4.9, 10),
  ('33333333-3333-3333-3333-333333333333',
   'Skin & Facial Expert',
   'Certified aesthetician specializing in advanced skin therapies.',
   4.8, 7),
  ('44444444-4444-4444-4444-444444444444',
   'Nail Artist',
   'Award-winning nail artist. Loves intricate gel designs.',
   4.9, 5),
  ('55555555-5555-5555-5555-555555555555',
   'Master Barber',
   'Precision men''s cuts, fades, and beard sculpting.',
   4.7, 12);

-- Staff specialties (join staff to categories)
INSERT INTO staff_specialties (staff_user_id, category_id)
SELECT '22222222-2222-2222-2222-222222222222', id FROM service_categories WHERE key IN ('hair','grooming');

INSERT INTO staff_specialties (staff_user_id, category_id)
SELECT '33333333-3333-3333-3333-333333333333', id FROM service_categories WHERE key IN ('skin','spa');

INSERT INTO staff_specialties (staff_user_id, category_id)
SELECT '44444444-4444-4444-4444-444444444444', id FROM service_categories WHERE key IN ('nails');

INSERT INTO staff_specialties (staff_user_id, category_id)
SELECT '55555555-5555-5555-5555-555555555555', id FROM service_categories WHERE key IN ('hair','grooming');

-- Staff availability (Mon–Sat 10:00–19:00)
INSERT INTO staff_availability (staff_user_id, day_of_week, start_time, end_time, is_available)
SELECT u.user_id, d.day, '10:00'::time, '19:00'::time, TRUE
FROM staff_profiles u
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6)) AS d(day);

-- Services
INSERT INTO services (category_id, name, slug, description, gender, price_inr, duration_minutes, image_url)
SELECT id, 'Signature Haircut & Style', 'signature-haircut',
       'Personalized haircut with wash, blow-dry and styling.',
       'unisex', 799, 45,
       'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=60'
FROM service_categories WHERE key = 'hair';

INSERT INTO services (category_id, name, slug, description, gender, price_inr, duration_minutes, image_url)
SELECT id, 'Global Hair Colour', 'global-hair-colour',
       'Ammonia-free global colour with deep conditioning.',
       'unisex', 3499, 120,
       'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=60'
FROM service_categories WHERE key = 'hair';

INSERT INTO services (category_id, name, slug, description, gender, price_inr, duration_minutes, image_url)
SELECT id, 'Keratin Smoothening', 'keratin-smoothening',
       'Frizz control with long-lasting shine and smoothness.',
       'female', 5499, 180,
       'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&auto=format&fit=crop&q=60'
FROM service_categories WHERE key = 'hair';

INSERT INTO services (category_id, name, slug, description, gender, price_inr, duration_minutes, image_url)
SELECT id, 'Classic Facial', 'classic-facial',
       'Deep-cleansing facial for glowing, refreshed skin.',
       'unisex', 1299, 60,
       'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&auto=format&fit=crop&q=60'
FROM service_categories WHERE key = 'skin';

INSERT INTO services (category_id, name, slug, description, gender, price_inr, duration_minutes, image_url)
SELECT id, 'Anti-Aging Facial', 'anti-aging-facial',
       'Premium collagen-boosting facial with LED therapy.',
       'unisex', 2499, 75,
       'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=60'
FROM service_categories WHERE key = 'skin';

INSERT INTO services (category_id, name, slug, description, gender, price_inr, duration_minutes, image_url)
SELECT id, 'Gel Manicure', 'gel-manicure',
       'Long-lasting gel polish with premium nail prep.',
       'female', 899, 45,
       'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800&auto=format&fit=crop&q=60'
FROM service_categories WHERE key = 'nails';

INSERT INTO services (category_id, name, slug, description, gender, price_inr, duration_minutes, image_url)
SELECT id, 'Spa Pedicure', 'spa-pedicure',
       'Relaxing pedicure with foot massage and mask.',
       'unisex', 999, 50,
       'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=800&auto=format&fit=crop&q=60'
FROM service_categories WHERE key = 'nails';

INSERT INTO services (category_id, name, slug, description, gender, price_inr, duration_minutes, image_url)
SELECT id, 'Bridal Makeup', 'bridal-makeup',
       'HD airbrush bridal makeup with trial session.',
       'female', 12999, 150,
       'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&auto=format&fit=crop&q=60'
FROM service_categories WHERE key = 'makeup';

INSERT INTO services (category_id, name, slug, description, gender, price_inr, duration_minutes, image_url)
SELECT id, 'Party Makeup', 'party-makeup',
       'Glam party-ready makeup with lashes.',
       'female', 2499, 60,
       'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&auto=format&fit=crop&q=60'
FROM service_categories WHERE key = 'makeup';

INSERT INTO services (category_id, name, slug, description, gender, price_inr, duration_minutes, image_url)
SELECT id, 'Aromatherapy Massage', 'aromatherapy-massage',
       '60-min full-body relaxation massage with essential oils.',
       'unisex', 2299, 60,
       'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=60'
FROM service_categories WHERE key = 'spa';

INSERT INTO services (category_id, name, slug, description, gender, price_inr, duration_minutes, image_url)
SELECT id, 'Men''s Beard Grooming', 'mens-beard-grooming',
       'Beard shaping, trim, and hot-towel treatment.',
       'male', 499, 30,
       'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=60'
FROM service_categories WHERE key = 'grooming';

-- Products
INSERT INTO products (name, brand, category, stock, price_inr, reorder_level) VALUES
  ('Argan Oil Shampoo',      'Moroccan Luxe', 'Hair Care', 42, 899,  15),
  ('Vitamin C Serum',        'GlowLab',       'Skin Care',  8, 1499, 10),
  ('Gel Polish (Rose Nude)', 'NailArtPro',    'Nails',      3, 599,   8),
  ('Beard Balm',             'GentsCraft',    'Grooming',  26, 449,  12),
  ('Aromatherapy Oil Set',   'Serenity',      'Spa',       14, 1299, 10);

-- Reviews (public testimonials shown on landing page)
INSERT INTO reviews (customer_id, staff_id, rating, comment)
VALUES
  ('66666666-6666-6666-6666-666666666666',
   '22222222-2222-2222-2222-222222222222', 5,
   'Absolutely loved the haircut Rahul gave me. Best salon experience ever!'),
  ('77777777-7777-7777-7777-777777777777',
   '55555555-5555-5555-5555-555555555555', 5,
   'Karan''s beard sculpting is unmatched. Highly recommend.'),
  ('66666666-6666-6666-6666-666666666666',
   '33333333-3333-3333-3333-333333333333', 5,
   'Sneha''s facials leave my skin absolutely glowing. Trusted her for 2 years.'),
  ('77777777-7777-7777-7777-777777777777',
   '44444444-4444-4444-4444-444444444444', 4,
   'The gel manicure held up for 3 weeks. Meera is amazing at detail.');

-- Example appointments (so dashboards aren't empty on first load)
INSERT INTO appointments (customer_id, staff_id, appointment_date, start_time, end_time, status, total_inr, notes)
VALUES
  ('66666666-6666-6666-6666-666666666666',
   '22222222-2222-2222-2222-222222222222',
   (CURRENT_DATE + INTERVAL '3 days')::date, '11:00', '11:45',
   'confirmed', 799, 'Prefers shoulder length'),

  ('66666666-6666-6666-6666-666666666666',
   '33333333-3333-3333-3333-333333333333',
   (CURRENT_DATE + INTERVAL '10 days')::date, '14:00', '15:45',
   'pending', 2198, NULL),

  ('66666666-6666-6666-6666-666666666666',
   '44444444-4444-4444-4444-444444444444',
   (CURRENT_DATE - INTERVAL '40 days')::date, '17:00', '17:50',
   'completed', 999, NULL),

  ('77777777-7777-7777-7777-777777777777',
   '55555555-5555-5555-5555-555555555555',
   CURRENT_DATE, '10:00', '10:30',
   'confirmed', 499, NULL);

-- Link line-item services to those appointments
INSERT INTO appointment_services (appointment_id, service_id, price_at_booking, duration_at_booking)
SELECT a.id, s.id, s.price_inr, s.duration_minutes
FROM appointments a
JOIN services s ON s.slug = 'signature-haircut'
WHERE a.total_inr = 799;

INSERT INTO appointment_services (appointment_id, service_id, price_at_booking, duration_at_booking)
SELECT a.id, s.id, s.price_inr, s.duration_minutes
FROM appointments a
JOIN services s ON s.slug IN ('classic-facial','gel-manicure')
WHERE a.total_inr = 2198;

INSERT INTO appointment_services (appointment_id, service_id, price_at_booking, duration_at_booking)
SELECT a.id, s.id, s.price_inr, s.duration_minutes
FROM appointments a
JOIN services s ON s.slug = 'spa-pedicure'
WHERE a.total_inr = 999;

INSERT INTO appointment_services (appointment_id, service_id, price_at_booking, duration_at_booking)
SELECT a.id, s.id, s.price_inr, s.duration_minutes
FROM appointments a
JOIN services s ON s.slug = 'mens-beard-grooming'
WHERE a.total_inr = 499;

-- =====================================================================
-- Sanity check queries (run these to confirm seed worked)
-- =====================================================================
-- SELECT role, COUNT(*) FROM users GROUP BY role;
-- SELECT c.label, COUNT(s.id) AS service_count
--   FROM service_categories c LEFT JOIN services s ON s.category_id = c.id
--   GROUP BY c.label ORDER BY c.display_order;
