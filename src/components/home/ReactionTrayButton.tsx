import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { REACTION_TYPES, ReactionKey, getReactionMeta } from "@/hooks/usePostReactions";
import { Heart } from "lucide-react";

interface ReactionTrayButtonProps {
  currentReaction: ReactionKey | null;
  count: number;
  onReact: (reaction: ReactionKey | null) => void;
  disabled?: boolean;
}

// Plays a soft "pop" sound via WebAudio (no asset needed)
const playPop = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(440, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.2);
  } catch {/* silent */}
};

export const ReactionTrayButton = ({
  currentReaction,
  count,
  onReact,
  disabled,
}: ReactionTrayButtonProps) => {
  const [trayOpen, setTrayOpen] = useState(false);
  const [floatingKey, setFloatingKey] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const triggeredLongPress = useRef(false);

  const meta = currentReaction ? getReactionMeta(currentReaction) : null;
  const hasReacted = !!currentReaction;

  const handlePointerDown = useCallback(() => {
    triggeredLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      triggeredLongPress.current = true;
      setTrayOpen(true);
    }, 280);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = () => {
    if (triggeredLongPress.current) {
      triggeredLongPress.current = false;
      return;
    }
    // Quick tap → toggle Like
    if (currentReaction === "like") {
      onReact(null);
    } else {
      playPop();
      setFloatingKey("like");
      setTimeout(() => setFloatingKey(null), 700);
      onReact("like");
    }
  };

  const handlePick = (key: ReactionKey) => {
    playPop();
    setFloatingKey(key);
    setTimeout(() => setFloatingKey(null), 700);
    if (currentReaction === key) {
      onReact(null);
    } else {
      onReact(key);
    }
    setTrayOpen(false);
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {floatingKey && (
          <motion.span
            initial={{ scale: 0.6, opacity: 1, y: 0 }}
            animate={{ scale: 1.6, opacity: 0, y: -36 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute -top-2 left-3 text-2xl pointer-events-none z-20"
          >
            {getReactionMeta(floatingKey).emoji}
          </motion.span>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {trayOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setTrayOpen(false)}
              onTouchStart={() => setTrayOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              className="absolute bottom-12 left-0 z-40 flex items-center gap-1 p-1.5 rounded-full bg-popover border border-border shadow-2xl"
            >
              {REACTION_TYPES.map((r, i) => (
                <motion.button
                  key={r.key}
                  initial={{ opacity: 0, y: 8, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.025, type: "spring", stiffness: 460, damping: 18 }}
                  whileHover={{ scale: 1.35, y: -6 }}
                  whileTap={{ scale: 1.1 }}
                  onClick={(e) => { e.stopPropagation(); handlePick(r.key); }}
                  title={r.label}
                  aria-label={r.label}
                  className={cn(
                    "h-10 w-10 flex items-center justify-center rounded-full text-2xl",
                    "bg-gradient-to-br shadow-md hover:shadow-lg transition-shadow",
                    r.color,
                    currentReaction === r.key && `ring-2 ring-offset-2 ring-offset-popover ${r.ring}`
                  )}
                >
                  <span className="drop-shadow-sm">{r.emoji}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        disabled={disabled}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => { e.preventDefault(); setTrayOpen(true); }}
        whileTap={{ scale: 0.92 }}
        className={cn(
          "h-10 px-3 rounded-full hover:bg-muted/60 transition-all flex items-center gap-1.5",
          hasReacted && "text-primary"
        )}
      >
        {hasReacted && meta ? (
          <motion.span
            key={meta.key}
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="text-2xl leading-none"
          >
            {meta.emoji}
          </motion.span>
        ) : (
          <Heart className="h-6 w-6 text-foreground" />
        )}
        {count > 0 && (
          <span className="text-sm font-semibold tabular-nums">{count}</span>
        )}
      </motion.button>
    </div>
  );
};
