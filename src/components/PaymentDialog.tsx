import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Loader2, ExternalLink } from "lucide-react";
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

  const handlePayment = async () => {
    // Validate amount with comprehensive checks
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
      // Get the base URL for return/cancel URLs
      const baseUrl = window.location.origin;
      
      // Call the PayFast edge function
      const { data, error } = await supabase.functions.invoke('create-payfast-payment', {
        body: {
          amount: paymentAmount,
          itemName: `Handshake Repayment`,
          handshakeId: handshakeId,
          returnUrl: `${baseUrl}/payment/success`,
          cancelUrl: `${baseUrl}/payment/cancel?handshake_id=${handshakeId}`,
          notifyUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-payfast-itn`,
        }
      });

      if (error) throw error;

      if (data?.redirectUrl) {
        toast.success("Redirecting to PayFast...", {
          description: "Complete your payment securely",
        });
        
        // Redirect to PayFast
        window.location.href = data.redirectUrl;
      } else {
        throw new Error("No redirect URL received");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error("Error initiating payment", {
        description: error.message || "Please try again",
      });
      setLoading(false);
    } finally {
      // Don't set loading to false here since we're redirecting
    }
  };

  const handleQuickAmount = (percentage: number) => {
    const quickAmount = (outstandingBalance * percentage).toFixed(2);
    setAmount(quickAmount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-secondary" />
            Make Payment
          </DialogTitle>
          <DialogDescription>
            Enter the amount you want to pay. You can make partial payments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Outstanding Balance */}
          <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
            <div className="text-sm text-foreground/60 mb-1">Outstanding Balance</div>
            <div className="text-3xl font-bold gradient-text">
              R {outstandingBalance.toFixed(2)}
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <Label className="text-sm text-foreground/60">Quick amounts</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(0.25)}
                className="hover:bg-secondary/20 hover:border-secondary/50"
              >
                25%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(0.50)}
                className="hover:bg-secondary/20 hover:border-secondary/50"
              >
                50%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(0.75)}
                className="hover:bg-secondary/20 hover:border-secondary/50"
              >
                75%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(1.00)}
                className="hover:bg-secondary/20 hover:border-secondary/50"
              >
                100%
              </Button>
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
            <p className="text-xs text-foreground/60">
              Maximum: R {outstandingBalance.toFixed(2)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
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
              disabled={loading || !amount || parseFloat(amount) <= 0}
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

          <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
            <p className="text-xs text-foreground/60">
              💡 You'll be redirected to PayFast to complete your payment securely.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};