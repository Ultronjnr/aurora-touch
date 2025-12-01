import { useEffect, useState } from "react";
import { GlassCard } from "./GlassCard";
import { TrendingUp, TrendingDown, DollarSign, Target, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Analytics {
  totalBorrowed: number;
  totalRepaid: number;
  onTimePayments: number;
  totalPayments: number;
  activeHandshakes: number;
}

export const BorrowerAnalytics = ({ userId }: { userId: string }) => {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalBorrowed: 0,
    totalRepaid: 0,
    onTimePayments: 0,
    totalPayments: 0,
    activeHandshakes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [userId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch all handshakes where user is requester
      const { data: handshakes, error } = await supabase
        .from('handshakes')
        .select('amount, amount_paid, status, days_late, payback_day')
        .eq('requester_id', userId);

      if (error) throw error;

      const totalBorrowed = handshakes?.reduce((sum, h) => sum + h.amount, 0) || 0;
      const totalRepaid = handshakes?.reduce((sum, h) => sum + (h.amount_paid || 0), 0) || 0;
      
      // Count on-time payments (completed handshakes with 0 days late)
      const completedHandshakes = handshakes?.filter(h => h.status === 'completed') || [];
      const onTimePayments = completedHandshakes.filter(h => (h.days_late || 0) === 0).length;
      
      const activeHandshakes = handshakes?.filter(h => 
        ['approved', 'active'].includes(h.status)
      ).length || 0;

      setAnalytics({
        totalBorrowed,
        totalRepaid,
        onTimePayments,
        totalPayments: completedHandshakes.length,
        activeHandshakes,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassCard>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted/50 rounded w-32" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-muted/50 rounded" />
            <div className="h-24 bg-muted/50 rounded" />
          </div>
        </div>
      </GlassCard>
    );
  }

  const onTimeRate = analytics.totalPayments > 0 
    ? (analytics.onTimePayments / analytics.totalPayments) * 100 
    : 0;

  return (
    <GlassCard className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-secondary" />
        <h3 className="font-semibold text-lg">Your Analytics</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Total Borrowed */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <TrendingDown className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xs text-foreground/60">Borrowed</div>
          </div>
          <div className="text-2xl font-bold gradient-text">
            R {analytics.totalBorrowed.toFixed(2)}
          </div>
        </div>

        {/* Total Repaid */}
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-green-500/20">
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-xs text-foreground/60">Repaid</div>
          </div>
          <div className="text-2xl font-bold text-green-400">
            R {analytics.totalRepaid.toFixed(2)}
          </div>
        </div>

        {/* On-time Rate */}
        <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-secondary/20">
              <CheckCircle2 className="w-4 h-4 text-secondary" />
            </div>
            <div className="text-xs text-foreground/60">On-Time Rate</div>
          </div>
          <div className="text-2xl font-bold text-secondary">
            {onTimeRate.toFixed(0)}%
          </div>
          <div className="text-xs text-foreground/60 mt-1">
            {analytics.onTimePayments} of {analytics.totalPayments} payments
          </div>
        </div>

        {/* Active Handshakes */}
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Target className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-xs text-foreground/60">Active</div>
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {analytics.activeHandshakes}
          </div>
          <div className="text-xs text-foreground/60 mt-1">
            handshake{analytics.activeHandshakes !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </GlassCard>
  );
};