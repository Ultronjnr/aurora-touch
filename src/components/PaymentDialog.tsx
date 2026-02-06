import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, Shield, Wallet } from "lucide-react";
import { validateAmount } from "@/lib/validation";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handshakeId: string;
  outstandingBalance: number;
  onPaymentSuccess: () => void;
}

export const PaymentDialog = ({ 
  open, 
  onOpenChange, 
  handshakeId, 
  outstandingBalance,
  onPaymentSuccess 
}: PaymentDialogProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;

  const handlePayment = async () => {
    const validation = validateAmount(amount, {
      min: 0.01,
      max: outstandingBalance
    });

    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    const paymentAmount = validation.value!;
    setLoading(true);

    try {
      const baseUrl = window.location.origin;
      
      // Server calculates actual charge amount — we only send the requested repayment amount
      const { data, error } = await supabase.functions.invoke('create-payfast-payment', {
        body: {
          handshakeId,
          paymentAmount,
          returnUrl: `${baseUrl}/payment/success`,
          cancelUrl: `${baseUrl}/payment/cancel?handshake_id=${handshakeId}`,
        }
      });

      if (error) throw error;

      if (data?.redirectUrl) {
        toast.success("Redirecting to PayFast...", {
          description: "Complete your payment securely",
        });
        window.location.href = data.redirectUrl;
      } else {
        throw new Error("No redirect URL received");
      }
    } catch (error: any) {
      toast.error("Error initiating payment", {
        description: error.message || "Please try again",
      });
      setLoading(false);
    }
  };

  const handleQuickAmount = (percentage: number) => {
    const quickAmount = (outstandingBalance * percentage).toFixed(2);
    setAmount(quickAmount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-secondary" />
            Make Payment
          </DialogTitle>
          <DialogDescription>
            Enter the amount you want to pay. You can make partial payments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Outstanding Balance */}
          <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/30">
            <div className="text-sm text-foreground/60 mb-1">Outstanding Balance</div>
            <div className="text-3xl font-bold gradient-text">
              R {outstandingBalance.toFixed(2)}
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <Label className="text-sm text-foreground/60">Quick amounts</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "25%", value: 0.25 },
                { label: "50%", value: 0.50 },
                { label: "75%", value: 0.75 },
                { label: "100%", value: 1.00 },
              ].map((opt) => (
                <Button
                  key={opt.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(opt.value)}
                  className="hover:bg-secondary/20 hover:border-secondary/50 transition-all"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Payment Amount (ZAR)</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/60 text-lg">
                R
              </span>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={outstandingBalance}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 text-lg bg-input/50 border-border/50"
              />
            </div>
          </div>

          {/* Fee Breakdown — displayed when amount is entered */}
          {parsedAmount > 0 && parsedAmount <= outstandingBalance && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 space-y-2 animate-fade-in">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/70">Payment Amount</span>
                <span className="font-medium">R {parsedAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-border/30 pt-2 flex justify-between items-center">
                <span className="font-semibold">You will be charged</span>
                <span className="font-bold text-lg gradient-text">R {parsedAmount.toFixed(2)}</span>
              </div>
              <p className="text-xs text-foreground/50">
                Platform fee is included in your outstanding balance
              </p>
            </div>
          )}

          {/* Security notice */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border/30 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <p className="text-xs text-foreground/60">
              Your payment is processed securely by PayFast. CashMe never stores your card details.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePayment}
              disabled={loading || !amount || parsedAmount <= 0 || parsedAmount > outstandingBalance}
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Pay with PayFast
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
