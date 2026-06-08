import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useChatPreferences,
  CHAT_THEMES,
  DEFAULT_QUICK_REACTIONS,
} from "@/hooks/useChatPreferences";

const REACTION_POOL = [
  "❤️","😂","😮","😢","👍","🔥","🎉","💯","✨","🙌","👏","😍","🥰","😎","🤔","😭","😡","🙏","💔","🤩","😴","🤯","🤝","💪",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string | null;
  friendLabel: string;
}

export const ChatCustomizeDialog = ({ open, onOpenChange, conversationId, friendLabel }: Props) => {
  const { prefs, update } = useChatPreferences(conversationId);
  const [nicknameDraft, setNicknameDraft] = useState("");

  useEffect(() => {
    if (open) setNicknameDraft(prefs.nickname || "");
  }, [open, prefs.nickname]);

  const quickReactions = prefs.quick_reactions?.length ? prefs.quick_reactions : DEFAULT_QUICK_REACTIONS;

  const toggleReaction = (emoji: string) => {
    const set = new Set(quickReactions);
    if (set.has(emoji)) {
      if (set.size <= 1) return;
      set.delete(emoji);
    } else {
      if (set.size >= 6) {
        // replace last
        const arr = quickReactions.slice(0, 5);
        update({ quick_reactions: [...arr, emoji] });
        return;
      }
      set.add(emoji);
    }
    update({ quick_reactions: Array.from(set) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle>Customize chat</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="px-5 pb-5 space-y-5">
            {/* Live preview */}
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Preview</p>
              <div className="flex flex-col gap-1.5">
                <div className="self-start max-w-[70%] rounded-2xl bg-background border px-3 py-1.5 text-sm">
                  Hey {prefs.nickname?.trim() || friendLabel} 👋
                </div>
                <div
                  className="self-end max-w-[70%] rounded-2xl px-3 py-1.5 text-sm text-white shadow-sm"
                  style={{ background: (CHAT_THEMES.find(t=>t.id===prefs.theme)?.gradient) || CHAT_THEMES[0].gradient }}
                >
                  Looks great!
                </div>
              </div>
            </div>

            {/* Nickname */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Nickname for {friendLabel}
              </label>
              <div className="flex gap-2">
                <Input
                  value={nicknameDraft}
                  onChange={(e) => setNicknameDraft(e.target.value)}
                  placeholder={friendLabel}
                  maxLength={40}
                  className="rounded-full"
                />
                <Button
                  onClick={() => update({ nickname: nicknameDraft.trim() || null })}
                  className="rounded-full"
                >
                  Save
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Only visible to you.</p>
            </div>

            {/* Themes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Bubble theme</label>
              <div className="grid grid-cols-3 gap-2">
                {CHAT_THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => update({ theme: t.id })}
                    className={cn(
                      "h-14 rounded-2xl text-white text-xs font-semibold flex items-end justify-start p-2 transition-all",
                      prefs.theme === t.id ? "ring-2 ring-foreground scale-[1.02]" : "hover:scale-[1.02]"
                    )}
                    style={{ background: t.gradient }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick reactions */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Quick reactions (tap to toggle, up to 6)
              </label>
              <div className="grid grid-cols-8 gap-1">
                {REACTION_POOL.map((e) => {
                  const active = quickReactions.includes(e);
                  return (
                    <button
                      key={e}
                      onClick={() => toggleReaction(e)}
                      className={cn(
                        "h-9 w-9 rounded-full text-lg flex items-center justify-center transition",
                        active ? "bg-primary/15 ring-2 ring-primary" : "hover:bg-muted"
                      )}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
