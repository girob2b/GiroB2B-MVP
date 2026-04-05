ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS public_profile_layout JSONB;
