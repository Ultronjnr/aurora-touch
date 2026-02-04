-- Fix the SECURITY DEFINER view issue by dropping it
-- We will rely on application-level field selection + RLS policies instead
DROP VIEW IF EXISTS public.safe_profile_view;