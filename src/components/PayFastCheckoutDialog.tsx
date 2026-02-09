import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, Shield } from "lucide-react";
import { validateAmount } from "@/lib/validation";

interface PayFastCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill user's first name */
  nameFirst?: string;
  /** Pre-fill user's last name */
  nameLast?: string;
  /** Pre-fill user's email */
  email?: string;
  /** Custom string passed through to PayFast (e.g. user_id) */
  customStr1?: string;
  /** Custom string passed through to PayFast (e.g. handshake_id) */
  customStr2?: string;
}

export const PayFastCheckoutDialog = ({
  open,
  onOpenChange,
  nameFirst = "",
  nameLast = "",
  email = "",
  customStr1,
  customStr2,
}: PayFastCheckoutDialogProps) => {
  const [amount, setAmount] = useState("");
  const [firstName, setFirstName] = useState(nameFirst);
  const [lastName, setLastName] = useState(nameLast);
  const [emailAddress, setEmailAddress] = useState(email);
  const [loading, setLoading] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const platformFee = Math.round(parsedAmount * 0.035 * 100) / 100;

  const handleCheckout = async () => {
    // Client-side validation
    const amountValidation = validateAmount(amount, { min: 5, max: 1_000_000 });
    if (!amountValidation.isValid) {
      toast.error(amountValidation.error);
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    if (!emailAddress.trim() || !emailAddress.includes("@")) {
      toast.error("A valid email is required");
      return;
    }

    setLoading(true);

    try {
      // Call the edge function — it returns HTML that auto-submits to PayFast
      const { data, error } = await supabase.functions.invoke("payfast-checkout", {
        body: {
          amount: amountValidation.value!,
          item_name: "CashMe Payment",
          name_first: firstName.trim(),
          name_last: lastName.trim(),
          email_address: emailAddress.trim(),
          custom_str1: customStr1,
          custom_str2: customStr2,
        },
      });

      if (error) throw error;

      // The response is HTML — write it to the document to auto-redirect
      if (typeof data === "string" && data.includes("<form")) {
        document.open();
        document.write(data);
        document.close();
      } else {
        throw new Error("Unexpected response from payment server");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error("Payment failed", {
        description: err.message || "Please try again",
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-secondary" />
            Pay with PayFast
          </DialogTitle>
          <DialogDescription>
            Enter your details below to make a secure payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pf-first-name">First Name</Label>
              <Input
                id="pf-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="bg-input/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-last-name">Last Name</Label>
              <Input
                id="pf-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="bg-input/50 border-border/50"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="pf-email">Email</Label>
            <Input
              id="pf-email"
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="you@email.com"
              className="bg-input/50 border-border/50"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="pf-amount">Amount (ZAR)</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/60 text-lg">
                R
              </span>
              <Input
                id="pf-amount"
                type="number"
                step="0.01"
                min="5"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 text-lg bg-input/50 border-border/50"
              />
            </div>
          </div>

          {/* Fee breakdown */}
          {parsedAmount >= 5 && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 space-y-2 animate-fade-in">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/70">Payment</span>
                <span className="font-medium">R {parsedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/70">Platform fee (3.5%)</span>
                <span className="font-medium">R {platformFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-border/30 pt-2 flex justify-between items-center">
                <span className="font-semibold">You pay</span>
                <span className="font-bold text-lg gradient-text">
                  R {parsedAmount.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-foreground/50">
                The platform fee is deducted from the recipient's side.
              </p>
            </div>
          )}

          {/* Security notice */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border/30 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <p className="text-xs text-foreground/60">
              Payments are processed securely by PayFast. CashMe never stores your card details.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={loading || parsedAmount < 5}
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecting…
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay Now
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
