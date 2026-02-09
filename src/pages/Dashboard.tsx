import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  User, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Wallet,
  HandshakeIcon
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/cashme-logo.png";
import { UpcomingPayments } from "@/components/UpcomingPayments";
import { BorrowerAnalytics } from "@/components/BorrowerAnalytics";
import { CashRatingBreakdown } from "@/components/CashRatingBreakdown";
import { IncomingHandshakeRequests } from "@/components/IncomingHandshakeRequests";
import { ExpectedIncomeTracker } from "@/components/ExpectedIncomeTracker";
import { LendingAnalytics } from "@/components/LendingAnalytics";
import { NotificationBell } from "@/components/NotificationBell";

interface Profile {
  unique_code: string;
  full_name: string;
  cash_rating: number;
  kyc_completed: boolean;
}

interface Handshake {
  id: string;
  amount: number;
  payback_day: string;
  status: string;
  auto_payback: boolean;
  supporter: { full_name: string; unique_code: string };
  requester: { full_name: string; unique_code: string };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [handshakes, setHandshakes] = useState<Handshake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchProfile();
      fetchHandshakes();
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('unique_code, full_name, cash_rating, kyc_completed')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      
      // Redirect to KYC if not completed
      if (!data.kyc_completed) {
        navigate("/kyc");
      }
    } catch (error: any) {
      toast.error("Error loading profile");
    }
  };

  const fetchHandshakes = async () => {
    try {
      const { data, error } = await supabase
        .from('handshakes')
        .select('id, amount, payback_day, status, auto_payback, supporter_id, requester_id')
        .or(`requester_id.eq.${user?.id},supporter_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch safe partner profiles in batch (no banking details exposed)
      const profileIds = [...new Set((data || []).flatMap(h => [h.requester_id, h.supporter_id]))];
      const { data: profiles } = await supabase.rpc('get_safe_profiles_batch', { profile_ids: profileIds });
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const enriched = (data || []).map(h => ({
        ...h,
        requester: profileMap.get(h.requester_id) || { full_name: 'Unknown', unique_code: '' },
        supporter: profileMap.get(h.supporter_id) || { full_name: 'Unknown', unique_code: '' },
      }));

      setHandshakes(enriched as any);
    } catch (error: any) {
      toast.error("Error loading handshakes");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case "approved":
      case "active":
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-secondary" />;
      case "defaulted":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "approved":
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "completed":
        return "bg-secondary/20 text-secondary border-secondary/30";
      case "defaulted":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "";
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const activeHandshakes = handshakes.filter(h => ["pending", "approved", "active"].includes(h.status));
  const completedHandshakes = handshakes.filter(h => h.status === "completed");
  
  // Separate handshakes by role - borrower = where user is requester, lender = where user is supporter
  const borrowerHandshakes = activeHandshakes.filter(h => h.requester?.unique_code === profile?.unique_code);
  const lenderHandshakes = activeHandshakes.filter(h => h.supporter?.unique_code === profile?.unique_code);

  return (
    <div className="min-h-screen p-6 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 animate-slide-up">
        <img src={logo} alt="CashMe" className="w-16 h-16" />
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-foreground/60">Your Code</div>
            <div className="font-mono font-bold text-secondary">{profile?.unique_code}</div>
          </div>
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
            className="hover:bg-muted/50"
          >
            <User className="w-6 h-6" />
          </Button>
        </div>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        {/* Role Tabs */}
        <Tabs defaultValue="borrower" className="w-full animate-slide-up">
          <TabsList className="grid w-full grid-cols-2 glass">
            <TabsTrigger value="borrower" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Borrower
            </TabsTrigger>
            <TabsTrigger value="lender" className="flex items-center gap-2">
              <HandshakeIcon className="w-4 h-4" />
              Lender
            </TabsTrigger>
          </TabsList>

          {/* Borrower View */}
          <TabsContent value="borrower" className="space-y-6 mt-6">
            {/* Partial Payments Info */}
            <GlassCard className="bg-secondary/5 border-secondary/30 animate-slide-down">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-secondary/20">
                  <Wallet className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">Flexible Repayments</div>
                  <div className="text-xs text-foreground/70">
                    Pay in chunks! Make partial payments anytime - R20 today, R50 tomorrow. Your outstanding balance updates automatically.
                  </div>
                </div>
              </div>
            </GlassCard>

        {/* Cash Rating Card */}
        <GlassCard className="animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-foreground/60 mb-1">Your Cash Rating</div>
              <div className="text-4xl font-bold gradient-text">
                {profile?.cash_rating?.toFixed(0) || 100}
              </div>
            </div>
            <div className="p-4 rounded-full bg-secondary/20">
              <TrendingUp className="w-8 h-8 text-secondary" />
            </div>
          </div>
          <Progress value={profile?.cash_rating || 100} className="h-2 mb-2" />
          <div className="text-xs text-foreground/60">
            {(profile?.cash_rating || 100) >= 90 ? "Excellent rating!" : "Keep building your rating"}
          </div>
        </GlassCard>

        {/* Upcoming Payments - Requester only */}
        {user && <UpcomingPayments userId={user.id} />}

        {/* Borrower Analytics - Requester only */}
        {user && <BorrowerAnalytics userId={user.id} />}

        {/* Cash Rating Breakdown */}
        {user && profile && (
          <CashRatingBreakdown userId={user.id} cashRating={profile.cash_rating || 100} />
        )}

            {/* Pay-as-you-go Info */}
            <GlassCard className="bg-gradient-to-r from-primary/20 to-secondary/20 border-secondary/30 animate-slide-in-right">
              <div className="flex items-center gap-4">
                <TrendingUp className="w-10 h-10 text-secondary" />
                <div className="flex-1">
                  <div className="font-semibold mb-1">Pay-as-you-go</div>
                  <div className="text-sm text-foreground/70">
                    3.5% fee per transaction - only pay when you transact
                  </div>
                </div>
              </div>
            </GlassCard>
          </TabsContent>

          {/* Lender View */}
          <TabsContent value="lender" className="space-y-6 mt-6">
            {/* Partial Payments Info */}
            <GlassCard className="bg-secondary/5 border-secondary/30 animate-slide-down">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-secondary/20">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">Track Partial Repayments</div>
                  <div className="text-xs text-foreground/70">
                    Borrowers can repay in installments. View real-time progress and outstanding balances for each handshake.
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Incoming Requests */}
            {user && <IncomingHandshakeRequests userId={user.id} />}

            {/* Expected Income */}
            {user && <ExpectedIncomeTracker userId={user.id} />}

            {/* Lending Analytics */}
            {user && <LendingAnalytics userId={user.id} />}

            {/* Pay-as-you-go Info */}
            <GlassCard className="bg-gradient-to-r from-primary/20 to-secondary/20 border-secondary/30">
              <div className="flex items-center gap-4">
                <HandshakeIcon className="w-10 h-10 text-secondary" />
                <div className="flex-1">
                  <div className="font-semibold mb-1">Earn as you lend</div>
                  <div className="text-sm text-foreground/70">
                    Requesters pay a 3.5% transaction fee on each loan
                  </div>
                </div>
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>

        {/* Active Handshakes */}
        {activeHandshakes.length > 0 && (
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-secondary" />
              Active Handshakes
            </h2>
            {activeHandshakes.map((handshake) => (
              <GlassCard
                key={handshake.id}
                hover
                onClick={() => navigate(`/handshake/${handshake.id}`)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-lg">R {handshake.amount}</div>
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs border ${getStatusColor(handshake.status)}`}>
                    {getStatusIcon(handshake.status)}
                    <span className="capitalize">{handshake.status}</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-foreground/70">
                  <div className="flex justify-between">
                    <span>With:</span>
                    <span className="font-medium text-foreground">
                      {handshake.supporter?.full_name} ({handshake.supporter?.unique_code})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payback Day:</span>
                    <span className="font-medium text-foreground">
                      {new Date(handshake.payback_day).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Completed Handshakes */}
        {completedHandshakes.length > 0 && (
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-secondary" />
              Completed Handshakes
            </h2>
            {completedHandshakes.map((handshake) => (
              <GlassCard key={handshake.id} className="opacity-70">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">R {handshake.amount}</div>
                    <div className="text-sm text-foreground/60">
                      {handshake.supporter?.full_name} ({handshake.supporter?.unique_code})
                    </div>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-secondary" />
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {activeHandshakes.length === 0 && completedHandshakes.length === 0 && (
          <GlassCard className="text-center py-12">
            <p className="text-foreground/60">No handshakes yet. Create your first one!</p>
          </GlassCard>
        )}
      </div>

      {/* Floating Action Button */}
      <Button
        onClick={() => navigate("/create-handshake")}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-2xl hover:scale-110 transition-all duration-300 glow-cyan"
      >
        <Plus className="w-8 h-8" />
      </Button>
    </div>
  );
};

export default Dashboard;
