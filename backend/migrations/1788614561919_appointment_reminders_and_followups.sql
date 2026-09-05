-- Up Migration
-- =====================================================================
-- Appointment reminders, follow-ups, and rebooking nudges
--
-- Six "already sent?" markers on appointments — a cron job (see
-- src/jobs/appointmentNotifications.job.ts) scans for appointments that
-- cross a threshold and haven't been notified yet, sends the email, then
-- stamps the corresponding column so it never sends twice:
--   - reminder_1week_sent_at / reminder_24h_sent_at / reminder_2h_sent_at:
--     pre-visit reminders to the CUSTOMER.
--   - followup_sent_at: a thank-you + review request to the customer,
--     sent a couple of hours after the visit completes.
--   - rebooking_nudge_sent_at: set on a customer's most recent COMPLETED
--     appointment once they're "due" for a repeat visit (based on their
--     own historical booking cadence) and haven't booked again yet.
--   - unconfirmed_alert_sent_at: a "reminder to US" — an email to the
--     salon's own contact address when a booking is ~2h out and still
--     unconfirmed. Independent of reminder_2h_sent_at since it goes to a
--     different recipient for a different reason.
--
-- Two settings toggles let the salon turn these off independently —
-- utility reminders/follow-ups vs. the more marketing-flavored nudge.
-- =====================================================================

ALTER TABLE appointments
  ADD COLUMN reminder_1week_sent_at TIMESTAMPTZ,
  ADD COLUMN reminder_24h_sent_at   TIMESTAMPTZ,
  ADD COLUMN reminder_2h_sent_at    TIMESTAMPTZ,
  ADD COLUMN followup_sent_at       TIMESTAMPTZ,
  ADD COLUMN rebooking_nudge_sent_at TIMESTAMPTZ,
  ADD COLUMN unconfirmed_alert_sent_at TIMESTAMPTZ;

ALTER TABLE salon_settings
  ADD COLUMN appointment_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN rebooking_nudges_enabled BOOLEAN NOT NULL DEFAULT TRUE;


-- Down Migration
ALTER TABLE salon_settings
  DROP COLUMN IF EXISTS appointment_notifications_enabled,
  DROP COLUMN IF EXISTS rebooking_nudges_enabled;

ALTER TABLE appointments
  DROP COLUMN IF EXISTS reminder_1week_sent_at,
  DROP COLUMN IF EXISTS reminder_24h_sent_at,
  DROP COLUMN IF EXISTS reminder_2h_sent_at,
  DROP COLUMN IF EXISTS followup_sent_at,
  DROP COLUMN IF EXISTS rebooking_nudge_sent_at,
  DROP COLUMN IF EXISTS unconfirmed_alert_sent_at;
