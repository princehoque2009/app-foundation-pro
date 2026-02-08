import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PrangsIcon } from "@/components/wallet/PrangsIcon";
import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle } from "lucide-react";

interface ConfirmTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  amount: number;
  currentBalance: number;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
  recipientName?: string;
  itemName?: string;
}

export const ConfirmTransactionDialog = ({
  open,
  onOpenChange,
  title,
  description,
  amount,
  currentBalance,
  onConfirm,
  isLoading,
  recipientName,
  itemName,
}: ConfirmTransactionDialogProps) => {
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);

  const balanceAfter = currentBalance - amount;
  const insufficient = balanceAfter < 0;

  const startHold = () => {
    if (insufficient || isLoading) return;
    setHolding(true);
    setHoldProgress(0);
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / 2000, 1);
      setHoldProgress(progress);
      if (progress >= 1) {
        clearInterval(timer);
        setHolding(false);
        setHoldProgress(0);
        onConfirm();
      }
    }, 16);
    setHoldTimer(timer);
  };

  const stopHold = () => {
    setHolding(false);
    setHoldProgress(0);
    if (holdTimer) clearInterval(holdTimer);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          {recipientName && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">To</span>
              <span className="font-semibold">{recipientName}</span>
            </div>
          )}
          {itemName && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Item</span>
              <span className="font-semibold">{itemName}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-bold flex items-center gap-1">
              -{amount} <PrangsIcon size="xs" />
            </span>
          </div>
          <div className="border-t border-border/50 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance after</span>
              <span className={`font-bold flex items-center gap-1 ${insufficient ? "text-destructive" : "text-emerald-500"}`}>
                {insufficient ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" /> Insufficient
                  </>
                ) : (
                  <>
                    {balanceAfter.toLocaleString()} <PrangsIcon size="xs" />
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="relative w-full">
            <Button
              className="w-full h-12 relative overflow-hidden"
              disabled={insufficient || isLoading}
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={startHold}
              onTouchEnd={stopHold}
            >
              {holdProgress > 0 && (
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  style={{ width: `${holdProgress * 100}%` }}
                />
              )}
              <span className="relative z-10">
                {isLoading ? "Processing..." : holding ? "Hold to confirm..." : "Hold to Confirm"}
              </span>
            </Button>
          </div>
          <AlertDialogCancel className="w-full mt-0">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
