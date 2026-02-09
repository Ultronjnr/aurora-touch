-- Add fee and net_amount columns to payments table for revenue tracking
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric DEFAULT 0;