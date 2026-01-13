-- Fix 1: Replace overly permissive profiles SELECT policy
-- This exposes all user financial data to any authenticated user

-- Drop the dangerous policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Policy 1: Users can view their own full profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Users can view profiles of their handshake partners (full details needed for transactions)
CREATE POLICY "Users can view handshake partner profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM handshakes
      WHERE (handshakes.requester_id = auth.uid() OR handshakes.supporter_id = auth.uid())
        AND (handshakes.requester_id = profiles.id OR handshakes.supporter_id = profiles.id)
    )
  );

-- Policy 3: Users can search for verified supporters (limited to KYC-completed users)
-- This allows the search functionality in CreateHandshake to work
CREATE POLICY "Users can search verified supporters"
  ON public.profiles FOR SELECT
  USING (
    kyc_completed = true
    AND id != auth.uid()
  );

-- Fix 2: Revoke public execute permission on update_cash_rating function
-- This function should only be called by system triggers, not by users directly
REVOKE EXECUTE ON FUNCTION public.update_cash_rating(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_cash_rating(UUID, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_cash_rating(UUID, INTEGER) FROM anon;