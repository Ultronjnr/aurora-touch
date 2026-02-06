import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PaymentSimulationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  transactionFee: number;
  recipientName: string;
  handshakeId: string;
}

export const PaymentSimulationDialog = ({ 
  open, 
  onClose, 
  onSuccess, 
  amount,
  transactionFee,
  recipientName,
  handshakeId
}: PaymentSimulationDialogProps) => {
  const [processing, setProcessing] = useState(false);

  const totalAmount = amount + transactionFee;

  const handlePayment = async () => {
    setProcessing(true);

    try {
      const baseUrl = window.location.origin;
      
      // Server calculates actual charge — we only send handshakeId
      const { data, error } = await supabase.functions.invoke('create-payfast-payment', {
        body: {
          handshakeId,
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
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass border-border/50">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            Review the fee breakdown and proceed to PayFast
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Amount Summary */}
          <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/30 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-foreground/60">Handshake Amount</span>
              <span className="font-medium">R {amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground/60">Platform Fee (4.5%)</span>
              <span className="font-medium text-secondary">R {transactionFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-border/30">
              <span className="font-semibold">Total Charge</span>
              <span className="font-bold gradient-text text-xl">R {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Revenue info */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-xs text-foreground/50 space-y-1">
            <p>• <strong>R {amount.toFixed(2)}</strong> goes to {recipientName}</p>
            <p>• <strong>R {transactionFee.toFixed(2)}</strong> platform fee goes to CashMe</p>
          </div>

          {/* Security Notice */}
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary shrink-0" />
              <div>
                <p className="font-medium text-sm">Secure Payment</p>
                <p className="text-xs text-foreground/60">
                  Processed securely by PayFast. CashMe never stores your card details.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={processing}>
            Cancel
          </Button>
          <Button 
            onClick={handlePayment}
            className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white"
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Pay R {totalAmount.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
