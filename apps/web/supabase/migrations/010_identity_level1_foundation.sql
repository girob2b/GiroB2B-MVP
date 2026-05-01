-- ============================================================
-- Migration 010: Identity level-1 foundation
--
-- Aligns the backend schema with the unified registration model:
--   - user_profiles role now defaults to `user`
--   - user_profiles stores level-1 signup fields
--   - new auth users are backfilled from raw_user_meta_data
-- ============================================================

ALTER TABLE IF EXISTS user_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT;

ALTER TABLE IF EXISTS user_profiles
  ALTER COLUMN role SET DEFAULT 'user';

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
    FROM pg_constraint
   WHERE conrelid = 'public.user_profiles'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%role IN%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END;
$$;

ALTER TABLE IF EXISTS user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('user', 'buyer', 'supplier', 'admin'));

ALTER TABLE IF EXISTS user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_state_len;

ALTER TABLE IF EXISTS user_profiles
  ADD CONSTRAINT user_profiles_state_len
  CHECK (state IS NULL OR state = '' OR char_length(state) = 2);

UPDATE public.user_profiles up
SET
  role = COALESCE(NULLIF(au.raw_user_meta_data->>'role', ''), 'user'),
  full_name = COALESCE(up.full_name, NULLIF(au.raw_user_meta_data->>'full_name', '')),
  phone = COALESCE(up.phone, NULLIF(au.raw_user_meta_data->>'phone', '')),
  city = COALESCE(up.city, NULLIF(au.raw_user_meta_data->>'city', '')),
  state = COALESCE(up.state, NULLIF(au.raw_user_meta_data->>'state', ''))
FROM auth.users au
WHERE au.id = up.id;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  INSERT INTO public.user_profiles (id, role, full_name, phone, city, state)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'city', ''),
    NULLIF(NEW.raw_user_meta_data->>'state', '')
  );
  RETURN NEW;
END;
$func$;
