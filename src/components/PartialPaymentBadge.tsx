import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface PartialPaymentBadgeProps {
  totalDue: number;
  amountPaid: number;
  compact?: boolean;
}

export const PartialPaymentBadge = ({ 
  totalDue, 
  amountPaid,
  compact = false
}: PartialPaymentBadgeProps) => {
  const outstanding = totalDue - amountPaid;
  const progress = totalDue > 0 ? (amountPaid / totalDue) * 100 : 0;
  const isFullyPaid = outstanding <= 0;
  const isPartiallyPaid = amountPaid > 0 && outstanding > 0;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${
        isFullyPaid
          ? 'bg-green-500/20 text-green-400 border-green-500/30'
          : isPartiallyPaid
          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
          : 'bg-muted/20 text-foreground/60 border-border/30'
      }`}>
        {isFullyPaid ? (
          <>
            <CheckCircle2 className="w-3 h-3" />
            <span>Paid</span>
          </>
        ) : isPartiallyPaid ? (
          <>
            <Clock className="w-3 h-3" />
            <span>{progress.toFixed(0)}% Paid</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-3 h-3" />
            <span>Unpaid</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`p-2 rounded-lg border ${
      isFullyPaid
        ? 'bg-green-500/10 border-green-500/30'
        : isPartiallyPaid
        ? 'bg-yellow-500/10 border-yellow-500/30'
        : 'bg-muted/10 border-border/30'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">
          {isFullyPaid ? 'Fully Paid' : isPartiallyPaid ? 'Partial Payment' : 'Awaiting Payment'}
        </span>
        <span className={`text-xs font-bold ${
          isFullyPaid ? 'text-green-400' : isPartiallyPaid ? 'text-yellow-400' : 'text-foreground/60'
        }`}>
          {progress.toFixed(0)}%
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-foreground/60">Paid</div>
          <div className="font-semibold text-green-400">R {amountPaid.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-foreground/60">Due</div>
          <div className={`font-semibold ${isFullyPaid ? 'text-green-400' : 'text-yellow-400'}`}>
            R {outstanding.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};
