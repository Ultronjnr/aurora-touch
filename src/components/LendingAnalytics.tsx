import { useEffect, useState } from "react";
import { GlassCard } from "./GlassCard";
import { TrendingUp, Users, Target, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LendingStats {
  totalBorrowers: number;
  totalHandshakes: number;
  completedHandshakes: number;
  defaultedHandshakes: number;
  averageLoanSize: number;
  successRate: number;
}

export const LendingAnalytics = ({ userId }: { userId: string }) => {
  const [stats, setStats] = useState<LendingStats>({
    totalBorrowers: 0,
    totalHandshakes: 0,
    completedHandshakes: 0,
    defaultedHandshakes: 0,
    averageLoanSize: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLendingStats();
  }, [userId]);

  const fetchLendingStats = async () => {
    try {
      const { data: handshakes, error } = await supabase
        .from('handshakes')
        .select('amount, status, requester_id')
        .eq('supporter_id', userId);

      if (error) throw error;

      const totalHandshakes = handshakes?.length || 0;
      const completedHandshakes = handshakes?.filter(h => h.status === 'completed').length || 0;
      const defaultedHandshakes = handshakes?.filter(h => h.status === 'defaulted').length || 0;
      
      // Get unique borrowers
      const uniqueBorrowers = new Set(handshakes?.map(h => h.requester_id)).size;
      
      // Calculate average loan size from approved/active/completed loans
      const relevantLoans = handshakes?.filter(h => 
        ['approved', 'active', 'completed'].includes(h.status)
      ) || [];
      const totalAmount = relevantLoans.reduce((sum, h) => sum + h.amount, 0);
      const averageLoanSize = relevantLoans.length > 0 ? totalAmount / relevantLoans.length : 0;

      // Success rate = completed / (completed + defaulted)
      const totalResolved = completedHandshakes + defaultedHandshakes;
      const successRate = totalResolved > 0 ? (completedHandshakes / totalResolved) * 100 : 100;

      setStats({
        totalBorrowers: uniqueBorrowers,
        totalHandshakes,
        completedHandshakes,
        defaultedHandshakes,
        averageLoanSize,
        successRate,
      });
    } catch (error) {
      console.error('Error fetching lending stats:', error);
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

  return (
    <GlassCard className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-secondary" />
        <h3 className="font-semibold text-lg">Lending Analytics</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Total Borrowers */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xs text-foreground/60">Borrowers</div>
          </div>
          <div className="text-2xl font-bold gradient-text">
            {stats.totalBorrowers}
          </div>
          <div className="text-xs text-foreground/60 mt-1">
            unique users
          </div>
        </div>

        {/* Total Handshakes */}
        <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-secondary/20">
              <Target className="w-4 h-4 text-secondary" />
            </div>
            <div className="text-xs text-foreground/60">Handshakes</div>
          </div>
          <div className="text-2xl font-bold text-secondary">
            {stats.totalHandshakes}
          </div>
          <div className="text-xs text-foreground/60 mt-1">
            total created
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-xs text-foreground/60">Success Rate</div>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {stats.successRate.toFixed(0)}%
          </div>
          <div className="text-xs text-foreground/60 mt-1">
            {stats.completedHandshakes} completed
          </div>
        </div>

        {/* Average Loan Size */}
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <TrendingUp className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-xs text-foreground/60">Avg Loan</div>
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            R {stats.averageLoanSize.toFixed(0)}
          </div>
          <div className="text-xs text-foreground/60 mt-1">
            per handshake
          </div>
        </div>
      </div>

      {/* Defaults warning if any */}
      {stats.defaultedHandshakes > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-destructive mb-1">
              {stats.defaultedHandshakes} Defaulted Loan{stats.defaultedHandshakes !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-foreground/70">
              Consider reviewing borrower selection criteria
            </div>
          </div>
        </div>
      )}

      {/* Performance summary */}
      <div className="mt-4 pt-4 border-t border-border/30">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-foreground/60">Completed:</span>
            <span className="font-semibold text-green-400">{stats.completedHandshakes}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-foreground/60">Defaulted:</span>
            <span className="font-semibold text-destructive">{stats.defaultedHandshakes}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};