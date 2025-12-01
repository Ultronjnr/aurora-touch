-- Add penalty agreement columns to handshakes table
ALTER TABLE public.handshakes 
ADD COLUMN IF NOT EXISTS penalty_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS penalty_type text CHECK (penalty_type IN ('fixed', 'percentage')),
ADD COLUMN IF NOT EXISTS penalty_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS grace_period_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalty_accepted boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.handshakes.penalty_enabled IS 'Whether late payment penalty is enabled';
COMMENT ON COLUMN public.handshakes.penalty_type IS 'Type of penalty: fixed amount or percentage';
COMMENT ON COLUMN public.handshakes.penalty_amount IS 'Penalty amount (fixed rand value or percentage value)';
COMMENT ON COLUMN public.handshakes.grace_period_days IS 'Number of days grace period before penalty applies';
COMMENT ON COLUMN public.handshakes.penalty_accepted IS 'Whether requester has accepted the penalty terms';