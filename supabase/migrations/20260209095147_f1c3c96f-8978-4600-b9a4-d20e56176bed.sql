
-- Drop the overly permissive partner SELECT policy that exposes ALL profile columns
DROP POLICY IF EXISTS "Handshake partners can view profiles" ON public.profiles;

-- Create a batch-safe function to get multiple safe profiles at once
-- Only returns non-sensitive fields (no banking details, no ID documents, no phone)
CREATE OR REPLACE FUNCTION public.get_safe_profiles_batch(profile_ids uuid[])
RETURNS TABLE(id uuid, full_name text, unique_code text, cash_rating numeric, id_verified boolean, kyc_completed boolean, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.unique_code,
    p.cash_rating,
    p.id_verified,
    p.kyc_completed,
    p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(profile_ids);
$$;
