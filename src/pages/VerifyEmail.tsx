import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const VerifyEmail = () => {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setEmail(localStorage.getItem('pending_email'));
  }, []);

  const resend = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      toast({ title: 'Confirmation sent', description: `We re-sent a link to ${email}` });
    } catch (err: any) {
      toast({ title: 'Resend failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const goLogin = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <GlassCard>
          <h1 className="text-2xl font-bold mb-2">Confirm your email</h1>
          <p className="text-foreground/80 mb-6">We sent a confirmation link to {email || 'your email'}. Please confirm to continue.</p>
          <div className="space-y-3">
            <Button onClick={resend} disabled={loading || !email} className="w-full bg-gradient-to-r from-primary to-secondary text-white">
              {loading ? 'Sending...' : 'Resend confirmation email'}
            </Button>
            <Button variant="outline" onClick={goLogin} className="w-full">I have confirmed — Return to login</Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default VerifyEmail;
