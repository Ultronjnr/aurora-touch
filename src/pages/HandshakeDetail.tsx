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
  X,
  Wallet
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PaymentDialog } from "@/components/PaymentDialog";
import { PaymentHistory } from "@/components/PaymentHistory";
import { PenaltySetupDialog } from "@/components/PenaltySetupDialog";
import { PaymentSimulationDialog } from "@/components/PaymentSimulationDialog";

interface HandshakeData {
  id: string;
  amount: number;
  payback_day: string;
  status: string;
  days_late: number;
  late_fee: number;
  requester_id: string;
  supporter_id: string;
  penalty_enabled: boolean;
  penalty_type: 'fixed' | 'percentage' | null;
  penalty_amount: number;
  grace_period_days: number;
  penalty_accepted: boolean;
  transaction_fee: number;
  amount_paid: number;
  payment_status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_initiated_at: string | null;
  payment_completed_at: string | null;
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
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [penaltyDialogOpen, setPenaltyDialogOpen] = useState(false);
  const [paymentSimDialogOpen, setPaymentSimDialogOpen] = useState(false);
  const [pendingPenalty, setPendingPenalty] = useState<any>(null);

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

  const handleApproveClick = () => {
    // Open penalty setup dialog
    setPenaltyDialogOpen(true);
  };

