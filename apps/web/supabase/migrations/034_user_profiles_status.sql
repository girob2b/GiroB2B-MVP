-- ============================================================
-- Migration 034: User account suspension status
-- ============================================================

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE public.user_profiles
SET status = COALESCE(status, 'ativa');

UPDATE public.user_profiles up
SET status = CASE
  WHEN s.suspended = TRUE THEN 'suspensa'
  WHEN LOWER(COALESCE(up.status, '')) IN ('suspensa', 'suspended') THEN 'suspensa'
  ELSE 'ativa'
END
FROM public.suppliers s
WHERE s.user_id = up.id;

UPDATE public.user_profiles
SET status = CASE
  WHEN LOWER(COALESCE(status, '')) IN ('suspensa', 'suspended') THEN 'suspensa'
  ELSE 'ativa'
END;

ALTER TABLE IF EXISTS public.user_profiles
  ALTER COLUMN status SET DEFAULT 'ativa',
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE IF EXISTS public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_status_check;

ALTER TABLE IF EXISTS public.user_profiles
  ADD CONSTRAINT user_profiles_status_check
  CHECK (status IN ('ativa', 'suspensa'));

UPDATE public.suppliers s
SET suspended = (up.status = 'suspensa')
FROM public.user_profiles up
WHERE up.id = s.user_id
  AND s.suspended IS DISTINCT FROM (up.status = 'suspensa');
