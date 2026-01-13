-- Fix 1: Remove the overly permissive notifications INSERT policy
-- Edge Functions use service role which bypasses RLS, so this policy is unnecessary
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Add proper user-scoped policy for client-side notification creation (if needed)
CREATE POLICY "Users can create own notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Fix 2: Add CHECK constraints for financial inputs to prevent invalid data
-- These enforce validation at the database level to prevent API manipulation

-- Handshakes table constraints
ALTER TABLE public.handshakes
ADD CONSTRAINT check_amount_positive CHECK (amount > 0),
ADD CONSTRAINT check_amount_reasonable CHECK (amount <= 1000000),
ADD CONSTRAINT check_transaction_fee_valid CHECK (transaction_fee IS NULL OR transaction_fee >= 0),
ADD CONSTRAINT check_late_fee_valid CHECK (late_fee IS NULL OR late_fee >= 0),
ADD CONSTRAINT check_amount_paid_valid CHECK (amount_paid IS NULL OR amount_paid >= 0),
ADD CONSTRAINT check_penalty_amount_valid CHECK (penalty_amount IS NULL OR penalty_amount >= 0),
ADD CONSTRAINT check_grace_period_valid CHECK (grace_period_days IS NULL OR (grace_period_days >= 0 AND grace_period_days <= 90)),
ADD CONSTRAINT check_days_late_valid CHECK (days_late IS NULL OR days_late >= 0);

-- Payments table constraints
ALTER TABLE public.payments
ADD CONSTRAINT check_payment_amount_positive CHECK (amount > 0),
ADD CONSTRAINT check_payment_amount_reasonable CHECK (amount <= 1000000);