-- Up Migration
-- =====================================================================
-- Audit trail — enriches the existing (previously unused) `audit_logs`
-- table so it can serve both a generic "every mutating request" capture
-- and richer, human-readable entries for the actions worth reading in
-- plain English. See backend/src/api/audit/ for how these get populated.
--
-- actor_email/actor_role are snapshotted at write time (from the JWT,
-- not a live join) so a log entry stays meaningful even after the
-- account is later deleted (actor_id is ON DELETE SET NULL) — the whole
-- point of an audit trail is to survive the thing it's auditing.
-- =====================================================================

ALTER TABLE audit_logs
  ADD COLUMN actor_email  VARCHAR(180),
  ADD COLUMN actor_role   VARCHAR(20),
  ADD COLUMN method       VARCHAR(10),
  ADD COLUMN path         VARCHAR(300),
  ADD COLUMN status_code  SMALLINT,
  ADD COLUMN duration_ms  INTEGER,
  ADD COLUMN user_agent   TEXT;


-- Down Migration
ALTER TABLE audit_logs
  DROP COLUMN IF EXISTS actor_email,
  DROP COLUMN IF EXISTS actor_role,
  DROP COLUMN IF EXISTS method,
  DROP COLUMN IF EXISTS path,
  DROP COLUMN IF EXISTS status_code,
  DROP COLUMN IF EXISTS duration_ms,
  DROP COLUMN IF EXISTS user_agent;
