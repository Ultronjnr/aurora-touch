import { CheckCircle2, Clock } from "lucide-react";
import { Progress } from "./ui/progress";

interface PartialPaymentIndicatorProps {
  totalDue: number;
  amountPaid: number;
  paymentsCount: number;
}

export const PartialPaymentIndicator = ({ 
  totalDue, 
  amountPaid, 
  paymentsCount 
}: PartialPaymentIndicatorProps) => {
  const outstanding = totalDue - amountPaid;
  const progress = totalDue > 0 ? (amountPaid / totalDue) * 100 : 0;
  const isFullyPaid = outstanding <= 0;

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-secondary/10 to-primary/10 border border-secondary/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isFullyPaid ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : (
            <Clock className="w-5 h-5 text-yellow-400" />
          )}
          <span className="font-semibold">
            {isFullyPaid ? "Fully Paid" : "Partial Payment"}
          </span>
        </div>
        <span className="text-sm text-foreground/60">
          {paymentsCount} payment(s)
        </span>
      </div>

      <Progress value={progress} className="h-2 mb-3" />

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <div className="text-foreground/60">Total</div>
          <div className="font-semibold">R {totalDue.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-foreground/60">Paid</div>
          <div className="font-semibold text-green-400">R {amountPaid.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-foreground/60">Due</div>
          <div className={`font-semibold ${isFullyPaid ? 'text-green-400' : 'text-yellow-400'}`}>
            R {outstanding.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border/30 text-center">
        <div className="text-sm font-bold gradient-text">
          {progress.toFixed(1)}% Complete
        </div>
      </div>
    </div>
  );
};
