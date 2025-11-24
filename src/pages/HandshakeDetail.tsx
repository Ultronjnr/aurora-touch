import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  TrendingUp, 
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Check,
  X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HandshakeData {
  id: string;
  amount: number;
  payback_day: string;
  status: string;
  days_late: number;
  late_fee: number;
  requester_id: string;
  supporter_id: string;
  requester: {
    full_name: string;
    unique_code: string;
  };
  supporter: {
    full_name: string;
    unique_code: string;
  };
}

const HandshakeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [handshake, setHandshake] = useState<HandshakeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchHandshake();
  }, [id, user]);

  const fetchHandshake = async () => {
    try {
      const { data, error } = await supabase
        .from('handshakes')
        .select(`
          *,
          requester:requester_id(full_name, unique_code),
          supporter:supporter_id(full_name, unique_code)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setHandshake(data as any);
    } catch (error: any) {
      toast.error("Error loading handshake details");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!handshake) return;

    setActionLoading(true);

    try {
      // Update handshake status
      const { error: updateError } = await supabase
        .from('handshakes')
        .update({ status: 'approved' })
        .eq('id', handshake.id);

      if (updateError) throw updateError;

      // Get requester's email
      const { data: { user: requesterUser }, error: userError } = await supabase.auth.admin.getUserById(
        handshake.requester_id
      );

      if (!userError && requesterUser?.email) {
        // Send approval notification
        try {
          await supabase.functions.invoke('send-handshake-notification', {
            body: {
              type: 'handshake_approved',
              handshakeId: handshake.id,
              recipientEmail: requesterUser.email,
              recipientName: handshake.requester.full_name,
              data: {
                amount: handshake.amount,
                supporterName: handshake.supporter.full_name,
                paybackDate: handshake.payback_day,
              }
            }
          });
        } catch (emailError) {
          console.error('Email notification failed:', emailError);
        }
      }

      toast.success("Handshake approved!");
      fetchHandshake();
    } catch (error: any) {
      toast.error("Error approving handshake", {
        description: error.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!handshake) return;

    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('handshakes')
        .update({ status: 'rejected' })
        .eq('id', handshake.id);

      if (error) throw error;

      toast.success("Handshake rejected");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error("Error rejecting handshake", {
        description: error.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!handshake) {
    return null;
  }

  const paybackDate = new Date(handshake.payback_day);
  const today = new Date();
  const daysUntilDue = Math.ceil((paybackDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const progressPercent = daysUntilDue > 0 ? ((30 - daysUntilDue) / 30) * 100 : 100;
  const isSupporter = user?.id === handshake.supporter_id;
  const isPending = handshake.status === 'pending';

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
        <h1 className="text-2xl font-bold">Handshake Details</h1>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        {/* Amount Card */}
        <GlassCard className="text-center animate-scale-in">
          <div className="text-sm text-foreground/60 mb-2">Total Amount</div>
          <div className="text-5xl font-bold gradient-text mb-4">
            R {handshake.amount}
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border ${
            handshake.status === "approved" || handshake.status === "active"
              ? "bg-green-500/20 text-green-400 border-green-500/30" 
              : handshake.status === "pending"
              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              : handshake.status === "completed"
              ? "bg-secondary/20 text-secondary border-secondary/30"
              : "bg-destructive/20 text-destructive border-destructive/30"
          }`}>
            {handshake.status === "approved" || handshake.status === "active" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="capitalize">{handshake.status}</span>
          </div>
        </GlassCard>

        {/* Progress Card */}
        {daysUntilDue > 0 && handshake.status !== 'completed' && (
          <GlassCard className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-foreground/60">Time until Payback Day</span>
              <span className="font-semibold">{daysUntilDue} days</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </GlassCard>
        )}

        {/* Details Cards */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="animate-slide-in-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-secondary/20">
                <User className="w-5 h-5 text-secondary" />
              </div>
              <div className="text-sm text-foreground/60">
                {isSupporter ? "Requester" : "Supporter"}
              </div>
            </div>
            <div className="font-semibold">
              {isSupporter ? handshake.requester.full_name : handshake.supporter.full_name}
            </div>
            <div className="text-xs text-foreground/60 font-mono mt-1">
              {isSupporter ? handshake.requester.unique_code : handshake.supporter.unique_code}
            </div>
          </GlassCard>

          <GlassCard className="animate-slide-in-right">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-secondary/20">
                <Calendar className="w-5 h-5 text-secondary" />
              </div>
              <div className="text-sm text-foreground/60">Payback Day</div>
            </div>
            <div className="font-semibold text-sm">
              {paybackDate.toLocaleDateString('en-ZA', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </GlassCard>
        </div>

        {/* Impact Cards */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="animate-slide-in-left" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-sm text-foreground/60">Days Late</div>
            </div>
            <div className="font-semibold text-yellow-400">{handshake.days_late || 0}</div>
          </GlassCard>

          <GlassCard className="animate-slide-in-right" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-destructive/20">
                <TrendingUp className="w-5 h-5 text-destructive" />
              </div>
              <div className="text-sm text-foreground/60">Late Fee</div>
            </div>
            <div className="font-semibold">R {handshake.late_fee || 0}</div>
          </GlassCard>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          {/* Supporter pending actions */}
          {isSupporter && isPending && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Check className="w-5 h-5 mr-2" />
                {actionLoading ? "Approving..." : "Approve"}
              </Button>

              <Button
                onClick={handleReject}
                disabled={actionLoading}
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10 py-6 rounded-xl transition-all"
              >
                <X className="w-5 h-5 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {/* Requester payment button */}
          {!isSupporter && (handshake.status === 'approved' || handshake.status === 'active') && (
            <Button
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Make Payment
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full border-border/50 hover:bg-muted/50 py-6 rounded-xl transition-all"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Message {isSupporter ? "Requester" : "Supporter"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HandshakeDetail;
