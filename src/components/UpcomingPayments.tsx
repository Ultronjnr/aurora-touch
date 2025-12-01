import { useEffect, useState } from "react";
import { GlassCard } from "./GlassCard";
import { Calendar, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface UpcomingPayment {
  id: string;
  amount: number;
  payback_day: string;
  status: string;
  supporter: { full_name: string };
  amount_paid: number;
  transaction_fee: number;
  late_fee: number;
}

export const UpcomingPayments = ({ userId }: { userId: string }) => {
  const [payments, setPayments] = useState<UpcomingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUpcomingPayments();
    
    // Update countdown every minute
    const interval = setInterval(() => {
      setPayments([...payments]); // Force re-render for countdown update
    }, 60000);

    return () => clearInterval(interval);
  }, [userId]);

  const fetchUpcomingPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('handshakes')
        .select(`
          id,
          amount,
          payback_day,
          status,
          amount_paid,
          transaction_fee,
          late_fee,
          supporter:supporter_id(full_name)
        `)
        .eq('requester_id', userId)
        .in('status', ['approved', 'active'])
        .order('payback_day', { ascending: true })
        .limit(3);

      if (error) throw error;
      setPayments(data as any || []);
    } catch (error) {
      console.error('Error fetching upcoming payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntilDue = (paybackDay: string) => {
    const now = new Date();
    const due = new Date(paybackDay);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} days overdue`, urgent: true, overdue: true };
    } else if (diffDays === 0) {
      return { text: "Due today", urgent: true, overdue: false };
    } else if (diffDays === 1) {
      return { text: "Due tomorrow", urgent: true, overdue: false };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} days left`, urgent: true, overdue: false };
    } else {
      return { text: `${diffDays} days left`, urgent: false, overdue: false };
    }
  };

  if (loading) {
    return (
      <GlassCard>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted/50 rounded w-40" />
          <div className="h-16 bg-muted/50 rounded" />
        </div>
      </GlassCard>
    );
  }

  if (payments.length === 0) {
    return null;
  }

  return (
    <GlassCard className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-secondary" />
        <h3 className="font-semibold text-lg">Upcoming Payments</h3>
      </div>

      <div className="space-y-3">
        {payments.map((payment) => {
          const timeInfo = getTimeUntilDue(payment.payback_day);
          const outstandingBalance = (
            payment.amount + 
            (payment.transaction_fee || 0) + 
            (payment.late_fee || 0) - 
            (payment.amount_paid || 0)
          );

          return (
            <div
              key={payment.id}
              onClick={() => navigate(`/handshake/${payment.id}`)}
              className={`p-4 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                timeInfo.overdue
                  ? "bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
                  : timeInfo.urgent
                  ? "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20"
                  : "bg-muted/20 border-border/30 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-foreground">
                    {payment.supporter.full_name}
                  </div>
                  <div className="text-sm text-foreground/60">
                    Due: {new Date(payment.payback_day).toLocaleDateString('en-ZA', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold gradient-text">
                    R {outstandingBalance.toFixed(2)}
                  </div>
                  <div className={`text-xs flex items-center gap-1 ${
                    timeInfo.overdue ? "text-destructive" : timeInfo.urgent ? "text-yellow-500" : "text-foreground/60"
                  }`}>
                    {timeInfo.overdue ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                    {timeInfo.text}
                  </div>
                </div>
              </div>

              {/* Progress bar showing payment progress */}
              <div className="mt-3">
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      timeInfo.overdue
                        ? "bg-destructive"
                        : timeInfo.urgent
                        ? "bg-yellow-500"
                        : "bg-secondary"
                    }`}
                    style={{
                      width: `${Math.min(
                        ((payment.amount_paid || 0) / 
                        (payment.amount + (payment.transaction_fee || 0))) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};