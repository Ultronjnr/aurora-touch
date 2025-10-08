import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const VerifyEmail = () => {
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setEmail(localStorage.getItem('pending_email'));
  }, []);

  const verify = async () => {
    if (!email || code.length < 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
      if (error) throw error;
      toast({ title: 'Email verified', description: 'You can now log in.' });
      navigate('/auth');
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
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      toast({ title: 'Confirmation sent', description: `We re-sent the code/link to ${email}` });
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
