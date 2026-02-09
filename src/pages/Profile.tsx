import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  TrendingUp, 
  Settings,
  LogOut,
  Copy,
  Check
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserProfile {
  unique_code: string;
  full_name: string;
  phone: string;
  cash_rating: number;
  id_verified: boolean;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchProfile();
      fetchRoles();
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    try {
      // Only fetch fields that are actually displayed on the profile page
      // Excludes sensitive banking details (account_number, branch_code, id_document_url)
      const { data, error } = await supabase
        .from('profiles')
        .select('unique_code, full_name, phone, cash_rating, id_verified, kyc_completed, avatar_url')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast.error("Error loading profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id);

      if (error) throw error;
      setRoles(data?.map(r => r.role) || []);
    } catch (error: any) {
      console.error("Error loading roles");
    }
  };

  const copyCode = () => {
    if (profile?.unique_code) {
      navigator.clipboard.writeText(profile.unique_code);
      setCopied(true);
      toast.success("Unique code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8 animate-slide-up">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="hover:bg-muted/50"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-2xl font-bold">Profile</h1>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        {/* Profile Header */}
        <GlassCard className="text-center animate-scale-in">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-secondary/50">
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-secondary text-white">
                  {profile?.full_name?.split(" ").map(n => n[0]).join("") || "U"}
                </AvatarFallback>
              </Avatar>
              {profile?.id_verified && (
                <div className="absolute -bottom-2 -right-2 p-2 rounded-full bg-secondary glow-cyan">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-1">{profile?.full_name}</h2>
          <div className="text-sm text-foreground/60 mb-4 capitalize">
            {roles.join(", ") || "User"}
          </div>
          
          {/* Unique Code */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="font-mono text-2xl font-bold text-secondary">
              {profile?.unique_code}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyCode}
              className="hover:bg-muted/50"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          {profile?.id_verified && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-secondary text-sm">
              <Shield className="w-4 h-4" />
              Quick ID Verified
            </div>
          )}
        </GlassCard>

        {/* Cash Rating */}
        <GlassCard className="animate-slide-in-right">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground/60">Cash Rating</div>
              <div className="text-3xl font-bold gradient-text">
                {profile?.cash_rating?.toFixed(0) || 100}
              </div>
            </div>
            <div className="p-3 rounded-full bg-secondary/20">
              <Shield className="w-8 h-8 text-secondary" />
            </div>
          </div>
        </GlassCard>

        {/* Pay-as-you-go Card */}
        <GlassCard className="bg-gradient-to-r from-primary/20 to-secondary/20 border-secondary/30 animate-slide-in-right">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-secondary/30">
              <TrendingUp className="w-8 h-8 text-secondary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg mb-1">Pay-as-you-go</div>
              <div className="text-sm text-foreground/80">
                3.5% transaction fee - only pay when you make handshakes
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Info Cards */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <Mail className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="text-sm text-foreground/60">Email</div>
                <div className="font-medium">{user?.email}</div>
              </div>
            </div>
          </GlassCard>

          {profile?.phone && (
            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <Phone className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <div className="text-sm text-foreground/60">Phone</div>
                  <div className="font-medium">{profile.phone}</div>
                </div>
              </div>
            </GlassCard>
          )}

          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <User className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="text-sm text-foreground/60">Account Type</div>
                <div className="font-medium capitalize">{roles.join(", ") || "User"}</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-border/50 hover:bg-muted/50 py-6 rounded-xl transition-all"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-destructive/50 text-destructive hover:bg-destructive/10 py-6 rounded-xl transition-all"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
