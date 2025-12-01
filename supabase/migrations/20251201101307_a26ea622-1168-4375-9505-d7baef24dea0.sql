-- Add amount_paid column to track total payments made
ALTER TABLE public.handshakes 
ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0;

-- Create index for faster payment queries
CREATE INDEX IF NOT EXISTS idx_payments_handshake_id ON public.payments(handshake_id);

-- Create a function to calculate outstanding balance
CREATE OR REPLACE FUNCTION public.get_outstanding_balance(handshake_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_amount numeric;
  total_paid numeric;
  transaction_fee numeric;
  late_fee numeric;
BEGIN
  SELECT h.amount, h.transaction_fee, h.late_fee, COALESCE(h.amount_paid, 0)
  INTO total_amount, transaction_fee, late_fee, total_paid
  FROM handshakes h
  WHERE h.id = handshake_id;
  
  RETURN (total_amount + transaction_fee + late_fee) - total_paid;
END;
$$;

-- Create a function to update amount_paid when payment is made
CREATE OR REPLACE FUNCTION public.update_handshake_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paid numeric;
  total_due numeric;
BEGIN
  -- Calculate total paid for this handshake
  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid
  FROM payments
  WHERE handshake_id = NEW.handshake_id
    AND payment_status = 'completed';
  
  -- Update amount_paid on handshake
  UPDATE handshakes
  SET amount_paid = total_paid,
      status = CASE 
        WHEN total_paid >= (amount + transaction_fee + late_fee) THEN 'completed'
        WHEN status = 'approved' AND total_paid > 0 THEN 'active'
        ELSE status
      END,
      completed_at = CASE
        WHEN total_paid >= (amount + transaction_fee + late_fee) THEN NOW()
        ELSE completed_at
      END
  WHERE id = NEW.handshake_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update handshake when payment is made
DROP TRIGGER IF EXISTS trigger_update_handshake_payment ON public.payments;
CREATE TRIGGER trigger_update_handshake_payment
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_handshake_payment();

COMMENT ON COLUMN public.handshakes.amount_paid IS 'Total amount paid so far including partial payments';
COMMENT ON FUNCTION public.get_outstanding_balance IS 'Calculate remaining balance including fees';
COMMENT ON FUNCTION public.update_handshake_payment IS 'Auto-update handshake status and amount_paid when payments are made';