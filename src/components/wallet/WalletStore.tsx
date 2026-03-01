import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PrangsIcon } from "@/components/wallet/PrangsIcon";
import { ConfirmTransactionDialog } from "@/components/wallet/ConfirmTransactionDialog";
import { PurchaseSuccessAnimation } from "@/components/wallet/PurchaseSuccessAnimation";
import { useWallet } from "@/hooks/useWallet";
import { useStore } from "@/hooks/useStore";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  BadgeCheck, Sparkles, Rocket, Crown, Palette, Frame, Star,
  ShoppingBag, Lock, CheckCircle2, Clock, Timer, Smile,
  MessageCircle, Megaphone, Eye, TrendingUp,
} from "lucide-react";

const itemIcons: Record<string, any> = {
  verified: BadgeCheck,
  frame_gold: Crown,
  frame_neon: Sparkles,
  rainbow: Palette,
  boost_24: Rocket,
  boost_7d: Rocket,
  spotlight: Star,
  custom_badge: Frame,
  custom_emoji: Smile,
  chat_theme: MessageCircle,
  announcement: Megaphone,
  profile_views: Eye,
  trending: TrendingUp,
};

const durationLabels: Record<number, string> = {
  1: "24 hours",
  7: "7 days",
  30: "30 days",
  90: "90 days",
};

const categoryIcons: Record<string, any> = {
  badge: BadgeCheck,
  decoration: Palette,
  boost: Rocket,
};

export const WalletStore = () => {
  const { wallet, purchaseStoreItem, isPurchasingItem } = useWallet();
  const { storeItems, storeLoading, hasItem, getItemExpiry } = useStore();
  const balance = (wallet as any)?.balance || 0;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  
  // Purchase success animation state
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState({ itemName: "", amount: 0, prevBalance: 0, newBalance: 0, duration: null as string | null });

  const categories = ["all", "badge", "decoration", "boost"];

  const filteredItems = activeCategory === "all"
    ? storeItems
    : storeItems?.filter((item: any) => item.category === activeCategory);

  const handleBuy = (item: any) => {
    setSelectedItem(item);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedItem) return;
    const prevBal = balance;
    await purchaseStoreItem({ itemId: selectedItem.id });
    
    const durationDays = selectedItem.metadata?.duration_days;
    const durLabel = durationDays ? (durationLabels[durationDays] || `${durationDays} days`) : null;
    
    setSuccessData({
      itemName: selectedItem.name,
      amount: selectedItem.price,
      prevBalance: prevBal,
      newBalance: prevBal - selectedItem.price,
      duration: durLabel,
    });
    setConfirmOpen(false);
    setSelectedItem(null);
    setShowSuccess(true);
  };

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={activeCategory === cat ? "default" : "outline"}
            className="rounded-full text-xs capitalize whitespace-nowrap"
            onClick={() => setActiveCategory(cat)}
          >
            {cat === "all" ? (
              <><ShoppingBag className="h-3.5 w-3.5 mr-1" /> All</>
            ) : (
              <>
                {(() => { const Icon = categoryIcons[cat] || ShoppingBag; return <Icon className="h-3.5 w-3.5 mr-1" />; })()}
                {cat}s
              </>
            )}
          </Button>
        ))}
      </div>

      {/* Store Items Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredItems?.map((item: any, i: number) => {
          const Icon = itemIcons[item.icon] || ShoppingBag;
          const owned = hasItem(item.icon);
          const canAfford = balance >= item.price;
          const durationDays = item.metadata?.duration_days;
          const durationLabel = durationDays ? durationLabels[durationDays] || `${durationDays}d` : null;
          const expiresAt = owned ? getItemExpiry(item.icon) : null;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <Card className={`p-4 relative overflow-hidden border-border/50 ${owned ? "ring-2 ring-emerald-500/40" : ""}`}>
                {/* Duration badge */}
                {durationLabel && !owned && (
                  <Badge variant="outline" className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 gap-0.5 bg-background/80 backdrop-blur-sm">
                    <Timer className="h-2.5 w-2.5" />
                    {durationLabel}
                  </Badge>
                )}

                {/* Active indicator with remaining time */}
                {owned && expiresAt && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                    <Badge className="text-[8px] px-1.5 py-0.5 gap-0.5 bg-emerald-500 hover:bg-emerald-500">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(expiresAt))}
                    </Badge>
                  </div>
                )}
                {owned && !expiresAt && (
                  <div className="absolute top-1.5 right-1.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/20" />
                  </div>
                )}

                {/* B&W icon */}
                <div className="p-2.5 rounded-xl bg-muted w-fit mb-3">
                  <Icon className="h-6 w-6 text-foreground grayscale opacity-70" />
                </div>

                <h4 className="font-bold text-sm leading-tight">{item.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{item.description}</p>

                <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="font-black text-base">{item.price}</span>
                    <PrangsIcon size="xs" />
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs rounded-lg px-3"
                    disabled={owned || !canAfford || isPurchasingItem}
                    onClick={() => handleBuy(item)}
                  >
                    {owned ? "Active" : !canAfford ? <Lock className="h-3 w-3" /> : "Buy"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {(!filteredItems || filteredItems.length === 0) && (
        <div className="text-center py-12">
          <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No items available</p>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmTransactionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm Purchase"
        description={selectedItem?.metadata?.duration_days
          ? `This item will be active for ${durationLabels[selectedItem.metadata.duration_days] || selectedItem.metadata.duration_days + " days"}.`
          : "You're about to purchase an item from the Prangs Store."}
        amount={selectedItem?.price || 0}
        currentBalance={balance}
        onConfirm={handleConfirm}
        isLoading={isPurchasingItem}
        itemName={selectedItem?.name}
      />

      {/* Success Animation */}
      <PurchaseSuccessAnimation
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        itemName={successData.itemName}
        amount={successData.amount}
        previousBalance={successData.prevBalance}
        newBalance={successData.newBalance}
        duration={successData.duration}
      />
    </div>
  );
};
