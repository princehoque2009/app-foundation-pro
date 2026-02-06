import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrangsIcon } from "./PrangsIcon";
import { useWallet } from "@/hooks/useWallet";
import { Gift } from "lucide-react";

interface GiftPrangsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string;
  recipientName: string;
}

export const GiftPrangsDialog = ({ open, onOpenChange, recipientId, recipientName }: GiftPrangsDialogProps) => {
  const [amount, setAmount] = useState("");
  const { wallet, giftPrangs, isGifting } = useWallet();
  const balance = (wallet as any)?.balance || 0;

  const handleSend = async () => {
    const val = parseInt(amount);
    if (!val || val <= 0) return;
    if (val > balance) return;
    await giftPrangs({ recipientId, amount: val });
    setAmount("");
    onOpenChange(false);
  };

  const quickAmounts = [5, 10, 25, 50];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Gift Prangs to {recipientName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-xl">
            <PrangsIcon size="md" />
            <span className="text-lg font-bold">{balance} Prangs</span>
            <span className="text-sm text-muted-foreground">available</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((q) => (
              <Button
                key={q}
                variant={amount === String(q) ? "default" : "outline"}
                size="sm"
                onClick={() => setAmount(String(q))}
                disabled={q > balance}
              >
                {q}
              </Button>
            ))}
          </div>

          <Input
            type="number"
            placeholder="Custom amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1}
            max={balance}
          />

          {parseInt(amount) > balance && (
            <p className="text-sm text-destructive">Insufficient balance</p>
          )}

          <Button
            className="w-full gap-2"
            onClick={handleSend}
            disabled={!amount || parseInt(amount) <= 0 || parseInt(amount) > balance || isGifting}
          >
            <PrangsIcon size="xs" />
            {isGifting ? "Sending..." : `Send ${amount || 0} Prangs`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
