import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PrangsIcon } from "@/components/wallet/PrangsIcon";
import { ConfirmTransactionDialog } from "@/components/wallet/ConfirmTransactionDialog";
import { useWallet } from "@/hooks/useWallet";
import { useStore } from "@/hooks/useStore";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  BadgeCheck,
  Sparkles,
  Rocket,
  Crown,
  Palette,
  Frame,
  Star,
  ShoppingBag,
  Lock,
  CheckCircle2,
  Clock,
  Timer,
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
};

const itemGradients: Record<string, string> = {
  verified: "from-blue-500/15 to-indigo-500/15 border-blue-500/25",
  frame_gold: "from-amber-500/15 to-yellow-500/15 border-amber-500/25",
  frame_neon: "from-fuchsia-500/15 to-purple-500/15 border-fuchsia-500/25",
  rainbow: "from-pink-500/15 to-orange-500/15 border-pink-500/25",
  boost_24: "from-emerald-500/15 to-teal-500/15 border-emerald-500/25",
  boost_7d: "from-cyan-500/15 to-blue-500/15 border-cyan-500/25",
  spotlight: "from-orange-500/15 to-red-500/15 border-orange-500/25",
  custom_badge: "from-violet-500/15 to-purple-500/15 border-violet-500/25",
};

const itemIconColors: Record<string, string> = {
  verified: "text-blue-500",
  frame_gold: "text-amber-500",
  frame_neon: "text-fuchsia-500",
  rainbow: "text-pink-500",
  boost_24: "text-emerald-500",
  boost_7d: "text-cyan-500",
  spotlight: "text-orange-500",
  custom_badge: "text-violet-500",
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
    await purchaseStoreItem({ itemId: selectedItem.id });
    setConfirmOpen(false);
    setSelectedItem(null);
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
          const gradient = itemGradients[item.icon] || "from-muted/50 to-muted/30 border-border/50";
          const iconColor = itemIconColors[item.icon] || "text-primary";
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
              <Card className={`p-4 relative overflow-hidden bg-gradient-to-br ${gradient} ${owned ? "ring-2 ring-emerald-500/40" : ""}`}>
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

                <div className={`p-2.5 rounded-xl bg-background/60 backdrop-blur-sm w-fit mb-3`}>
                  <Icon className={`h-6 w-6 ${iconColor}`} />
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
    </div>
  );
};
