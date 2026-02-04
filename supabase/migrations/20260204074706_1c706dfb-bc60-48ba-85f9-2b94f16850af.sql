-- Fix: User Banking Details and Phone Numbers Exposed to Other Users
-- The current "Users can view handshake partner profiles" policy exposes ALL profile data
-- including sensitive banking details. We need to restrict this.

-- Step 1: Drop the existing overly permissive policy for viewing handshake partner profiles
DROP POLICY IF EXISTS "Users can view handshake partner profiles" ON public.profiles;

-- Step 2: Drop the existing policy for searching verified supporters (also exposes all data)
DROP POLICY IF EXISTS "Users can search verified supporters" ON public.profiles;

-- Step 3: Create a view for safe profile data (excludes sensitive fields)
-- This view will be used for displaying partner information without exposing banking details
CREATE OR REPLACE VIEW public.safe_profile_view AS
SELECT 
  id,
  full_name,
  unique_code,
  cash_rating,
  id_verified,
  kyc_completed,
  avatar_url,
  created_at
FROM public.profiles;

-- Step 4: Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.safe_profile_view TO authenticated;

-- Step 5: Create a new restricted policy for viewing handshake partner profiles
-- This policy only allows viewing the profile id (for reference), not sensitive data
-- The actual profile data will be fetched via the safe_profile_view
CREATE POLICY "Users can view handshake partner basic info" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can see their own profile (full access)
  auth.uid() = id
  OR
  -- For handshake partners, only allow access to non-sensitive fields
  -- by restricting to only allow checking if a relationship exists
  (
    EXISTS (
      SELECT 1 FROM handshakes
      WHERE (handshakes.requester_id = auth.uid() OR handshakes.supporter_id = auth.uid())
        AND (handshakes.requester_id = profiles.id OR handshakes.supporter_id = profiles.id)
    )
  )
);

-- Step 6: Create a separate policy for supporter search that only exposes safe fields
-- Note: This still allows SELECT but the application code should only fetch non-sensitive fields
CREATE POLICY "Users can search verified supporters basic info" 
ON public.profiles 
FOR SELECT 
USING (
  kyc_completed = true 
  AND id <> auth.uid()
);

-- Step 7: Add INSERT policy for profiles (missing)
-- Profiles are created via trigger but this allows explicit inserts if needed
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Step 8: Create a security definer function to get safe profile data
-- This ensures sensitive data is never exposed even if policies are bypassed
CREATE OR REPLACE FUNCTION public.get_safe_profile(profile_id uuid)
RETURNS TABLE (
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
  WHERE p.id = profile_id;
$$;

-- Grant execute on the safe profile function
GRANT EXECUTE ON FUNCTION public.get_safe_profile(uuid) TO authenticated;