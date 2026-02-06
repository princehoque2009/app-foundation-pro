import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PrangsIcon } from "@/components/wallet/PrangsIcon";
import { useWallet } from "@/hooks/useWallet";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShoppingCart,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Sparkles,
  CalendarCheck,
} from "lucide-react";
import { format } from "date-fns";

const packs = [
  { price: "৳14", prangs: 50, popular: false },
  { price: "৳24", prangs: 100, popular: true },
  { price: "৳49", prangs: 250, popular: false },
  { price: "৳99", prangs: 200, popular: false, label: "Monthly (200 + daily claims)" },
];

type View = "main" | "purchase" | "history";

const Wallet = () => {
  const navigate = useNavigate();
  const { wallet, walletLoading, transactions, purchasePrangs, isPurchasing, hasActiveSubscription, canClaimToday, claimDaily, isClaiming, subscriptionExpiresAt } = useWallet();
  const [view, setView] = useState<View>("main");
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("bkash");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");

  const balance = (wallet as any)?.balance || 0;

  const handlePurchase = async () => {
    if (selectedPack === null || !senderNumber || !transactionId) return;
    const pack = packs[selectedPack];
    await purchasePrangs({
      amount: parseInt(pack.price.replace("৳", "")),
      prangs: pack.prangs,
      paymentMethod,
      senderNumber,
      transactionId,
    });
    setView("main");
    setSelectedPack(null);
    setSenderNumber("");
    setTransactionId("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "purchase":
      case "gift_received":
      case "admin_credit":
      case "daily_claim":
        return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />;
      case "gift_sent":
        return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "purchase": return "Purchase";
      case "gift_sent": return "Gift Sent";
      case "gift_received": return "Gift Received";
      case "admin_credit": return "Admin Credit";
      case "daily_claim": return "Daily Claim";
      default: return type;
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
            <button
              onClick={() => (view !== "main" ? setView("main") : navigate(-1))}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-semibold text-lg flex items-center gap-2">
              <PrangsIcon size="sm" />
              {view === "main" ? "Wallet" : view === "purchase" ? "Purchase Prangs" : "Transaction History"}
            </h1>
            <div className="w-9" />
          </div>
        </div>

        <div className="p-4 max-w-screen-xl mx-auto space-y-5">
          <AnimatePresence mode="wait">
            {view === "main" && (
              <motion.div
                key="main"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {/* Balance Card */}
                <Card className="p-6 text-center bg-gradient-to-br from-primary/10 via-background to-primary/5 border-primary/20">
                  <PrangsIcon size="xl" className="mx-auto mb-3" />
                  <div className="text-4xl font-bold text-foreground">
                    {walletLoading ? "..." : balance}
                  </div>
                  <p className="text-muted-foreground mt-1 font-medium">Your Balance</p>
                  <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-semibold text-foreground">{(wallet as any)?.total_received || 0}</span> received
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">{(wallet as any)?.total_sent || 0}</span> sent
                    </div>
                  </div>
                </Card>

                {/* Daily Claim Card */}
                {hasActiveSubscription && (
                  <Card className="p-4 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Daily Claim</p>
                          <p className="text-xs text-muted-foreground">
                            +5 Prangs/day · Expires {subscriptionExpiresAt ? format(new Date(subscriptionExpiresAt), "MMM d") : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={!canClaimToday || isClaiming}
                        onClick={() => claimDaily()}
                        className="gap-1.5"
                      >
                        <CalendarCheck className="h-4 w-4" />
                        {isClaiming ? "..." : canClaimToday ? "Claim" : "Claimed"}
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    className="h-14 gap-2 text-base"
                    onClick={() => setView("purchase")}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Purchase
                  </Button>
                  <Button
                    variant="outline"
                    className="h-14 gap-2 text-base"
                    onClick={() => setView("history")}
                  >
                    <History className="h-5 w-5" />
                    History
                  </Button>
                </div>

                {/* Recent Transactions */}
                {transactions && transactions.length > 0 && (
                  <Card className="overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <h3 className="font-semibold text-sm">Recent Transactions</h3>
                      <button
                        onClick={() => setView("history")}
                        className="text-xs text-primary flex items-center gap-1"
                      >
                        View all <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    {transactions.slice(0, 5).map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(tx.type)}
                          <div>
                            <p className="text-sm font-medium">{getTypeLabel(tx.type)}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${
                            tx.type === "gift_sent" ? "text-destructive" : "text-emerald-500"
                          }`}>
                            {tx.type === "gift_sent" ? "-" : "+"}{tx.amount}
                          </span>
                          <PrangsIcon size="xs" />
                          {getStatusIcon(tx.status)}
                        </div>
                      </div>
                    ))}
                  </Card>
                )}
              </motion.div>
            )}

            {view === "purchase" && (
              <motion.div
                key="purchase"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {/* Packs */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Select Pack</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {packs.map((pack, i) => (
                      <Card
                        key={i}
                        className={`p-4 cursor-pointer transition-all relative ${
                          selectedPack === i
                            ? "border-primary ring-2 ring-primary/20"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedPack(i)}
                      >
                        {pack.popular && (
                          <Badge className="absolute -top-2 right-2 text-[10px]">Popular</Badge>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <PrangsIcon size="sm" />
                          <span className="font-bold text-lg">{pack.prangs}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{pack.label || `${pack.prangs} Prangs`}</p>
                        <p className="text-base font-bold text-primary mt-1">{pack.price}</p>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {["bkash", "nagad"].map((m) => (
                      <Button
                        key={m}
                        variant={paymentMethod === m ? "default" : "outline"}
                        onClick={() => setPaymentMethod(m)}
                        className="capitalize"
                      >
                        {m}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Payment Info */}
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <p className="text-sm font-medium text-primary">Send payment to:</p>
                  <p className="text-lg font-bold mt-1">+880 1982580534</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send the exact amount via {paymentMethod === "bkash" ? "Bkash" : "Nagad"}, then fill in the details below.
                  </p>
                </Card>

                {/* Form */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Sender Number</Label>
                    <Input
                      placeholder="01XXXXXXXXX"
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Transaction ID</Label>
                    <Input
                      placeholder="Enter transaction ID"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  className="w-full h-12 gap-2 text-base"
                  onClick={handlePurchase}
                  disabled={selectedPack === null || !senderNumber || !transactionId || isPurchasing}
                >
                  <PrangsIcon size="sm" />
                  {isPurchasing ? "Submitting..." : "Submit Purchase Request"}
                </Button>
              </motion.div>
            )}

            {view === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="overflow-hidden">
                  {transactions && transactions.length > 0 ? (
                    transactions.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(tx.type)}
                          <div>
                            <p className="text-sm font-medium">{getTypeLabel(tx.type)}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}
                            </p>
                            {tx.reference && (
                              <p className="text-xs text-muted-foreground">Ref: {tx.reference}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${
                            tx.type === "gift_sent" ? "text-destructive" : "text-emerald-500"
                          }`}>
                            {tx.type === "gift_sent" ? "-" : "+"}{tx.amount}
                          </span>
                          <PrangsIcon size="xs" />
                          {getStatusIcon(tx.status)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>No transactions yet</p>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
};

export default Wallet;