  const handlePenaltyConfirm = async (penalty: any) => {
    if (!handshake) return;

    setPenaltyDialogOpen(false);
    setPendingPenalty(penalty);

    setActionLoading(true);

    try {
      // Update handshake with penalty terms and set status to approved
      const { error: updateError } = await supabase
        .from('handshakes')
        .update({ 
          status: 'pending', // Stay pending until payment — status transitions via ITN
          penalty_enabled: penalty.enabled,
          penalty_type: penalty.type,
          penalty_amount: penalty.amount,
          grace_period_days: penalty.gracePeriodDays,
          penalty_accepted: !penalty.enabled, // Auto-accept if no penalty
        })
        .eq('id', handshake.id);

      if (updateError) throw updateError;

      // If no penalty, proceed to payment directly
      if (!penalty.enabled) {
        setPaymentSimDialogOpen(true);
      } else {
        toast.success("Penalty terms set", {
          description: "Waiting for requester to accept terms",
        });
        fetchHandshake();
      }
    } catch (error: any) {
      toast.error("Error setting penalty terms", {
        description: error.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // PayFast redirect handles the actual payment.
    // ITN webhook will update handshake status server-side.
    // This callback is only used when the PaymentSimulationDialog
    // successfully redirects to PayFast — the status update happens
    // via the ITN handler, not client-side.
    setPaymentSimDialogOpen(false);
    toast.info("Payment initiated — status will update once confirmed by PayFast.");
    fetchHandshake();
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

  const handleAcceptPenalty = async () => {
    if (!handshake) return;

    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('handshakes')
        .update({ penalty_accepted: true })
        .eq('id', handshake.id);

      if (error) throw error;

      toast.success("Penalty terms accepted");
      fetchHandshake();
    } catch (error: any) {
      toast.error("Error accepting penalty", {
        description: error.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclinePenalty = async () => {
    if (!handshake) return;

    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('handshakes')
        .update({ status: 'rejected' })
        .eq('id', handshake.id);

      if (error) throw error;

      toast.success("Penalty terms declined. Handshake rejected.");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error("Error declining penalty", {
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <GlassCard className="text-center py-12 max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Handshake Not Found</h2>
          <p className="text-foreground/60 mb-6">
            This handshake may have been deleted or you don't have permission to view it.
          </p>
          <Button onClick={() => navigate("/dashboard")} className="bg-gradient-to-r from-primary to-secondary">
            Return to Dashboard
          </Button>
        </GlassCard>
      </div>
    );
  }

  const paybackDate = new Date(handshake.payback_day);
  const today = new Date();
  const daysUntilDue = Math.ceil((paybackDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const progressPercent = daysUntilDue > 0 ? ((30 - daysUntilDue) / 30) * 100 : 100;
  const isSupporter = user?.id === handshake.supporter_id;
  const isRequester = user?.id === handshake.requester_id;
  const isPending = handshake.status === 'pending';
  const needsPenaltyAcceptance = handshake.penalty_enabled && !handshake.penalty_accepted && isRequester && isPending;
  const needsPayment = isSupporter && isPending && handshake.penalty_accepted && handshake.payment_status === 'pending';
  
  // Calculate outstanding balance
  const totalDue = handshake.amount + (handshake.transaction_fee || 0) + (handshake.late_fee || 0);
  const amountPaid = handshake.amount_paid || 0;
  const outstandingBalance = totalDue - amountPaid;
  const paymentProgress = totalDue > 0 ? (amountPaid / totalDue) * 100 : 0;

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
          <div className="text-sm text-foreground/60 mb-2">
            {handshake.status === 'completed' ? 'Total Amount (Paid)' : 'Total Amount'}
          </div>
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

        {/* Outstanding Balance Card */}
        {handshake.status !== 'completed' && handshake.status !== 'rejected' && isRequester && (
          <GlassCard className="animate-scale-in bg-primary/5 border-primary/30" style={{ animationDelay: "0.05s" }}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Outstanding Balance</span>
                </div>
                <div className="text-2xl font-bold gradient-text">
                  R {outstandingBalance.toFixed(2)}
                </div>
              </div>
              
              <Progress value={paymentProgress} className="h-2" />
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-foreground/60">Total Due</div>
                  <div className="font-semibold">R {totalDue.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-foreground/60">Paid</div>
                  <div className="font-semibold text-green-400">R {amountPaid.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-foreground/60">Remaining</div>
                  <div className="font-semibold text-yellow-400">R {outstandingBalance.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

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

        {/* Penalty Agreement Card */}
        {handshake.penalty_enabled && (
          <GlassCard className="bg-yellow-500/5 border-yellow-500/30 animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">Penalty Agreement</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/60">Type:</span>
                <span className="font-medium capitalize">{handshake.penalty_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Amount:</span>
                <span className="font-medium">
                  {handshake.penalty_type === 'fixed' 
                    ? `R ${handshake.penalty_amount.toFixed(2)} per day` 
                    : `${handshake.penalty_amount.toFixed(1)}% per day`
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Grace Period:</span>
                <span className="font-medium">{handshake.grace_period_days} days</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/30">
                <span className="text-foreground/60">Status:</span>
                <span className={`font-medium ${handshake.penalty_accepted ? 'text-green-400' : 'text-yellow-500'}`}>
                  {handshake.penalty_accepted ? '✓ Accepted' : '⏳ Pending Acceptance'}
                </span>
              </div>
            </div>
          </GlassCard>
        )}

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
          {/* Requester penalty acceptance */}
          {needsPenaltyAcceptance && (
            <GlassCard className="bg-yellow-500/10 border-yellow-500/30 space-y-3">
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Penalty Terms Require Your Acceptance</span>
              </div>
              <p className="text-sm text-foreground/70">
                The supporter has set penalty terms for late payment. Please review and accept to proceed with this handshake.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={handleAcceptPenalty}
                  disabled={actionLoading}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Check className="w-5 h-5 mr-2" />
                  {actionLoading ? "Accepting..." : "Accept Terms"}
                </Button>

                <Button
                  onClick={handleDeclinePenalty}
                  disabled={actionLoading}
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10 py-6 rounded-xl transition-all"
                >
                  <X className="w-5 h-5 mr-2" />
                  Decline
                </Button>
              </div>
            </GlassCard>
          )}

          {/* Supporter needs to make payment */}
          {needsPayment && (
            <Button
              onClick={() => setPaymentSimDialogOpen(true)}
              disabled={actionLoading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Wallet className="w-5 h-5 mr-2" />
              Make Payment (R {(handshake.amount + handshake.transaction_fee).toFixed(2)})
            </Button>
          )}

          {/* Supporter pending actions */}
          {isSupporter && isPending && !needsPenaltyAcceptance && !needsPayment && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleApproveClick}
                disabled={actionLoading}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Check className="w-5 h-5 mr-2" />
                {actionLoading ? "Processing..." : "Approve & Set Terms"}
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
          {isRequester && !needsPenaltyAcceptance && (handshake.status === 'approved' || handshake.status === 'active') && outstandingBalance > 0 && (
            <Button
              onClick={() => setPaymentDialogOpen(true)}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Wallet className="w-5 h-5 mr-2" />
              Make Payment
            </Button>
          )}

          {/* Payment History */}
          {(handshake.status === 'active' || handshake.status === 'completed') && (
            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <PaymentHistory handshakeId={handshake.id} />
            </div>
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

      {/* Dialogs */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        handshakeId={handshake.id}
        outstandingBalance={outstandingBalance}
        onPaymentSuccess={fetchHandshake}
      />

      <PenaltySetupDialog
        open={penaltyDialogOpen}
        onClose={() => setPenaltyDialogOpen(false)}
        onConfirm={handlePenaltyConfirm}
        amount={handshake.amount}
      />

      <PaymentSimulationDialog
        open={paymentSimDialogOpen}
        onClose={() => setPaymentSimDialogOpen(false)}
        onSuccess={handlePaymentSuccess}
        amount={handshake.amount}
        transactionFee={handshake.transaction_fee}
        recipientName={handshake.requester.full_name}
        handshakeId={handshake.id}
      />
    </div>
  );
};

export default HandshakeDetail;
