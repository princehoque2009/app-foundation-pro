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
  Crown,
  Zap,
  Star,
  TrendingUp,
  Camera,
  Phone,
  Hash,
  CreditCard,
  Gift,
  Send,
  Shield,
} from "lucide-react";
import { format } from "date-fns";

const packs = [
  { price: "৳14", prangs: 50, popular: false, icon: Zap, color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30", iconColor: "text-blue-500" },
  { price: "৳24", prangs: 100, popular: true, icon: Star, color: "from-primary/20 to-orange-500/20 border-primary/30", iconColor: "text-primary" },
  { price: "৳49", prangs: 250, popular: false, icon: TrendingUp, color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30", iconColor: "text-emerald-500" },
  { price: "৳99", prangs: 200, popular: false, label: "Monthly Pack", sublabel: "200 + daily claims", icon: Crown, color: "from-amber-500/20 to-yellow-500/20 border-amber-500/30", iconColor: "text-amber-500" },
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
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const balance = (wallet as any)?.balance || 0;

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

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
    setScreenshotFile(null);
    setScreenshotPreview(null);
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles[status] || ""}`}>
        {status}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    const base = "h-8 w-8 rounded-full flex items-center justify-center";
    switch (type) {
      case "purchase":
        return <div className={`${base} bg-blue-500/10`}><ShoppingCart className="h-4 w-4 text-blue-500" /></div>;
      case "gift_received":
        return <div className={`${base} bg-emerald-500/10`}><Gift className="h-4 w-4 text-emerald-500" /></div>;
      case "gift_sent":
        return <div className={`${base} bg-primary/10`}><Send className="h-4 w-4 text-primary" /></div>;
      case "admin_credit":
        return <div className={`${base} bg-purple-500/10`}><Shield className="h-4 w-4 text-purple-500" /></div>;
      case "daily_claim":
        return <div className={`${base} bg-amber-500/10`}><Sparkles className="h-4 w-4 text-amber-500" /></div>;
      default:
        return <div className={`${base} bg-muted`}><CreditCard className="h-4 w-4 text-muted-foreground" /></div>;
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
                {/* Premium Balance Card */}
                <Card className="relative overflow-hidden border-0 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
                    <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-white/10 blur-xl" />
                  </div>
                  <div className="relative p-6 text-center text-white">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-3 mx-auto"
                    >
                      <PrangsIcon size="lg" />
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="text-5xl font-black tracking-tight"
                    >
                      {walletLoading ? "..." : balance.toLocaleString()}
                    </motion.div>
                    <p className="text-white/80 mt-1 font-medium text-sm">Available Prangs</p>
                    <div className="flex justify-center gap-8 mt-5">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-300" />
                          <span className="font-bold text-lg">{((wallet as any)?.total_received || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-white/60 text-xs mt-0.5">Received</p>
                      </div>
                      <div className="w-px bg-white/20" />
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <ArrowUpRight className="h-3.5 w-3.5 text-orange-300" />
                          <span className="font-bold text-lg">{((wallet as any)?.total_sent || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-white/60 text-xs mt-0.5">Sent</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Daily Claim Card */}
                {hasActiveSubscription && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Card className="p-4 border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-yellow-500/5 to-orange-500/5 overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                      <div className="flex items-center justify-between relative">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-bold text-sm flex items-center gap-1.5">
                              Daily Claim
                              <Crown className="h-3.5 w-3.5 text-amber-500" />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              +5 Prangs/day · Expires {subscriptionExpiresAt ? format(new Date(subscriptionExpiresAt), "MMM d, yyyy") : ""}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={!canClaimToday || isClaiming}
                          onClick={() => claimDaily()}
                          className="gap-1.5 rounded-xl shadow-lg"
                        >
                          <CalendarCheck className="h-4 w-4" />
                          {isClaiming ? "..." : canClaimToday ? "Claim" : "Claimed ✓"}
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      className="w-full h-14 gap-2.5 text-base rounded-2xl shadow-lg font-semibold"
                      onClick={() => setView("purchase")}
                    >
                      <ShoppingCart className="h-5 w-5" />
                      Purchase
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      variant="outline"
                      className="w-full h-14 gap-2.5 text-base rounded-2xl font-semibold"
                      onClick={() => setView("history")}
                    >
                      <History className="h-5 w-5" />
                      History
                    </Button>
                  </motion.div>
                </div>

                {/* Recent Transactions */}
                {transactions && transactions.length > 0 && (
                  <Card className="overflow-hidden border-border/50">
                    <div className="flex items-center justify-between p-4 border-b border-border/50">
                      <h3 className="font-bold text-sm">Recent Activity</h3>
                      <button
                        onClick={() => setView("history")}
                        className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                      >
                        View all <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    {transactions.slice(0, 5).map((tx: any, i: number) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-3.5 px-4 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getTypeIcon(tx.type)}
                          <div>
                            <p className="text-sm font-semibold">{getTypeLabel(tx.type)}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {format(new Date(tx.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold tabular-nums ${
                            tx.type === "gift_sent" ? "text-destructive" : "text-emerald-500"
                          }`}>
                            {tx.type === "gift_sent" ? "-" : "+"}{tx.amount}
                          </span>
                          <PrangsIcon size="xs" />
                          {getStatusBadge(tx.status)}
                        </div>
                      </motion.div>
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
                className="space-y-6"
              >
                {/* Pack Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Choose your Pack
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {packs.map((pack, i) => {
                      const Icon = pack.icon;
                      return (
                        <motion.div
                          key={i}
                          whileTap={{ scale: 0.96 }}
                          whileHover={{ y: -2 }}
                        >
                          <Card
                            className={`p-4 cursor-pointer transition-all relative overflow-hidden bg-gradient-to-br ${pack.color} ${
                              selectedPack === i
                                ? "ring-2 ring-primary shadow-lg scale-[1.02]"
                                : "hover:shadow-md"
                            }`}
                            onClick={() => setSelectedPack(i)}
                          >
                            {pack.popular && (
                              <Badge className="absolute -top-0 right-0 text-[9px] rounded-bl-lg rounded-tr-lg rounded-tl-none rounded-br-none px-2 py-1 font-bold">
                                ⭐ POPULAR
                              </Badge>
                            )}
                            <div className={`p-2 rounded-xl bg-background/60 backdrop-blur-sm w-fit mb-3`}>
                              <Icon className={`h-5 w-5 ${pack.iconColor}`} />
                            </div>
                            <div className="flex items-baseline gap-1.5 mb-1">
                              <span className="font-black text-2xl tracking-tight">{pack.prangs}</span>
                              <PrangsIcon size="xs" />
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">
                              {pack.label || `${pack.prangs} Prangs`}
                            </p>
                            {pack.sublabel && (
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{pack.sublabel}</p>
                            )}
                            <div className="mt-2 pt-2 border-t border-border/30">
                              <p className="text-lg font-black text-primary">{pack.price}</p>
                            </div>
                            {selectedPack === i && (
                              <motion.div
                                layoutId="pack-check"
                                className="absolute top-2 left-2"
                              >
                                <CheckCircle2 className="h-5 w-5 text-primary fill-primary/20" />
                              </motion.div>
                            )}
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Payment Method
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "bkash", label: "Bkash", color: "from-pink-500/10 to-pink-600/10 border-pink-500/30" },
                      { id: "nagad", label: "Nagad", color: "from-orange-500/10 to-orange-600/10 border-orange-500/30" },
                    ].map((m) => (
                      <motion.div key={m.id} whileTap={{ scale: 0.96 }}>
                        <Card
                          className={`p-3.5 cursor-pointer text-center transition-all font-bold text-sm ${
                            paymentMethod === m.id
                              ? "ring-2 ring-primary bg-primary/5 border-primary/30"
                              : `bg-gradient-to-br ${m.color}`
                          }`}
                          onClick={() => setPaymentMethod(m.id)}
                        >
                          {m.label}
                          {paymentMethod === m.id && (
                            <CheckCircle2 className="h-4 w-4 text-primary inline ml-2" />
                          )}
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Payment Info */}
                <Card className="p-4 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-primary/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Send payment to</p>
                    <p className="text-2xl font-black tracking-tight">+880 1982580534</p>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      Send the exact amount via <span className="font-bold text-foreground">{paymentMethod === "bkash" ? "Bkash" : "Nagad"}</span>, then fill in the details below and attach a screenshot.
                    </p>
                  </div>
                </Card>

                {/* Modern Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                      <Phone className="h-3.5 w-3.5" />
                      Sender Number
                    </Label>
                    <Input
                      placeholder="01XXXXXXXXX"
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      className="h-12 rounded-xl text-base font-medium bg-muted/30 border-border/50 focus:bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                      <Hash className="h-3.5 w-3.5" />
                      Transaction ID
                    </Label>
                    <Input
                      placeholder="Enter transaction ID from receipt"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="h-12 rounded-xl text-base font-medium bg-muted/30 border-border/50 focus:bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                      <Camera className="h-3.5 w-3.5" />
                      Payment Screenshot
                    </Label>
                    <div className="relative">
                      {screenshotPreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-border/50">
                          <img
                            src={screenshotPreview}
                            alt="Payment screenshot"
                            className="w-full max-h-48 object-contain bg-muted/20 pointer-events-auto"
                          />
                          <button
                            onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }}
                            className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:bg-muted/20 hover:border-primary/30 transition-all group">
                          <div className="p-3 rounded-full bg-muted/50 group-hover:bg-primary/10 transition-colors mb-2">
                            <Camera className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">Tap to upload screenshot</p>
                          <p className="text-xs text-muted-foreground/60 mt-0.5">PNG, JPG up to 5MB</p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleScreenshot}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    className="w-full h-14 gap-2.5 text-base rounded-2xl font-bold shadow-lg"
                    onClick={handlePurchase}
                    disabled={selectedPack === null || !senderNumber || !transactionId || isPurchasing}
                  >
                    <PrangsIcon size="sm" />
                    {isPurchasing ? "Submitting..." : "Submit Purchase Request"}
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {view === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="overflow-hidden border-border/50">
                  {transactions && transactions.length > 0 ? (
                    transactions.map((tx: any, i: number) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between p-3.5 px-4 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getTypeIcon(tx.type)}
                          <div>
                            <p className="text-sm font-semibold">{getTypeLabel(tx.type)}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}
                            </p>
                            {tx.reference && (
                              <p className="text-[10px] text-muted-foreground/60 font-mono">Ref: {tx.reference}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-bold tabular-nums ${
                              tx.type === "gift_sent" ? "text-destructive" : "text-emerald-500"
                            }`}>
                              {tx.type === "gift_sent" ? "-" : "+"}{tx.amount}
                            </span>
                            <PrangsIcon size="xs" />
                          </div>
                          {getStatusBadge(tx.status)}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
                        <History className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <p className="font-semibold text-muted-foreground">No transactions yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Your activity will appear here</p>
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
