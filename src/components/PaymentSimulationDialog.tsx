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
      // Get the base URL for return/cancel URLs
      const baseUrl = window.location.origin;
      
      // Call the PayFast edge function
      const { data, error } = await supabase.functions.invoke('create-payfast-payment', {
        body: {
          amount: totalAmount,
          itemName: `CashMe Support to ${recipientName}`,
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
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            You'll be redirected to PayFast to complete your payment securely
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount Summary */}
          <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Amount</span>
                <span className="font-medium">R {amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Platform Fee (4.5%)</span>
                <span className="font-medium">R {transactionFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/30">
                <span className="font-semibold">Total</span>
                <span className="font-bold gradient-text text-lg">R {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium text-sm">Secure Payment</p>
                <p className="text-xs text-foreground/60">
                  Your payment is processed securely by PayFast
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-foreground/60 text-center">
            This payment supports {recipientName}'s request
          </p>
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
                Pay with PayFast
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
