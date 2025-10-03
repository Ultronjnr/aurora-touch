import { useNavigate, useParams } from "react-router-dom";
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
  AlertCircle
} from "lucide-react";

const HandshakeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock data - in real app, fetch based on id
  const handshake = {
    id,
    amount: 500,
    supporter: "Sarah M.",
    requester: "You",
    paybackDay: "2025-10-15",
    status: "approved",
    lateFee: 0,
    cashRatingImpact: "+10",
    daysUntilDue: 12,
  };

  const progressPercent = ((30 - handshake.daysUntilDue) / 30) * 100;

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
            handshake.status === "approved" 
              ? "bg-green-500/20 text-green-400 border-green-500/30" 
              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
          }`}>
            {handshake.status === "approved" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="capitalize">{handshake.status}</span>
          </div>
        </GlassCard>

        {/* Progress Card */}
        <GlassCard className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-foreground/60">Time until Payback Day</span>
            <span className="font-semibold">{handshake.daysUntilDue} days</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </GlassCard>

        {/* Details Cards */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="animate-slide-in-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-secondary/20">
                <User className="w-5 h-5 text-secondary" />
              </div>
              <div className="text-sm text-foreground/60">Supporter</div>
            </div>
            <div className="font-semibold">{handshake.supporter}</div>
          </GlassCard>

          <GlassCard className="animate-slide-in-right">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-secondary/20">
                <Calendar className="w-5 h-5 text-secondary" />
              </div>
              <div className="text-sm text-foreground/60">Payback Day</div>
            </div>
            <div className="font-semibold text-sm">{handshake.paybackDay}</div>
          </GlassCard>
        </div>

        {/* Impact Cards */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="animate-slide-in-left" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-sm text-foreground/60">Rating Impact</div>
            </div>
            <div className="font-semibold text-green-400">{handshake.cashRatingImpact}</div>
          </GlassCard>

          <GlassCard className="animate-slide-in-right" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-sm text-foreground/60">Late Fee</div>
            </div>
            <div className="font-semibold">R {handshake.lateFee}</div>
          </GlassCard>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            onClick={() => navigate("/payback")}
          >
            Make Payback
          </Button>

          <Button
            variant="outline"
            className="w-full border-border/50 hover:bg-muted/50 py-6 rounded-xl transition-all"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Message Supporter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HandshakeDetail;
