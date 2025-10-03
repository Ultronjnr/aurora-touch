import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  User, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Crown
} from "lucide-react";
import logo from "@/assets/cashme-logo.png";

interface Handshake {
  id: string;
  amount: number;
  supporter: string;
  requester: string;
  paybackDay: string;
  status: "pending" | "approved" | "completed" | "overdue";
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [cashRating] = useState(750);
  const [handshakes] = useState<Handshake[]>([
    {
      id: "1",
      amount: 500,
      supporter: "Sarah M.",
      requester: "You",
      paybackDay: "2025-10-15",
      status: "approved",
    },
    {
      id: "2",
      amount: 1000,
      supporter: "Mike T.",
      requester: "You",
      paybackDay: "2025-10-20",
      status: "pending",
    },
    {
      id: "3",
      amount: 750,
      supporter: "Lisa K.",
      requester: "You",
      paybackDay: "2025-09-28",
      status: "completed",
    },
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case "approved":
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-secondary" />;
      case "overdue":
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
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "completed":
        return "bg-secondary/20 text-secondary border-secondary/30";
      case "overdue":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "";
    }
  };

  const pending = handshakes.filter((h) => h.status === "pending" || h.status === "approved");
  const completed = handshakes.filter((h) => h.status === "completed");

  return (
    <div className="min-h-screen p-6 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 animate-slide-up">
        <img src={logo} alt="CashMe" className="w-16 h-16" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile")}
          className="hover:bg-muted/50"
        >
          <User className="w-6 h-6" />
        </Button>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        {/* Cash Rating Card */}
        <GlassCard className="animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-foreground/60 mb-1">Your Cash Rating</div>
              <div className="text-4xl font-bold gradient-text">{cashRating}</div>
            </div>
            <div className="p-4 rounded-full bg-secondary/20">
              <TrendingUp className="w-8 h-8 text-secondary" />
            </div>
          </div>
          <Progress value={(cashRating / 1000) * 100} className="h-2 mb-2" />
          <div className="text-xs text-foreground/60">Excellent rating! Keep it up.</div>
        </GlassCard>

        {/* Premium Banner */}
        <GlassCard hover className="bg-gradient-to-r from-primary/50 to-secondary/50 border-secondary/30 animate-slide-in-right">
          <div className="flex items-center gap-4">
            <Crown className="w-10 h-10 text-secondary" />
            <div className="flex-1">
              <div className="font-semibold mb-1">Upgrade to Premium</div>
              <div className="text-sm text-foreground/70">
                Enable Auto Payback & advanced analytics
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Pending Handshakes */}
        {pending.length > 0 && (
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-secondary" />
              Active Handshakes
            </h2>
            {pending.map((handshake) => (
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
                    <span>Supporter:</span>
                    <span className="font-medium text-foreground">{handshake.supporter}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payback Day:</span>
                    <span className="font-medium text-foreground">{handshake.paybackDay}</span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Completed Handshakes */}
        {completed.length > 0 && (
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-secondary" />
              Completed Handshakes
            </h2>
            {completed.map((handshake) => (
              <GlassCard key={handshake.id} className="opacity-70">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">R {handshake.amount}</div>
                    <div className="text-sm text-foreground/60">{handshake.supporter}</div>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-secondary" />
                </div>
              </GlassCard>
            ))}
          </div>
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
