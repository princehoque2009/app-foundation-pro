import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrangsIcon } from "@/components/wallet/PrangsIcon";
import { WalletStore } from "@/components/wallet/WalletStore";
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
  ShoppingBag,
  Store,
  Filter,
  Search,
  ArrowDown,
  ArrowUp,
  Gem,
} from "lucide-react";
import { format } from "date-fns";

const packs = [
  {
    price: "৳14", prangs: 50, popular: false, icon: Zap,
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
    iconColor: "text-blue-500", bgGlow: "bg-blue-500/10",
  },
  {
    price: "৳24", prangs: 100, popular: true, icon: Star,
    color: "from-primary/20 to-orange-500/20 border-primary/30",
    iconColor: "text-primary", label: "Most Popular", bgGlow: "bg-primary/10",
  },
  {
    price: "৳49", prangs: 250, popular: false, icon: TrendingUp,
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
    iconColor: "text-emerald-500", label: "Best Value", bgGlow: "bg-emerald-500/10",
  },
  {
    price: "৳99", prangs: 500, popular: false, icon: Crown,
    color: "from-amber-500/20 to-yellow-500/20 border-amber-500/30",
    iconColor: "text-amber-500",
    label: "Monthly Pack",
    sublabel: "500 instant + 10/day (300 bonus)",
    totalLabel: "800 total",
    bgGlow: "bg-amber-500/10",
  },
];

type View = "main" | "purchase" | "history" | "store";
type TxFilter = "all" | "sent" | "received" | "purchases";

