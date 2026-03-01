import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { PrangsIcon } from "./PrangsIcon";
import { Badge } from "@/components/ui/badge";

interface PurchaseSuccessAnimationProps {
  open: boolean;
  onClose: () => void;
  itemName: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  duration?: string | null;
}

export const PurchaseSuccessAnimation = ({
  open,
  onClose,
  itemName,
  amount,
  previousBalance,
  newBalance,
  duration,
}: PurchaseSuccessAnimationProps) => {
  const [displayBalance, setDisplayBalance] = useState(previousBalance);

  useEffect(() => {
    if (!open) return;
    setDisplayBalance(previousBalance);

    // Countdown animation
    const steps = 30;
    const diff = previousBalance - newBalance;
    const stepTime = 800 / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayBalance(Math.round(previousBalance - diff * eased));
      if (step >= steps) clearInterval(interval);
    }, stepTime);

    // Auto close
    const timer = setTimeout(onClose, 3000);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [open, previousBalance, newBalance]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-card rounded-3xl p-8 max-w-xs w-full mx-4 text-center shadow-2xl border border-border/50 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sparkle particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                  x: [0, (i % 2 === 0 ? 1 : -1) * (30 + i * 15)],
                  y: [0, -(20 + i * 10)],
                }}
                transition={{ delay: 0.3 + i * 0.1, duration: 1 }}
                className="absolute top-1/3 left-1/2"
              >
                <Sparkles className="h-3 w-3 text-primary" />
              </motion.div>
            ))}

            {/* Success check */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="mx-auto mb-4"
            >
              <div className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                <motion.div
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                </motion.div>
              </div>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-black text-foreground"
            >
              Purchase Complete!
            </motion.h3>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-2"
            >
              <p className="text-sm text-muted-foreground">{itemName}</p>
              {duration && (
                <Badge variant="secondary" className="mt-1.5 text-xs">
                  Active for {duration}
                </Badge>
              )}
            </motion.div>

            {/* Balance countdown */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-5 p-3 rounded-xl bg-muted/50"
            >
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-black tabular-nums text-foreground">
                  {Number(displayBalance).toLocaleString()}
                </span>
                <PrangsIcon size="sm" />
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-xs text-destructive mt-1"
              >
                -{amount} Prangs
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-3"
            >
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" /> Active Now
              </Badge>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
