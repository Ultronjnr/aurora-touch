-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('requester', 'supporter');

-- Create profiles table with unique 5-character codes
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unique_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  cash_rating DECIMAL(5,2) DEFAULT 100.00,
  subscription_active BOOLEAN DEFAULT FALSE,
  id_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create handshakes (lending records) table
CREATE TABLE public.handshakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  supporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payback_day DATE NOT NULL,
  auto_payback BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'defaulted')),
  late_fee DECIMAL(12,2) DEFAULT 0.00,
  days_late INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handshake_id UUID REFERENCES public.handshakes(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('card', 'eft', 'cash')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  transaction_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  handshake_id UUID REFERENCES public.handshakes(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('reminder', 'approval', 'payment', 'late')),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to generate unique 5-character code
CREATE OR REPLACE FUNCTION generate_unique_code()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Generate unique code
  LOOP
    new_code := generate_unique_code();
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE unique_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Insert profile
  INSERT INTO public.profiles (id, unique_code, full_name, phone)
  VALUES (
    NEW.id,
    new_code,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to update cash rating
CREATE OR REPLACE FUNCTION public.update_cash_rating(user_id UUID, days_late INTEGER)
RETURNS DECIMAL AS $$
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
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_handshakes_updated_at BEFORE UPDATE ON public.handshakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handshakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for handshakes
CREATE POLICY "Users can view handshakes they're involved in"
  ON public.handshakes FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = supporter_id);

CREATE POLICY "Requesters can create handshakes"
  ON public.handshakes FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update handshakes they're involved in"
  ON public.handshakes FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = supporter_id);

-- RLS Policies for payments
CREATE POLICY "Users can view payments for their handshakes"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.handshakes
      WHERE id = handshake_id
      AND (requester_id = auth.uid() OR supporter_id = auth.uid())
    )
  );

CREATE POLICY "Users can create payments for their handshakes"
  ON public.payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.handshakes
      WHERE id = handshake_id
      AND (requester_id = auth.uid() OR supporter_id = auth.uid())
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (TRUE);