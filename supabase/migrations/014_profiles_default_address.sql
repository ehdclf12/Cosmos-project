ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_zonecode text,
  ADD COLUMN IF NOT EXISTS default_base_address text,
  ADD COLUMN IF NOT EXISTS default_detail_address text;
