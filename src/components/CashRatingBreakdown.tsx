import { useEffect, useState } from "react";
import { GlassCard } from "./GlassCard";
import { TrendingUp, CheckCircle2, AlertTriangle, DollarSign, Clock, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "./ui/progress";

interface RatingFactors {
  onTimePayments: number;
  latePayments: number;
  totalBorrowed: number;
  successfulRepayments: number;
  cashRating: number;
}

export const CashRatingBreakdown = ({ userId, cashRating }: { userId: string; cashRating: number }) => {
  const [factors, setFactors] = useState<RatingFactors>({
    onTimePayments: 0,
    latePayments: 0,
    totalBorrowed: 0,
    successfulRepayments: 0,
    cashRating: cashRating,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatingFactors();
  }, [userId]);

  const fetchRatingFactors = async () => {
    try {
      const { data: handshakes, error } = await supabase
        .from('handshakes')
        .select('amount, status, days_late')
        .eq('requester_id', userId);

      if (error) throw error;

      const completedHandshakes = handshakes?.filter(h => h.status === 'completed') || [];
      const onTimePayments = completedHandshakes.filter(h => (h.days_late || 0) === 0).length;
      const latePayments = completedHandshakes.filter(h => (h.days_late || 0) > 0).length;
      const totalBorrowed = handshakes?.reduce((sum, h) => sum + h.amount, 0) || 0;

      setFactors({
        onTimePayments,
        latePayments,
        totalBorrowed,
        successfulRepayments: completedHandshakes.length,
        cashRating,
      });
    } catch (error) {
      console.error('Error fetching rating factors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassCard>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted/50 rounded w-48" />
          <div className="h-32 bg-muted/50 rounded" />
        </div>
      </GlassCard>
    );
  }

  const getRatingLevel = (rating: number) => {
    if (rating >= 95) return { label: "Excellent", color: "text-green-400" };
    if (rating >= 85) return { label: "Very Good", color: "text-secondary" };
    if (rating >= 70) return { label: "Good", color: "text-yellow-400" };
    if (rating >= 50) return { label: "Fair", color: "text-orange-400" };
    return { label: "Needs Improvement", color: "text-destructive" };
  };

  const ratingLevel = getRatingLevel(factors.cashRating);

  return (
    <GlassCard className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-secondary" />
          <h3 className="font-semibold text-lg">Cash Rating Breakdown</h3>
        </div>
        <div className={`text-sm font-semibold ${ratingLevel.color}`}>
          {ratingLevel.label}
        </div>
      </div>

      {/* Main Rating Display */}
      <div className="mb-6 text-center p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-border/30">
        <div className="text-5xl font-bold gradient-text mb-2">
          {factors.cashRating.toFixed(0)}
        </div>
        <Progress value={factors.cashRating} className="h-3 mb-2" />
        <div className="text-sm text-foreground/60">Out of 100 points</div>
      </div>

      {/* Factors affecting rating */}
      <div className="space-y-4">
        <div className="text-sm font-semibold text-foreground/80 mb-3">
          What affects your rating:
        </div>

        {/* On-time payments factor */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
          <div className="p-2 rounded-lg bg-green-500/20 mt-1">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm mb-1">On-Time Payments</div>
            <div className="text-xs text-foreground/60 mb-1">
              Paying on or before the due date maintains your rating
            </div>
            <div className="text-xs font-semibold text-green-400">
              {factors.onTimePayments} on-time payment{factors.onTimePayments !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Late payments factor */}
        {factors.latePayments > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="p-2 rounded-lg bg-destructive/20 mt-1">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm mb-1">Late Payments</div>
              <div className="text-xs text-foreground/60 mb-1">
                Each day late reduces your rating by 0.5 points
              </div>
              <div className="text-xs font-semibold text-destructive">
                {factors.latePayments} late payment{factors.latePayments !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {/* Successful repayments */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/5 border border-secondary/20">
          <div className="p-2 rounded-lg bg-secondary/20 mt-1">
            <TrendingUp className="w-4 h-4 text-secondary" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm mb-1">Successful Repayments</div>
            <div className="text-xs text-foreground/60 mb-1">
              Completing handshakes builds trust
            </div>
            <div className="text-xs font-semibold text-secondary">
              {factors.successfulRepayments} completed handshake{factors.successfulRepayments !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Borrowing history */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="p-2 rounded-lg bg-primary/20 mt-1">
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm mb-1">Borrowing Activity</div>
            <div className="text-xs text-foreground/60 mb-1">
              Your borrowing history over time
            </div>
            <div className="text-xs font-semibold text-primary">
              R {factors.totalBorrowed.toFixed(2)} total borrowed
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border/30">
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-foreground/60 mt-0.5" />
          <div className="text-xs text-foreground/70">
            <span className="font-semibold">Tip:</span> Keep your rating high by paying on time. 
            Your rating can go from 0 to 100, starting at 100 for new users.
          </div>
        </div>
      </div>
    </GlassCard>
  );
};