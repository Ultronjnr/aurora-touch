import { useEffect, useState } from "react";
import { GlassCard } from "./GlassCard";
import { Bell, User, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

interface HandshakeRequest {
  id: string;
  amount: number;
  payback_day: string;
  created_at: string;
  penalty_enabled: boolean;
  penalty_type: string | null;
  penalty_amount: number;
  grace_period_days: number;
  transaction_fee: number;
  requester: {
    full_name: string;
    unique_code: string;
    cash_rating: number;
  };
}

export const IncomingHandshakeRequests = ({ userId }: { userId: string }) => {
  const [requests, setRequests] = useState<HandshakeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
    
    // Set up realtime subscription for new requests
    const channel = supabase
      .channel('handshake-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'handshakes',
          filter: `supporter_id=eq.${userId}`
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('handshakes')
        .select(`
          id,
          amount,
          payback_day,
          created_at,
          penalty_enabled,
          penalty_type,
          penalty_amount,
          grace_period_days,
          transaction_fee,
          requester:requester_id(full_name, unique_code, cash_rating)
        `)
        .eq('supporter_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data as any || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (cashRating: number) => {
    if (cashRating >= 90) return { label: "Low Risk", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" };
    if (cashRating >= 70) return { label: "Medium Risk", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" };
    return { label: "High Risk", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" };
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <GlassCard>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted/50 rounded w-48" />
          <div className="h-24 bg-muted/50 rounded" />
        </div>
      </GlassCard>
    );
  }

  if (requests.length === 0) {
    return (
      <GlassCard className="text-center py-8 animate-slide-up">
        <Bell className="w-12 h-12 mx-auto mb-3 text-foreground/30" />
        <p className="text-foreground/60">No pending requests</p>
        <p className="text-sm text-foreground/40 mt-1">New handshake requests will appear here</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-secondary" />
          <h3 className="font-semibold text-lg">Incoming Requests</h3>
        </div>
        <div className="px-3 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-semibold">
          {requests.length} pending
        </div>
      </div>

      <div className="space-y-3">
        {requests.map((request) => {
          const risk = getRiskLevel(request.requester.cash_rating);
          const totalDue = request.amount + request.transaction_fee;

          return (
            <div
              key={request.id}
              className="p-4 rounded-lg border border-border/30 bg-muted/20 hover:bg-muted/30 transition-all cursor-pointer"
              onClick={() => navigate(`/handshake/${request.id}`)}
            >
              {/* Header with requester info */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/20">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {request.requester.full_name}
                    </div>
                    <div className="text-xs text-foreground/60 font-mono">
                      {request.requester.unique_code}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-foreground/60 mb-1">
                    {getTimeAgo(request.created_at)}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold border ${risk.bg} ${risk.color} ${risk.border}`}>
                    {risk.label}
                  </div>
                </div>
              </div>

              {/* Amount and rating */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="text-xs text-foreground/60 mb-1">Requested</div>
                  <div className="text-xl font-bold gradient-text">
                    R {request.amount.toFixed(2)}
                  </div>
                  <div className="text-xs text-foreground/60 mt-1">
                    +R{request.transaction_fee.toFixed(2)} fee
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                  <div className="text-xs text-foreground/60 mb-1">Cash Rating</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-bold text-secondary">
                      {request.requester.cash_rating.toFixed(0)}
                    </div>
                    <TrendingUp className="w-4 h-4 text-secondary" />
                  </div>
                  <div className="text-xs text-foreground/60 mt-1">
                    out of 100
                  </div>
                </div>
              </div>

              {/* Payback date */}
              <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-border/30">
                <div className="flex items-center gap-2 text-foreground/60">
                  <Calendar className="w-4 h-4" />
                  <span>Due date:</span>
                </div>
                <span className="font-semibold">
                  {new Date(request.payback_day).toLocaleDateString('en-ZA', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>

              {/* Penalty info if enabled */}
              {request.penalty_enabled && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-3">
                  <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <div className="text-xs text-foreground/70">
                    <span className="font-semibold">Penalty set:</span>{' '}
                    {request.penalty_type === 'fixed' 
                      ? `R${request.penalty_amount}/day`
                      : `${request.penalty_amount}%/day`}
                    {request.grace_period_days > 0 && ` (${request.grace_period_days} day grace)`}
                  </div>
                </div>
              )}

              {/* Action button */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/handshake/${request.id}`);
                }}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white"
              >
                Review Request
              </Button>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};