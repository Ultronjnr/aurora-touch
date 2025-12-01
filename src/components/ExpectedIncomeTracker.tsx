import { useEffect, useState } from "react";
import { GlassCard } from "./GlassCard";
import { TrendingUp, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "./ui/progress";

interface IncomeData {
  totalLent: number;
  totalReturned: number;
  outstandingBalances: number;
  expectedReturns: number;
  activeLoans: number;
}

export const ExpectedIncomeTracker = ({ userId }: { userId: string }) => {
  const [income, setIncome] = useState<IncomeData>({
    totalLent: 0,
    totalReturned: 0,
    outstandingBalances: 0,
    expectedReturns: 0,
    activeLoans: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncomeData();
  }, [userId]);

  const fetchIncomeData = async () => {
    try {
      // Fetch all handshakes where user is supporter
      const { data: handshakes, error } = await supabase
        .from('handshakes')
        .select('amount, amount_paid, status, transaction_fee, late_fee')
        .eq('supporter_id', userId);

      if (error) throw error;

      // Calculate totals
      const totalLent = handshakes?.reduce((sum, h) => 
        ['approved', 'active', 'completed'].includes(h.status) ? sum + h.amount : sum, 0
      ) || 0;

      const totalReturned = handshakes?.reduce((sum, h) => sum + (h.amount_paid || 0), 0) || 0;

      // Outstanding = amount + fees - amount paid for active loans
      const outstandingBalances = handshakes?.reduce((sum, h) => {
        if (['approved', 'active'].includes(h.status)) {
          const totalDue = h.amount + (h.transaction_fee || 0) + (h.late_fee || 0);
          const outstanding = totalDue - (h.amount_paid || 0);
          return sum + outstanding;
        }
        return sum;
      }, 0) || 0;

      // Expected returns = total that should be returned (including completed)
      const expectedReturns = handshakes?.reduce((sum, h) => {
        if (['approved', 'active', 'completed'].includes(h.status)) {
          return sum + h.amount + (h.transaction_fee || 0) + (h.late_fee || 0);
        }
        return sum;
      }, 0) || 0;

      const activeLoans = handshakes?.filter(h => 
        ['approved', 'active'].includes(h.status)
      ).length || 0;

      setIncome({
        totalLent,
        totalReturned,
        outstandingBalances,
        expectedReturns,
        activeLoans,
      });
    } catch (error) {
      console.error('Error fetching income data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassCard>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted/50 rounded w-40" />
          <div className="h-32 bg-muted/50 rounded" />
        </div>
      </GlassCard>
    );
  }

  const returnRate = income.totalLent > 0 
    ? (income.totalReturned / income.totalLent) * 100 
    : 0;

  return (
    <GlassCard className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-secondary" />
        <h3 className="font-semibold text-lg">Expected Income</h3>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Total Lent */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xs text-foreground/60">Total Lent</div>
          </div>
          <div className="text-2xl font-bold gradient-text">
            R {income.totalLent.toFixed(2)}
          </div>
        </div>

        {/* Total Returned */}
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-xs text-foreground/60">Returned</div>
          </div>
          <div className="text-2xl font-bold text-green-400">
            R {income.totalReturned.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Return progress */}
      <div className="mb-4 p-4 rounded-lg bg-secondary/5 border border-secondary/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-foreground/60">Return Rate</span>
          <span className="text-sm font-semibold text-secondary">{returnRate.toFixed(1)}%</span>
        </div>
        <Progress value={returnRate} className="h-2" />
      </div>

      {/* Outstanding balances */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-foreground">Outstanding Balances</span>
          </div>
          <span className="text-xs text-foreground/60">{income.activeLoans} active</span>
        </div>
        <div className="text-3xl font-bold text-yellow-400 mb-1">
          R {income.outstandingBalances.toFixed(2)}
        </div>
        <div className="text-xs text-foreground/60">
          Expected to receive from active loans
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border/30">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/60">Total Expected Returns:</span>
          <span className="font-bold text-lg gradient-text">
            R {income.expectedReturns.toFixed(2)}
          </span>
        </div>
        <div className="text-xs text-foreground/60 mt-1 text-right">
          Including completed and active loans
        </div>
      </div>
    </GlassCard>
  );
};