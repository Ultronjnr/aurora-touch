import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle } from "lucide-react";

interface PenaltySetupDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (penalty: {
    enabled: boolean;
    type: 'fixed' | 'percentage';
    amount: number;
    gracePeriodDays: number;
  }) => void;
  amount: number;
}

export const PenaltySetupDialog = ({ open, onClose, onConfirm, amount }: PenaltySetupDialogProps) => {
  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [penaltyType, setPenaltyType] = useState<'fixed' | 'percentage'>('percentage');
  const [penaltyAmount, setPenaltyAmount] = useState("5");
  const [gracePeriodDays, setGracePeriodDays] = useState("0");

  const handleConfirm = () => {
    onConfirm({
      enabled: penaltyEnabled,
      type: penaltyType,
      amount: penaltyEnabled ? parseFloat(penaltyAmount) : 0,
      gracePeriodDays: penaltyEnabled ? parseInt(gracePeriodDays) : 0,
    });
  };

  const calculatePreview = () => {
    if (!penaltyEnabled || !penaltyAmount) return null;
    const penalty = parseFloat(penaltyAmount);
    if (penaltyType === 'fixed') {
      return `R ${penalty.toFixed(2)} per day after ${gracePeriodDays || 0} day grace period`;
    } else {
      const dailyPenalty = (amount * penalty) / 100;
      return `R ${dailyPenalty.toFixed(2)} per day (${penalty}% of R ${amount}) after ${gracePeriodDays || 0} day grace period`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass">
        <DialogHeader>
          <DialogTitle>Set Penalty Terms</DialogTitle>
          <DialogDescription>
            Configure late payment penalty for this handshake. The requester must accept these terms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable Penalty Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <Label htmlFor="penalty-toggle" className="cursor-pointer font-semibold">
                  Enable Late Payment Penalty
                </Label>
              </div>
              <p className="text-sm text-foreground/60">
                Apply penalty for late repayments
              </p>
            </div>
            <Switch
              id="penalty-toggle"
              checked={penaltyEnabled}
              onCheckedChange={setPenaltyEnabled}
            />
          </div>

          {penaltyEnabled && (
            <div className="space-y-4 animate-slide-down">
              {/* Penalty Type */}
              <div className="space-y-3">
                <Label>Penalty Type</Label>
                <RadioGroup 
                  value={penaltyType} 
                  onValueChange={(value) => setPenaltyType(value as 'fixed' | 'percentage')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed" className="cursor-pointer font-normal">
                      Fixed Amount (R per day)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="percentage" />
                    <Label htmlFor="percentage" className="cursor-pointer font-normal">
                      Percentage (% per day)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Penalty Amount */}
              <div className="space-y-2">
                <Label htmlFor="penalty-amount">
                  {penaltyType === 'fixed' ? 'Penalty Amount (R)' : 'Penalty Percentage (%)'}
                </Label>
                <Input
                  id="penalty-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={penaltyType === 'fixed' ? '50.00' : '5.00'}
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(e.target.value)}
                  className="bg-input/50 border-border/50"
                />
              </div>

              {/* Grace Period */}
              <div className="space-y-2">
                <Label htmlFor="grace-period">Grace Period (Days)</Label>
                <Input
                  id="grace-period"
                  type="number"
                  min="0"
                  max="30"
                  placeholder="0"
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(e.target.value)}
                  className="bg-input/50 border-border/50"
                />
                <p className="text-xs text-foreground/60">
                  Days after due date before penalty applies
                </p>
              </div>

              {/* Preview */}
              {calculatePreview() && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="text-sm font-medium text-yellow-500 mb-1">Penalty Preview</div>
                  <div className="text-xs text-foreground/70">
                    {calculatePreview()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            className="flex-1 bg-gradient-to-r from-secondary to-primary hover:opacity-90"
          >
            Continue to Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
