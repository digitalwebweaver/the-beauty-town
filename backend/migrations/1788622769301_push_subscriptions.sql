-- Up Migration
-- =====================================================================
-- Web Push subscriptions
--
-- One row per browser/device that's opted in to push notifications (a
-- user can have several — phone, tablet, desktop browser all separately
-- subscribed). `endpoint` is the push service URL the browser gave us;
-- `p256dh`/`auth` are the subscription's encryption keys, both required
-- by the Web Push protocol to encrypt a payload for that specific
-- endpoint. See backend/src/api/push/push.service.ts for how these are
-- used, and its ON DELETE behavior for stale (410 Gone) subscriptions.
-- =====================================================================

CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);


-- Down Migration
DROP TABLE IF EXISTS push_subscriptions;
