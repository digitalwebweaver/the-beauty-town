-- Up Migration
-- =====================================================================
-- Quick Bill price override toggle
--
-- Prices at this business can vary case-by-case (negotiated rates,
-- loyalty adjustments, etc). This flag, off by default, controls
-- whether staff can edit a cart line's unit price in Quick Bill at all.
-- Enforced server-side in sales.service.ts (not just hidden in the UI)
-- so a direct API call can't bypass it while the setting is off.
-- =====================================================================

ALTER TABLE salon_settings
  ADD COLUMN allow_price_override BOOLEAN NOT NULL DEFAULT FALSE;


-- Down Migration
ALTER TABLE salon_settings DROP COLUMN IF EXISTS allow_price_override;
