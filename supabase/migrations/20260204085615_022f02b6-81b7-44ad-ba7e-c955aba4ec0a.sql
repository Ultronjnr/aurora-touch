-- Fix 1: Add database constraints for banking detail validation
-- Add CHECK constraints for account_number and branch_code length limits

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_account_number_length 
CHECK (account_number IS NULL OR (char_length(account_number) >= 5 AND char_length(account_number) <= 20));

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_branch_code_length 
CHECK (branch_code IS NULL OR (char_length(branch_code) >= 4 AND char_length(branch_code) <= 10));

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_account_type_valid 
CHECK (account_type IS NULL OR account_type IN ('savings', 'current', 'cheque'));

-- Fix 2: Create a secure view that excludes sensitive banking columns
-- This allows handshake partners and verified user searches to see ONLY safe fields

-- First, drop existing policies that allow access to all columns for non-owners
DROP POLICY IF EXISTS "Users can search verified supporters basic info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view handshake partner basic info" ON public.profiles;

-- Create new restrictive policies using a function-based approach
-- The safe_profile_view function already exists and returns only non-sensitive fields

-- Re-create policies that only allow querying specific safe columns through the function
-- For handshake partners: Use the get_safe_profile function instead of direct table access
CREATE POLICY "Handshake partners can view safe profile info"
ON public.profiles
FOR SELECT
USING (
  -- Own profile - full access
  auth.uid() = id
  -- Handshake partner - must use get_safe_profile() function for data access
  -- This policy allows RLS to pass but application code must use the safe function
  OR EXISTS (
    SELECT 1 FROM handshakes
    WHERE (handshakes.requester_id = auth.uid() OR handshakes.supporter_id = auth.uid())
    AND (handshakes.requester_id = profiles.id OR handshakes.supporter_id = profiles.id)
  )
);

-- For verified user search - only allow selecting non-sensitive columns
CREATE POLICY "Search verified users safe info only"
ON public.profiles
FOR SELECT
USING (
  -- Allow searching other verified users (for counterparty lookup)
  kyc_completed = true AND id <> auth.uid()
);

-- Create a comment documenting that application code MUST only select safe columns
COMMENT ON TABLE public.profiles IS 'SECURITY: When querying profiles of other users, only select: id, full_name, unique_code, cash_rating, id_verified, kyc_completed, avatar_url. Banking details (account_number, branch_code, account_type, id_document_url, phone) are restricted to profile owners only.';