import { useEffect, useState } from "react";
import { GlassCard } from "./GlassCard";
import { Calendar, Clock, AlertTriangle, TrendingUp, Timer, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";

interface UpcomingPayment {
  id: string;
  amount: number;
  payback_day: string;
  status: string;
  supporter: { full_name: string; unique_code: string };
  amount_paid: number;
  transaction_fee: number;
  late_fee: number;
  days_late: number;
}

export const UpcomingPayments = ({ userId }: { userId: string }) => {
  const [payments, setPayments] = useState<UpcomingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    fetchUpcomingPayments();
    
    // Update countdown every 30 seconds for more accurate timers
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  const fetchUpcomingPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('handshakes')
        .select('id, amount, payback_day, status, amount_paid, transaction_fee, late_fee, days_late, supporter_id')
        .eq('requester_id', userId)
        .in('status', ['approved', 'active'])
        .order('payback_day', { ascending: true });

      if (error) throw error;

      // Fetch safe supporter profiles in batch (no banking details exposed)
      const supporterIds = [...new Set((data || []).map(h => h.supporter_id))];
      const { data: profiles } = await supabase.rpc('get_safe_profiles_batch', { profile_ids: supporterIds });
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const enriched = (data || []).map(h => ({
        ...h,
        supporter: profileMap.get(h.supporter_id) || { full_name: 'Unknown', unique_code: '' },
      }));

      setPayments(enriched as any);
    } catch (error) {
      console.error('Error fetching upcoming payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDetailedTimeUntilDue = (paybackDay: string) => {
    const now = currentTime;
    const due = new Date(paybackDay);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) {
      const overdueDays = Math.abs(diffDays);
      return { 
        text: `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`, 
        shortText: `${overdueDays}d overdue`,
        urgent: true, 
        overdue: true,
        icon: AlertTriangle,
        color: "destructive"
      };
    } else if (diffDays === 0 && diffHours < 24) {
      if (diffHours === 0) {
        return { 
          text: `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} left`, 
          shortText: `${diffMinutes}m`,
          urgent: true, 
          overdue: false,
          icon: Zap,
          color: "destructive"
        };
      }
      return { 
        text: `${diffHours} hour${diffHours !== 1 ? 's' : ''} left`, 
        shortText: `${diffHours}h`,
        urgent: true, 
        overdue: false,
        icon: Timer,
        color: "yellow"
      };
    } else if (diffDays === 1) {
      return { 
        text: "Due tomorrow", 
        shortText: "Tomorrow",
        urgent: true, 
        overdue: false,
        icon: Clock,
        color: "yellow"
      };
    } else if (diffDays <= 3) {
      return { 
        text: `${diffDays} days left`, 
        shortText: `${diffDays}d`,
        urgent: true, 
        overdue: false,
        icon: Clock,
        color: "yellow"
      };
    } else if (diffDays <= 7) {
      return { 
        text: `${diffDays} days left`, 
        shortText: `${diffDays}d`,
        urgent: false, 
        overdue: false,
        icon: Calendar,
        color: "secondary"
      };
    } else {
      return { 
        text: `${diffDays} days left`, 
        shortText: `${diffDays}d`,
        urgent: false, 
        overdue: false,
        icon: Calendar,
        color: "muted"
      };
    }
  };

  const getPaymentStatus = (payment: UpcomingPayment) => {
    const totalDue = payment.amount + (payment.transaction_fee || 0) + (payment.late_fee || 0);
    const amountPaid = payment.amount_paid || 0;
    const outstanding = totalDue - amountPaid;
    const progress = totalDue > 0 ? (amountPaid / totalDue) * 100 : 0;

    if (outstanding <= 0) {
      return { label: "Paid in Full", color: "bg-green-500/20 text-green-400 border-green-500/30", progress: 100 };
    } else if (progress > 50) {
      return { label: `${progress.toFixed(0)}% Paid`, color: "bg-blue-500/20 text-blue-400 border-blue-500/30", progress };
    } else if (progress > 0) {
      return { label: `${progress.toFixed(0)}% Paid`, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", progress };
    } else {
      return { label: "Not Paid", color: "bg-muted/20 text-foreground/60 border-border/30", progress: 0 };
    }
  };

  if (loading) {
    return (
      <GlassCard>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted/50 rounded w-40" />
          <div className="h-24 bg-muted/50 rounded" />
          <div className="h-24 bg-muted/50 rounded" />
        </div>
      </GlassCard>
    );
  }

  if (payments.length === 0) {
    return (
      <GlassCard className="text-center py-8 bg-green-500/5 border-green-500/30">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 text-green-400" />
        <p className="text-foreground/80 font-medium">All caught up!</p>
        <p className="text-sm text-foreground/60 mt-1">No upcoming payments</p>
      </GlassCard>
    );
  }

  const overduePayments = payments.filter(p => getDetailedTimeUntilDue(p.payback_day).overdue);
  const upcomingPayments = payments.filter(p => !getDetailedTimeUntilDue(p.payback_day).overdue);

  return (
    <div className="space-y-4">
      {/* Overdue Payments Alert */}
      {overduePayments.length > 0 && (
        <GlassCard className="bg-destructive/10 border-destructive/30 animate-pulse-slow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-full bg-destructive/20">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive">Overdue Payments</h3>
              <p className="text-xs text-foreground/70">
                {overduePayments.length} payment{overduePayments.length !== 1 ? 's' : ''} overdue - Pay now to avoid penalties
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {overduePayments.map((payment) => {
              const timeInfo = getDetailedTimeUntilDue(payment.payback_day);
              const statusInfo = getPaymentStatus(payment);
              const outstandingBalance = (
                payment.amount + 
                (payment.transaction_fee || 0) + 
                (payment.late_fee || 0) - 
                (payment.amount_paid || 0)
              );
              const TimeIcon = timeInfo.icon;

              return (
                <div
                  key={payment.id}
                  onClick={() => navigate(`/handshake/${payment.id}`)}
                  className="p-3 rounded-lg bg-destructive/20 border border-destructive/40 cursor-pointer transition-all hover:scale-[1.02] hover:bg-destructive/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-foreground mb-1">
                        {payment.supporter.full_name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-foreground/70">
                        <span className="font-mono">{payment.supporter.unique_code}</span>
                        <span>•</span>
                        <span>Due {new Date(payment.payback_day).toLocaleDateString('en-ZA', { 
                          month: 'short', 
                          day: 'numeric'
                        })}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-destructive">
                        R {outstandingBalance.toFixed(2)}
                      </div>
                      <Badge variant="destructive" className="mt-1 text-xs">
                        <TimeIcon className="w-3 h-3 mr-1" />
                        {timeInfo.shortText}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={statusInfo.progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-foreground/60">{statusInfo.progress.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Upcoming Payments */}
      {upcomingPayments.length > 0 && (
        <GlassCard className="animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-secondary" />
              <h3 className="font-semibold text-lg">Upcoming Payments</h3>
            </div>
            <Badge variant="secondary" className="text-xs">
              {upcomingPayments.length} active
            </Badge>
          </div>

          <div className="space-y-3">
            {upcomingPayments.map((payment, index) => {
              const timeInfo = getDetailedTimeUntilDue(payment.payback_day);
              const statusInfo = getPaymentStatus(payment);
              const outstandingBalance = (
                payment.amount + 
                (payment.transaction_fee || 0) + 
                (payment.late_fee || 0) - 
                (payment.amount_paid || 0)
              );
              const TimeIcon = timeInfo.icon;

              return (
                <div
                  key={payment.id}
                  onClick={() => navigate(`/handshake/${payment.id}`)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] animate-slide-up ${
                    timeInfo.urgent
                      ? "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20"
                      : "bg-muted/20 border-border/30 hover:bg-muted/30"
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">
                          {payment.supporter.full_name}
                        </span>
                        {timeInfo.urgent && (
                          <Badge variant={timeInfo.color === "yellow" ? "outline" : "destructive"} className="text-xs">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-foreground/60">
                        <span className="font-mono">{payment.supporter.unique_code}</span>
                        <span>•</span>
                        <span>Due {new Date(payment.payback_day).toLocaleDateString('en-ZA', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold gradient-text">
                        R {outstandingBalance.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Status and Timer Row */}
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`text-xs ${statusInfo.color} border`}>
                      {statusInfo.label}
                    </Badge>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${
                      timeInfo.urgent ? "text-yellow-500" : "text-foreground/60"
                    }`}>
                      <TimeIcon className="w-3.5 h-3.5" />
                      {timeInfo.text}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <Progress value={statusInfo.progress} className="h-2" />
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
};
