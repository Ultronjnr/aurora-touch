-- Revoke public access to payment reminder functions
-- These should only be called by Edge Functions via service role

REVOKE EXECUTE ON FUNCTION public.check_payment_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_payment_reminders() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_payment_reminders() FROM anon;

REVOKE EXECUTE ON FUNCTION public.check_overdue_payments() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_overdue_payments() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_overdue_payments() FROM anon;