-- Add net_amount_received to handshakes
ALTER TABLE public.handshakes
  ADD COLUMN IF NOT EXISTS net_amount_received numeric DEFAULT 0;

-- Create platform_earnings table for revenue tracking
CREATE TABLE IF NOT EXISTS public.platform_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handshake_id uuid NOT NULL REFERENCES public.handshakes(id),
  fee_amount numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;

-- Only service role / admin can insert (via edge functions)
-- No public access policies — data is written server-side only
-- Admin users can read via role check
CREATE POLICY "Admins can view platform earnings"
  ON public.platform_earnings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'supporter'
    )
    AND
    EXISTS (
      SELECT 1 FROM public.has_role(auth.uid(), 'supporter')
    )
  );