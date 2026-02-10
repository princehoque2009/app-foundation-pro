import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  BadgeCheck, Sparkles, Rocket, Crown, Palette, Frame, Star,
  ShoppingBag, Clock, ArrowLeft, ToggleLeft, Smile,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
};

interface ManagePurchasesProps {
  onBack: () => void;
}

export const ManagePurchases = ({ onBack }: ManagePurchasesProps) => {
  const { user } = useAuth();
  const { purchases, purchasesLoading } = useStore();
  const queryClient = useQueryClient();
  const [editingEmoji, setEditingEmoji] = useState<string | null>(null);
  const [emojiValue, setEmojiValue] = useState("");

  const activePurchases = purchases?.filter((p: any) => {
    if (p.status !== "active") return false;
    if (p.expires_at && new Date(p.expires_at) < new Date()) return false;
    return true;
  }) || [];

  const expiredPurchases = purchases?.filter((p: any) => {
    return p.status === "expired" || p.status === "disabled" ||
      (p.expires_at && new Date(p.expires_at) < new Date());
  }) || [];

  const togglePurchase = async (purchaseId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "disabled" : "active";
    const { error } = await supabase
      .from("store_purchases" as any)
      .update({ status: newStatus } as any)
      .eq("id", purchaseId);

    if (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["store-purchases"] });
    queryClient.invalidateQueries({ queryKey: ["active-effects"] });
    toast({
      title: newStatus === "active" ? "Effect enabled" : "Effect disabled",
      description: newStatus === "active" ? "This effect is now visible." : "This effect has been hidden.",
    });
  };

  const saveEmoji = async (purchaseId: string) => {
    if (!emojiValue.trim()) return;
    // Store the custom emoji in the purchase metadata via a simple update
    // We'll use the 'reference' concept - store it in a custom way
    const { error } = await supabase
      .from("store_purchases" as any)
      .update({ price_paid: undefined } as any) // no-op to trigger update
      .eq("id", purchaseId);

    // For now we store emoji preference in localStorage until we add a metadata column
    localStorage.setItem(`custom_emoji_${user?.id}`, emojiValue);
    setEditingEmoji(null);
    toast({ title: "Emoji saved!", description: `Your custom emoji is now: ${emojiValue}` });
  };

  if (purchasesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="font-bold text-lg">Manage Effects</h2>
          <p className="text-xs text-muted-foreground">Enable, disable, or customize your purchased features</p>
        </div>
      </div>

      {/* Active Purchases */}
      {activePurchases.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            Active ({activePurchases.length})
          </h3>
          {activePurchases.map((purchase: any, i: number) => {
            const item = purchase.store_items;
            const Icon = itemIcons[item?.icon] || ShoppingBag;
            const isDisabled = purchase.status === "disabled";

            return (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-muted">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">{item?.name || "Unknown Item"}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {purchase.expires_at && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDistanceToNow(new Date(purchase.expires_at))} left
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={purchase.status === "active"}
                      onCheckedChange={() => togglePurchase(purchase.id, purchase.status)}
                    />
                  </div>

                  {/* Custom emoji editor */}
                  {item?.icon === "custom_badge" && purchase.status === "active" && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      {editingEmoji === purchase.id ? (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs shrink-0">Emoji:</Label>
                          <Input
                            value={emojiValue}
                            onChange={(e) => setEmojiValue(e.target.value)}
                            placeholder="Enter an emoji ✨"
                            className="h-8 text-sm"
                            maxLength={2}
                          />
                          <Button size="sm" className="h-8 text-xs" onClick={() => saveEmoji(purchase.id)}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingEmoji(purchase.id);
                            setEmojiValue(localStorage.getItem(`custom_emoji_${user?.id}`) || "★");
                          }}
                          className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                        >
                          <Smile className="h-3.5 w-3.5" />
                          Customize badge emoji: {localStorage.getItem(`custom_emoji_${user?.id}`) || "★"}
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* No active purchases */}
      {activePurchases.length === 0 && (
        <Card className="p-8 text-center">
          <ToggleLeft className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No active effects</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Purchase items from the store to customize your profile</p>
        </Card>
      )}

      {/* Expired */}
      {expiredPurchases.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            Expired ({expiredPurchases.length})
          </h3>
          {expiredPurchases.slice(0, 5).map((purchase: any) => {
            const item = purchase.store_items;
            const Icon = itemIcons[item?.icon] || ShoppingBag;
            return (
              <Card key={purchase.id} className="p-3 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-muted-foreground">{item?.name || "Unknown"}</h4>
                    <p className="text-[10px] text-muted-foreground/60">Expired</p>
                  </div>
                  <Badge variant="outline" className="text-[9px]">Expired</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
