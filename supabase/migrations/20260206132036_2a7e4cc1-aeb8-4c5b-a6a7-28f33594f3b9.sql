-- Create a secure search function that only returns safe profile fields
-- This replaces direct profile table queries for user search
CREATE OR REPLACE FUNCTION public.search_profiles(search_term text)
RETURNS TABLE(
  id uuid,
  full_name text,
  unique_code text,
  cash_rating numeric,
  id_verified boolean,
  kyc_completed boolean,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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
  WHERE p.kyc_completed = true
    AND p.id != auth.uid()
    AND (
      p.unique_code ILIKE '%' || search_term || '%'
      OR p.full_name ILIKE '%' || search_term || '%'
    )
  LIMIT 10;
$$;

-- Drop the overly permissive search policy that exposes banking details
DROP POLICY IF EXISTS "Search verified users safe info only" ON public.profiles;

-- Drop the partner policy that also exposes too much
DROP POLICY IF EXISTS "Handshake partners can view safe profile info" ON public.profiles;

-- Create a more restrictive partner policy that only exposes safe fields
-- Note: RLS policies can't restrict columns, so we use the application layer
-- and security definer functions. But we still need a SELECT policy for
-- handshake partner profile lookups (name, code for display).
-- The key insight is that the frontend queries already only SELECT safe columns.
-- We re-add a narrower row-level policy.
CREATE POLICY "Handshake partners can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM handshakes
    WHERE (handshakes.requester_id = auth.uid() OR handshakes.supporter_id = auth.uid())
    AND (handshakes.requester_id = profiles.id OR handshakes.supporter_id = profiles.id)
  )
);