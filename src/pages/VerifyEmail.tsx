import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const VerifyEmail = () => {
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('pending_email');
    setEmail(savedEmail);
    if (!savedEmail) {
      navigate('/auth');
    }
  }, [navigate]);

  const verify = async () => {
    if (!email || code.length < 6) return;
    setLoading(true);
    try {
      const verifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/auth-verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token: code, type: 'signup' })
      });

      const data = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(data.error?.message || 'Verification failed');
      }

      // Set session with returned tokens
      if (data.access_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token || '',
        });
        if (sessionError) throw sessionError;
      }

      toast({ title: 'Email verified', description: 'Welcome to CashMe!' });
      localStorage.removeItem('pending_email');
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Verification failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const resendResponse = await fetch(`${SUPABASE_URL}/functions/v1/auth-resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'signup', email })
      });

      const data = await resendResponse.json();

      if (!resendResponse.ok) {
        throw new Error(data.error?.message || 'Resend failed');
      }

      toast({ title: 'Confirmation sent', description: `We re-sent the code to ${email}` });
    } catch (err: any) {
      toast({ title: 'Resend failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <GlassCard>
          <h1 className="text-2xl font-bold mb-2">Confirm your email</h1>
          <p className="text-foreground/80 mb-6">Enter the 6‑digit code we sent to {email || 'your email'}.</p>

          <div className="flex justify-center mb-4">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="space-y-3">
            <Button onClick={verify} disabled={loading || code.length < 6} className="w-full bg-gradient-to-r from-primary to-secondary text-white">
              {loading ? 'Verifying...' : 'Verify code'}
            </Button>
            <Button variant="outline" onClick={resend} disabled={loading || !email} className="w-full">Resend code</Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default VerifyEmail;
