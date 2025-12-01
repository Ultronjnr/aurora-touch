import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Wallet, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentSimulationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  transactionFee: number;
  recipientName: string;
}

export const PaymentSimulationDialog = ({ 
  open, 
  onClose, 
  onSuccess, 
  amount,
  transactionFee,
  recipientName 
}: PaymentSimulationDialogProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'eft' | 'wallet'>('card');
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

  const totalAmount = amount + transactionFee;

  const handlePayment = async () => {
    // Validate based on payment method
    if (paymentMethod === 'card') {
      if (!cardNumber || cardNumber.length < 16) {
        toast.error("Please enter a valid card number");
        return;
      }
      if (!expiryDate || !cvv) {
        toast.error("Please complete all card details");
        return;
      }
    }

    setProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast.success("Payment processed successfully!", {
      description: `R ${totalAmount.toFixed(2)} sent to ${recipientName}`,
    });

    onSuccess();
    setProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            Test Mode: No real payment will be processed
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
                <span className="text-foreground/60">Platform Fee (5%)</span>
                <span className="font-medium">R {transactionFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/30">
                <span className="font-semibold">Total</span>
                <span className="font-bold gradient-text text-lg">R {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="cursor-pointer font-normal flex items-center gap-2 flex-1">
                  <CreditCard className="w-4 h-4" />
                  Card Payment
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="eft" id="eft" />
                <Label htmlFor="eft" className="cursor-pointer font-normal flex items-center gap-2 flex-1">
                  <Wallet className="w-4 h-4" />
                  Instant EFT
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="wallet" id="wallet" />
                <Label htmlFor="wallet" className="cursor-pointer font-normal flex items-center gap-2 flex-1">
                  <Wallet className="w-4 h-4" />
                  Mobile Wallet
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Card Details Form (only for card payment) */}
          {paymentMethod === 'card' && (
            <div className="space-y-4 animate-slide-down">
              <div className="space-y-2">
                <Label htmlFor="card-number">Card Number</Label>
                <Input
                  id="card-number"
                  type="text"
                  maxLength={16}
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
                  className="bg-input/50 border-border/50 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    type="text"
                    maxLength={5}
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="bg-input/50 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    type="password"
                    maxLength={3}
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="bg-input/50 border-border/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* EFT/Wallet Instructions */}
          {(paymentMethod === 'eft' || paymentMethod === 'wallet') && (
            <div className="p-4 rounded-lg bg-muted/20 border border-border/30 animate-slide-down">
              <p className="text-sm text-foreground/70">
                {paymentMethod === 'eft' 
                  ? "In production, you would be redirected to your bank's secure EFT portal."
                  : "In production, you would select your mobile wallet provider and authorize the payment."}
              </p>
            </div>
          )}

          {/* Test Mode Notice */}
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-center gap-2 text-yellow-500 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Test Mode Active</span>
            </div>
            <p className="text-xs text-foreground/60 mt-1">
              This is a simulation. No actual payment will be processed.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={processing}>
            Cancel
          </Button>
          <Button 
            onClick={handlePayment}
            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 text-white"
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay R {totalAmount.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
