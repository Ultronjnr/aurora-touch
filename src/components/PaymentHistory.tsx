import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Receipt, Calendar, CreditCard } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  created_at: string;
  payment_method: string;
  payment_status: string;
  transaction_reference: string;
}

interface PaymentHistoryProps {
  handshakeId: string;
}

export const PaymentHistory = ({ handshakeId }: PaymentHistoryProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
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

  if (loading) {
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

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <Receipt className="w-5 h-5 text-secondary" />
        <h3 className="font-semibold">Payment History</h3>
        <span className="text-sm text-foreground/60">({payments.length})</span>
      </div>

      <div className="space-y-3">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="p-4 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-semibold text-lg gradient-text">
                R {payment.amount.toFixed(2)}
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

      <div className="mt-4 pt-4 border-t border-border/30">
        <div className="flex justify-between items-center text-sm">
          <span className="text-foreground/60">Total Paid:</span>
          <span className="font-bold text-lg gradient-text">
            R {payments
              .filter(p => p.payment_status === 'completed')
              .reduce((sum, p) => sum + p.amount, 0)
              .toFixed(2)}
          </span>
        </div>
      </div>
    </GlassCard>
  );
};