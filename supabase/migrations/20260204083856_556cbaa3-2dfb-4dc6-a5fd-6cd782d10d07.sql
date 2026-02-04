-- Fix update_cash_rating to validate caller authorization
-- Only allow the function to be called for users involved in a handshake with the caller
CREATE OR REPLACE FUNCTION public.update_cash_rating(user_id UUID, days_late INTEGER)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_rating DECIMAL := 100.00;
  penalty DECIMAL;
  new_rating DECIMAL;
  caller_id UUID;
BEGIN
  -- Get the caller's ID
  caller_id := auth.uid();
  
  -- Only allow if caller is involved in a handshake with the target user
  -- Or if caller is the service role (for system operations like cron jobs)
  IF caller_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM handshakes 
      WHERE (requester_id = user_id OR supporter_id = user_id)
        AND (requester_id = caller_id OR supporter_id = caller_id)
    ) THEN
      RAISE EXCEPTION 'Unauthorized: You are not involved in a handshake with this user';
    END IF;
  END IF;
  
  -- Calculate the penalty and new rating
  penalty := days_late * 0.5;
  new_rating := GREATEST(0, base_rating - penalty);
  
  UPDATE public.profiles
  SET cash_rating = new_rating, updated_at = NOW()
  WHERE id = user_id;
  
  RETURN new_rating;
END;
$$;

-- Fix check_payment_reminders to only work for service role
CREATE OR REPLACE FUNCTION public.check_payment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reminder_handshake RECORD;
  caller_role TEXT;
BEGIN
  -- Get caller role from JWT claims if available
  BEGIN
    caller_role := current_setting('request.jwt.claims', true)::json->>'role';
  EXCEPTION WHEN OTHERS THEN
    caller_role := NULL;
  END;
  
  -- Only allow service_role or when called by triggers/internal processes (no auth context)
  IF caller_role IS NOT NULL AND caller_role != 'service_role' THEN
    RAISE EXCEPTION 'This function can only be called by service role';
  END IF;

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

-- Fix check_overdue_payments to only work for service role
CREATE OR REPLACE FUNCTION public.check_overdue_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  overdue_handshake RECORD;
  caller_role TEXT;
BEGIN
  -- Get caller role from JWT claims if available
  BEGIN
    caller_role := current_setting('request.jwt.claims', true)::json->>'role';
  EXCEPTION WHEN OTHERS THEN
    caller_role := NULL;
  END;
  
  -- Only allow service_role or when called by triggers/internal processes (no auth context)
  IF caller_role IS NOT NULL AND caller_role != 'service_role' THEN
    RAISE EXCEPTION 'This function can only be called by service role';
  END IF;

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