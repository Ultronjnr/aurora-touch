-- Add transaction fee to handshakes table
ALTER TABLE public.handshakes 
ADD COLUMN IF NOT EXISTS transaction_fee NUMERIC DEFAULT 0.00;

-- Add transaction fee percentage (5% default)
COMMENT ON COLUMN public.handshakes.transaction_fee IS 'Fee charged for this transaction (calculated as percentage of amount)';

-- Update existing handshakes to have 0 fee
UPDATE public.handshakes 
SET transaction_fee = 0.00 
WHERE transaction_fee IS NULL;