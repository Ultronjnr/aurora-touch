import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Receipt, Calendar, CreditCard, TrendingUp, Wallet } from "lucide-react";
import { Progress } from "./ui/progress";

interface Payment {
  id: string;
  amount: number;
  created_at: string;
  payment_method: string;
  payment_status: string;
  transaction_reference: string;
}

interface HandshakeData {
  amount: number;
  transaction_fee: number;
  late_fee: number;
  amount_paid: number;
}

interface PaymentHistoryProps {
  handshakeId: string;
}

export const PaymentHistory = ({ handshakeId }: PaymentHistoryProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [handshake, setHandshake] = useState<HandshakeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
    fetchHandshake();
  }, [handshakeId]);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('handshake_id', handshakeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHandshake = async () => {
    try {
      const { data, error } = await supabase
        .from('handshakes')
        .select('amount, transaction_fee, late_fee, amount_paid')
        .eq('id', handshakeId)
        .single();

      if (error) throw error;
      setHandshake(data);
    } catch (error) {
      console.error('Error fetching handshake:', error);
    }
  };

  if (loading || !handshake) {
    return (
      <GlassCard>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted/50 rounded w-32" />
          <div className="h-12 bg-muted/50 rounded" />
        </div>
      </GlassCard>
    );
  }

  if (payments.length === 0) {
    return (
      <GlassCard className="text-center py-8">
        <Receipt className="w-12 h-12 mx-auto mb-3 text-foreground/30" />
        <p className="text-foreground/60">No payments made yet</p>
      </GlassCard>
    );
  }

  const completedPayments = payments.filter(p => p.payment_status === 'completed');
  const totalPaid = completedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalDue = handshake.amount + (handshake.transaction_fee || 0) + (handshake.late_fee || 0);
  const outstandingBalance = totalDue - totalPaid;
  const paymentProgress = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Payment Progress Summary */}
      <GlassCard className="bg-gradient-to-br from-secondary/10 to-primary/10 border-secondary/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-secondary/20">
            <TrendingUp className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Repayment Progress</h3>
            <p className="text-sm text-foreground/60">{completedPayments.length} payment(s) made</p>
          </div>
        </div>

        <div className="space-y-3">
          <Progress value={paymentProgress} className="h-3" />
          
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-background/50">
              <div className="text-xs text-foreground/60 mb-1">Total Due</div>
              <div className="text-sm font-bold">R {totalDue.toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="text-xs text-foreground/60 mb-1">Paid</div>
              <div className="text-sm font-bold text-green-400">R {totalPaid.toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="text-xs text-foreground/60 mb-1">Outstanding</div>
              <div className="text-sm font-bold text-yellow-400">R {outstandingBalance.toFixed(2)}</div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/30">
            <div className="flex justify-between items-center text-sm">
              <span className="text-foreground/60">Progress</span>
              <span className="font-bold gradient-text">{paymentProgress.toFixed(1)}% Complete</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Payment History List */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-secondary" />
          <h3 className="text-lg font-semibold">Payment History</h3>
          <span className="text-sm text-foreground/60">({payments.length})</span>
        </div>
        
        <div className="space-y-3">
          {payments.map((payment, index) => (
            <div
              key={payment.id}
              className="p-4 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold text-lg gradient-text">
                    R {payment.amount.toFixed(2)}
                  </div>
                  <div className="text-xs text-foreground/60 mt-1">
                    Payment #{payments.length - index}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs border ${
                  payment.payment_status === 'completed'
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : payment.payment_status === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    : 'bg-destructive/20 text-destructive border-destructive/30'
                }`}>
                  {payment.payment_status}
                </div>
              </div>

              <div className="space-y-1 text-sm text-foreground/60">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(payment.created_at), "PPp")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3 h-3" />
                  <span className="capitalize">{payment.payment_method}</span>
                </div>
                <div className="text-xs font-mono text-foreground/40">
                  Ref: {payment.transaction_reference}
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
