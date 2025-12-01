-- Update notifications table to support more notification types and data
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Notification',
ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS action_url text;

-- Update RLS policy to allow users to mark notifications as read
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to send payment reminders (2 days before due)
CREATE OR REPLACE FUNCTION public.check_payment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reminder_handshake RECORD;
BEGIN
  -- Find handshakes due in 2 days that are approved or active
  FOR reminder_handshake IN
    SELECT h.id, h.requester_id, h.supporter_id, h.amount, h.payback_day,
           r.full_name as requester_name, s.full_name as supporter_name,
           h.amount_paid, h.transaction_fee, h.late_fee
    FROM handshakes h
    JOIN profiles r ON r.id = h.requester_id
    JOIN profiles s ON s.id = h.supporter_id
    WHERE h.status IN ('approved', 'active')
      AND h.payback_day = CURRENT_DATE + INTERVAL '2 days'
      AND NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE handshake_id = h.id 
        AND type = 'payment_reminder'
        AND sent_at > CURRENT_DATE
      )
  LOOP
    -- Calculate outstanding balance
    DECLARE
      outstanding numeric;
    BEGIN
      outstanding := (reminder_handshake.amount + 
                     COALESCE(reminder_handshake.transaction_fee, 0) + 
                     COALESCE(reminder_handshake.late_fee, 0) - 
                     COALESCE(reminder_handshake.amount_paid, 0));
      
      -- Create notification for requester
      INSERT INTO notifications (user_id, handshake_id, type, title, message, action_url, data)
      VALUES (
        reminder_handshake.requester_id,
        reminder_handshake.id,
        'payment_reminder',
        'Payment Due Soon',
        'Your payment to ' || reminder_handshake.supporter_name || ' is due in 2 days',
        '/handshake/' || reminder_handshake.id,
        jsonb_build_object(
          'amount', outstanding,
          'due_date', reminder_handshake.payback_day,
          'supporter_name', reminder_handshake.supporter_name
        )
      );
    END;
  END LOOP;
END;
$$;

-- Create function to check for overdue payments
CREATE OR REPLACE FUNCTION public.check_overdue_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  overdue_handshake RECORD;
BEGIN
  -- Find handshakes that are overdue
  FOR overdue_handshake IN
    SELECT h.id, h.requester_id, h.supporter_id, h.amount, h.payback_day,
           r.full_name as requester_name, s.full_name as supporter_name,
           h.amount_paid, h.transaction_fee, h.late_fee, h.days_late
    FROM handshakes h
    JOIN profiles r ON r.id = h.requester_id
    JOIN profiles s ON s.id = h.supporter_id
    WHERE h.status IN ('approved', 'active')
      AND h.payback_day < CURRENT_DATE
      AND (h.amount + COALESCE(h.transaction_fee, 0) + COALESCE(h.late_fee, 0)) > COALESCE(h.amount_paid, 0)
      AND NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE handshake_id = h.id 
        AND type = 'payment_overdue'
        AND sent_at > CURRENT_DATE
      )
  LOOP
    DECLARE
      outstanding numeric;
      days_overdue integer;
    BEGIN
      outstanding := (overdue_handshake.amount + 
                     COALESCE(overdue_handshake.transaction_fee, 0) + 
                     COALESCE(overdue_handshake.late_fee, 0) - 
                     COALESCE(overdue_handshake.amount_paid, 0));
      
      days_overdue := CURRENT_DATE - overdue_handshake.payback_day;
      
      -- Notify requester
      INSERT INTO notifications (user_id, handshake_id, type, title, message, action_url, data)
      VALUES (
        overdue_handshake.requester_id,
        overdue_handshake.id,
        'payment_overdue',
        'Payment Overdue',
        'Your payment to ' || overdue_handshake.supporter_name || ' is ' || days_overdue || ' days overdue',
        '/handshake/' || overdue_handshake.id,
        jsonb_build_object(
          'amount', outstanding,
          'days_overdue', days_overdue,
          'supporter_name', overdue_handshake.supporter_name
        )
      );
      
      -- Notify supporter
      INSERT INTO notifications (user_id, handshake_id, type, title, message, action_url, data)
      VALUES (
        overdue_handshake.supporter_id,
        overdue_handshake.id,
        'payment_overdue_lender',
        'Payment Overdue',
        overdue_handshake.requester_name || '''s payment is ' || days_overdue || ' days overdue',
        '/handshake/' || overdue_handshake.id,
        jsonb_build_object(
          'amount', outstanding,
          'days_overdue', days_overdue,
          'requester_name', overdue_handshake.requester_name
        )
      );
    END;
  END LOOP;
END;
$$;

COMMENT ON COLUMN public.notifications.title IS 'Notification title';
COMMENT ON COLUMN public.notifications.data IS 'Additional notification data as JSON';
COMMENT ON COLUMN public.notifications.action_url IS 'URL to navigate when notification is clicked';
COMMENT ON FUNCTION public.check_payment_reminders IS 'Check for payments due in 2 days and create reminders';
COMMENT ON FUNCTION public.check_overdue_payments IS 'Check for overdue payments and create alerts';