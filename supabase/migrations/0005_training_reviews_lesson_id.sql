-- ============================================================
-- Migration 0005 — Link training reviews to their lesson
-- ============================================================
-- The redesigned Training Review flow anchors each review to the
-- specific lesson that triggered it (the OOP repeat / policy
-- violation). Coverage + the "TR required" gate key off this.
-- Nullable so legacy reviews without a lesson link still load.
-- ============================================================

alter table training_reviews
  add column if not exists lesson_id text;

-- ============================================================
-- End of migration 0005
-- ============================================================
