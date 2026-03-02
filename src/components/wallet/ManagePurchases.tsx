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
  MessageCircle, Megaphone, Eye, TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const itemIcons: Record<string, React.ComponentType<any>> = {
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

interface ManagePurchasesProps {
  onBack: () => void;
}

export const ManagePurchases = ({ onBack }: ManagePurchasesProps) => {
  const { user } = useAuth();
  const { purchases, purchasesLoading } = useStore();
  const queryClient = useQueryClient();
  const [editingEmoji, setEditingEmoji] = useState<string | null>(null);
  const [emojiValue, setEmojiValue] = useState("");

  // Show ALL non-expired purchases (both active and disabled) so user can toggle back on
  const manageable = purchases?.filter((p: any) => {
    if (p.expires_at && new Date(p.expires_at) < new Date()) return false;
    if (p.status === "expired") return false;
    return p.status === "active" || p.status === "disabled";
  }) || [];

  const expiredPurchases = purchases?.filter((p: any) => {
    return p.status === "expired" ||
      (p.expires_at && new Date(p.expires_at) < new Date());
  }) || [];

  const togglePurchase = async (purchaseId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "disabled" : "active";
    try {
      const { error } = await supabase
        .from("store_purchases" as any)
        .update({ status: newStatus } as any)
        .eq("id", purchaseId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["store-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["active-effects", user?.id] });
      toast({
        title: newStatus === "active" ? "Effect enabled" : "Effect disabled",
        description: newStatus === "active" ? "This effect is now visible." : "This effect has been hidden.",
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    }
  };

  const saveEmoji = async (_purchaseId: string) => {
    if (!emojiValue.trim()) return;
    localStorage.setItem(`custom_emoji_${user?.id}`, emojiValue);
    setEditingEmoji(null);
    queryClient.invalidateQueries({ queryKey: ["active-effects", user?.id] });
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

      {/* Manageable Purchases (active + disabled, non-expired) */}
      {manageable.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            Your Features ({manageable.length})
          </h3>
          {manageable.map((purchase: any, i: number) => {
            const item = purchase.store_items;
            const Icon = itemIcons[item?.icon] || ShoppingBag;
            const isEnabled = purchase.status === "active";

            return (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={`p-4 transition-all ${!isEnabled ? "opacity-60" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isEnabled ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`h-5 w-5 ${isEnabled ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">{item?.name || "Unknown Item"}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant={isEnabled ? "default" : "outline"}
                          className="text-[9px] px-1.5 py-0"
                        >
                          {isEnabled ? "Active" : "Disabled"}
                        </Badge>
                        {purchase.expires_at && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDistanceToNow(new Date(purchase.expires_at))} left
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => togglePurchase(purchase.id, purchase.status)}
                    />
                  </div>

                  {/* Custom emoji editor */}
                  {(item?.icon === "custom_badge" || item?.icon === "custom_emoji") && isEnabled && (
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

      {/* No manageable purchases */}
      {manageable.length === 0 && (
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
