-- Fix function search paths for security

-- Fix generate_unique_code function
CREATE OR REPLACE FUNCTION generate_unique_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..5 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Fix update_cash_rating function
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
BEGIN
  penalty := days_late * 0.5;
  new_rating := GREATEST(0, base_rating - penalty);
  
  UPDATE public.profiles
  SET cash_rating = new_rating, updated_at = NOW()
  WHERE id = user_id;
  
  RETURN new_rating;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;