const Wallet = () => {
  const navigate = useNavigate();
  const {
    wallet, walletLoading, transactions, purchasePrangs, isPurchasing,
    hasActiveSubscription, canClaimToday, claimDaily, isClaiming, subscriptionExpiresAt,
  } = useWallet();
  const [view, setView] = useState<View>("main");
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("bkash");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<TxFilter>("all");
  const [txSearch, setTxSearch] = useState("");

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
    if (selectedPack === null || !senderNumber || !transactionId || !screenshotFile) return;
    const pack = packs[selectedPack];
    await purchasePrangs({
      amount: parseInt(pack.price.replace("৳", "")),
      prangs: pack.prangs,
      paymentMethod,
      senderNumber,
      transactionId,
    });
    setView("main");
    resetForm();
  };

  const resetForm = () => {
    setSelectedPack(null);
    setSenderNumber("");
    setTransactionId("");
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  const filteredTransactions = transactions?.filter((tx: any) => {
    const matchesFilter =
      txFilter === "all" ? true :
      txFilter === "sent" ? ["gift_sent", "store_purchase"].includes(tx.type) :
      txFilter === "received" ? ["gift_received", "admin_credit", "daily_claim"].includes(tx.type) :
      txFilter === "purchases" ? tx.type === "purchase" : true;

    const matchesSearch = txSearch
      ? (tx.type?.toLowerCase().includes(txSearch.toLowerCase()) ||
         tx.reference?.toLowerCase().includes(txSearch.toLowerCase()) ||
         String(tx.amount).includes(txSearch))
      : true;

    return matchesFilter && matchesSearch;
  });

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
    const base = "h-9 w-9 rounded-xl flex items-center justify-center";
    switch (type) {
      case "purchase": return <div className={`${base} bg-blue-500/10`}><ShoppingCart className="h-4 w-4 text-blue-500" /></div>;
      case "gift_received": return <div className={`${base} bg-emerald-500/10`}><Gift className="h-4 w-4 text-emerald-500" /></div>;
      case "gift_sent": return <div className={`${base} bg-primary/10`}><Send className="h-4 w-4 text-primary" /></div>;
      case "admin_credit": return <div className={`${base} bg-purple-500/10`}><Shield className="h-4 w-4 text-purple-500" /></div>;
      case "daily_claim": return <div className={`${base} bg-amber-500/10`}><Sparkles className="h-4 w-4 text-amber-500" /></div>;
      case "store_purchase": return <div className={`${base} bg-fuchsia-500/10`}><ShoppingBag className="h-4 w-4 text-fuchsia-500" /></div>;
      default: return <div className={`${base} bg-muted`}><CreditCard className="h-4 w-4 text-muted-foreground" /></div>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "purchase": return "Purchase";
      case "gift_sent": return "Gift Sent";
      case "gift_received": return "Gift Received";
      case "admin_credit": return "Admin Credit";
      case "daily_claim": return "Daily Claim";
      case "store_purchase": return "Store Purchase";
      default: return type;
    }
  };

  const isSend = (type: string) => ["gift_sent", "store_purchase"].includes(type);

  const viewTitle = view === "main" ? "Wallet" : view === "purchase" ? "Purchase Prangs" : view === "store" ? "Prangs Store" : "Transactions";

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
              {viewTitle}
            </h1>
            <div className="w-9" />
          </div>
        </div>

        <div className="p-4 max-w-screen-xl mx-auto space-y-5">
          <AnimatePresence mode="wait">
            {view === "main" && (
              <motion.div key="main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                {/* Premium Balance Card with glossy effect */}
                <Card className="relative overflow-hidden border-0 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-indigo-600" />
                  {/* Glossy shine */}
                  <div className="absolute inset-0">
                    <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
                    <div className="absolute top-1/3 left-1/4 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-12" />
                  </div>
                  {/* Watermark */}
                  <div className="absolute bottom-2 right-3 opacity-[0.06]">
                    <PrangsIcon size="lg" />
                  </div>
                  <div className="relative p-6 text-center text-white">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md mb-3 mx-auto shadow-lg"
                    >
                      <PrangsIcon size="lg" />
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="text-5xl font-black tracking-tight drop-shadow-lg"
                    >
                      {walletLoading ? "..." : balance.toLocaleString()}
                    </motion.div>
                    <p className="text-white/70 mt-1 font-medium text-sm tracking-wide">Available Prangs</p>
                    <div className="flex justify-center gap-8 mt-5">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <ArrowDown className="h-3.5 w-3.5 text-emerald-300" />
                          <span className="font-bold text-lg">{((wallet as any)?.total_received || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-white/50 text-xs mt-0.5">Received</p>
                      </div>
                      <div className="w-px bg-white/15 rounded-full" />
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <ArrowUp className="h-3.5 w-3.5 text-orange-300" />
                          <span className="font-bold text-lg">{((wallet as any)?.total_sent || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-white/50 text-xs mt-0.5">Sent</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Daily Claim */}
                {hasActiveSubscription && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <Card className="p-4 border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-yellow-500/5 to-orange-500/5 overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                      <div className="flex items-center justify-between relative">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 shadow-sm">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-bold text-sm flex items-center gap-1.5">
                              Daily Claim <Crown className="h-3.5 w-3.5 text-amber-500" />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              +10 Prangs/day · Expires {subscriptionExpiresAt ? format(new Date(subscriptionExpiresAt), "MMM d") : ""}
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

                {/* Quick Actions */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: ShoppingCart, label: "Buy", view: "purchase" as View, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { icon: Store, label: "Store", view: "store" as View, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
                    { icon: History, label: "History", view: "history" as View, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { icon: Gift, label: "Gift", view: "main" as View, color: "text-orange-500", bg: "bg-orange-500/10" },
                  ].map(({ icon: Icon, label, view: v, color, bg }) => (
                    <motion.div key={label} whileTap={{ scale: 0.93 }}>
                      <button
                        className="w-full flex flex-col items-center gap-1.5 p-3 rounded-2xl hover:bg-muted/50 transition-colors"
                        onClick={() => setView(v)}
                      >
                        <div className={`p-3 rounded-xl ${bg}`}>
                          <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                        <span className="text-xs font-semibold">{label}</span>
                      </button>
                    </motion.div>
                  ))}
                </div>

                {/* Packs Preview */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm flex items-center gap-1.5">
                      <Gem className="h-4 w-4 text-primary" /> Get Prangs
                    </h3>
                    <button onClick={() => setView("purchase")} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                      See all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {packs.map((pack, i) => {
                      const Icon = pack.icon;
                      return (
                        <motion.div key={i} whileTap={{ scale: 0.96 }} className="min-w-[130px]">
                          <Card
                            className={`p-3.5 cursor-pointer bg-gradient-to-br ${pack.color} relative overflow-hidden hover:shadow-md transition-all`}
                            onClick={() => { setSelectedPack(i); setView("purchase"); }}
                          >
                            {pack.label && (
                              <Badge className="absolute -top-0 right-0 text-[8px] rounded-bl-lg rounded-tr-lg rounded-tl-none rounded-br-none px-1.5 py-0.5 font-bold">
                                {pack.label === "Most Popular" ? "⭐" : pack.label === "Best Value" ? "💎" : "👑"} {pack.label}
                              </Badge>
                            )}
                            <div className={`p-1.5 rounded-lg ${pack.bgGlow} w-fit mb-2`}>
                              <Icon className={`h-4 w-4 ${pack.iconColor}`} />
                            </div>
                            <span className="font-black text-xl">{pack.prangs}</span>
                            <PrangsIcon size="xs" />
                            <p className="text-lg font-black text-primary mt-1">{pack.price}</p>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Activity */}
                {transactions && transactions.length > 0 && (
                  <Card className="overflow-hidden border-border/50">
                    <div className="flex items-center justify-between p-4 border-b border-border/50">
                      <h3 className="font-bold text-sm">Recent Activity</h3>
                      <button onClick={() => setView("history")} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                        View all <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    {transactions.slice(0, 4).map((tx: any, i: number) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-3.5 px-4 border-b border-border/30 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          {getTypeIcon(tx.type)}
                          <div>
                            <p className="text-sm font-semibold">{getTypeLabel(tx.type)}</p>
                            <p className="text-[11px] text-muted-foreground">{format(new Date(tx.created_at), "MMM d, yyyy")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold tabular-nums ${isSend(tx.type) ? "text-destructive" : "text-emerald-500"}`}>
                            {isSend(tx.type) ? "-" : "+"}{tx.amount}
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

            {/* Purchase View */}
            {view === "purchase" && (
              <motion.div key="purchase" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" /> Choose your Pack
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {packs.map((pack, i) => {
                      const Icon = pack.icon;
                      return (
                        <motion.div key={i} whileTap={{ scale: 0.96 }} whileHover={{ y: -2 }}>
                          <Card
                            className={`p-4 cursor-pointer transition-all relative overflow-hidden bg-gradient-to-br ${pack.color} ${
                              selectedPack === i ? "ring-2 ring-primary shadow-lg scale-[1.02]" : "hover:shadow-md"
                            }`}
                            onClick={() => setSelectedPack(i)}
                          >
                            {pack.label && (
                              <Badge className="absolute -top-0 right-0 text-[8px] rounded-bl-lg rounded-tr-lg rounded-tl-none rounded-br-none px-1.5 py-0.5 font-bold">
                                {pack.label === "Most Popular" ? "⭐" : pack.label === "Best Value" ? "💎" : "👑"} {pack.label}
                              </Badge>
                            )}
                            <div className={`p-2 rounded-xl ${pack.bgGlow} backdrop-blur-sm w-fit mb-3`}>
                              <Icon className={`h-5 w-5 ${pack.iconColor}`} />
                            </div>
                            <div className="flex items-baseline gap-1.5 mb-1">
                              <span className="font-black text-2xl tracking-tight">{pack.prangs}</span>
                              <PrangsIcon size="xs" />
                            </div>
                            {pack.sublabel && <p className="text-[10px] text-muted-foreground/70">{pack.sublabel}</p>}
                            {pack.totalLabel && (
                              <p className="text-[9px] font-bold text-amber-600 mt-0.5">{pack.totalLabel}</p>
                            )}
                            <div className="mt-2 pt-2 border-t border-border/30">
                              <p className="text-lg font-black text-primary">{pack.price}</p>
                            </div>
                            {selectedPack === i && (
                              <motion.div layoutId="pack-check" className="absolute top-2 left-2">
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
                    <CreditCard className="h-4 w-4 text-primary" /> Payment Method
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "bkash", label: "Bkash", color: "from-pink-500/10 to-pink-600/10 border-pink-500/30" },
                      { id: "nagad", label: "Nagad", color: "from-orange-500/10 to-orange-600/10 border-orange-500/30" },
                    ].map((m) => (
                      <motion.div key={m.id} whileTap={{ scale: 0.96 }}>
                        <Card
                          className={`p-3.5 cursor-pointer text-center transition-all font-bold text-sm ${
                            paymentMethod === m.id ? "ring-2 ring-primary bg-primary/5 border-primary/30" : `bg-gradient-to-br ${m.color}`
                          }`}
                          onClick={() => setPaymentMethod(m.id)}
                        >
                          {m.label}
                          {paymentMethod === m.id && <CheckCircle2 className="h-4 w-4 text-primary inline ml-2" />}
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

                {/* Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                      <Phone className="h-3.5 w-3.5" /> Sender Number
                    </Label>
                    <Input placeholder="01XXXXXXXXX" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)}
                      className="h-12 rounded-xl text-base font-medium bg-muted/30 border-border/50 focus:bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                      <Hash className="h-3.5 w-3.5" /> Transaction ID
                    </Label>
                    <Input placeholder="Enter transaction ID from receipt" value={transactionId} onChange={(e) => setTransactionId(e.target.value)}
                      className="h-12 rounded-xl text-base font-medium bg-muted/30 border-border/50 focus:bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                      <Camera className="h-3.5 w-3.5" /> Payment Screenshot <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      {screenshotPreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-border/50">
                          <img src={screenshotPreview} alt="Payment screenshot" className="w-full max-h-48 object-contain bg-muted/20" />
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
                          <p className="text-xs text-muted-foreground/60 mt-0.5">Required — PNG, JPG up to 5MB</p>
                          <input type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    className="w-full h-14 gap-2.5 text-base rounded-2xl font-bold shadow-lg"
                    onClick={handlePurchase}
                    disabled={selectedPack === null || !senderNumber || !transactionId || !screenshotFile || isPurchasing}
                  >
                    <PrangsIcon size="sm" />
                    {isPurchasing ? "Submitting..." : "Submit Purchase Request"}
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* Store View */}
            {view === "store" && (
              <motion.div key="store" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {/* Balance mini card */}
                <Card className="p-3 mb-4 bg-gradient-to-r from-primary/5 to-transparent border-primary/15 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PrangsIcon size="sm" />
                    <span className="font-bold">{balance.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">available</span>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => setView("purchase")}>
                    <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Get More
                  </Button>
                </Card>
                <WalletStore />
              </motion.div>
            )}

            {/* History View */}
            {view === "history" && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="pl-10 h-11 rounded-xl bg-muted/30"
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {([
                    { key: "all", label: "All" },
                    { key: "sent", label: "Sent" },
                    { key: "received", label: "Received" },
                    { key: "purchases", label: "Purchases" },
                  ] as { key: TxFilter; label: string }[]).map(({ key, label }) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={txFilter === key ? "default" : "outline"}
                      className="rounded-full text-xs whitespace-nowrap"
                      onClick={() => setTxFilter(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                <Card className="overflow-hidden border-border/50">
                  {filteredTransactions && filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx: any, i: number) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-center justify-between p-3.5 px-4 border-b border-border/30 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          {getTypeIcon(tx.type)}
                          <div>
                            <p className="text-sm font-semibold">{getTypeLabel(tx.type)}</p>
                            <p className="text-[11px] text-muted-foreground">{format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}</p>
                            {tx.reference && <p className="text-[10px] text-muted-foreground/60 font-mono">Ref: {tx.reference}</p>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-bold tabular-nums ${isSend(tx.type) ? "text-destructive" : "text-emerald-500"}`}>
                              {isSend(tx.type) ? "-" : "+"}{tx.amount}
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
                      <p className="font-semibold text-muted-foreground">No transactions found</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Try a different filter</p>
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
