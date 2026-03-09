import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { Zap, ArrowLeft, Gamepad2, Trophy, Target, Puzzle, Timer, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";

// Mini-game: Tap Counter Challenge
const TapChallenge = () => {
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bestScore, setBestScore] = useState(() => {
    return parseInt(localStorage.getItem("prangon_tap_best") || "0");
  });

  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [isPlaying, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      if (taps > bestScore) {
        setBestScore(taps);
        localStorage.setItem("prangon_tap_best", taps.toString());
      }
    }
  }, [timeLeft, isPlaying, taps, bestScore]);

  const startGame = () => {
    setTaps(0);
    setTimeLeft(10);
    setIsPlaying(true);
  };

  return (
    <Card className="p-5 border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-[#FF5A5F]" />
        <h3 className="font-semibold text-foreground">Tap Challenge</h3>
        <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
          <Trophy className="h-3.5 w-3.5 text-amber-500" /> Best: {bestScore}
        </span>
      </div>

      {!isPlaying && timeLeft === 10 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">Tap as fast as you can in 10 seconds!</p>
          <Button onClick={startGame} className="bg-[#FF5A5F] hover:bg-[#FF5A5F]/90 text-white">
            Start Game
          </Button>
        </div>
      ) : isPlaying ? (
        <div className="text-center">
          <div className="flex justify-between items-center mb-3">
            <span className="text-2xl font-bold text-foreground">{taps}</span>
            <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Timer className="h-4 w-4" /> {timeLeft}s
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setTaps((t) => t + 1)}
            className="w-full py-8 rounded-2xl bg-gradient-to-br from-[#FF5A5F] to-[#FF8A5C] text-white text-xl font-bold shadow-lg active:shadow-md transition-shadow"
          >
            TAP!
          </motion.button>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-3xl font-bold text-foreground mb-1">{taps}</p>
          <p className="text-sm text-muted-foreground mb-4">
            taps in 10 seconds {taps >= bestScore && taps > 0 ? "🎉 New Record!" : ""}
          </p>
          <Button onClick={startGame} variant="outline">
            Play Again
          </Button>
        </div>
      )}
    </Card>
  );
};

// Mini-game: Memory Match
const MemoryMatch = () => {
  const emojis = ["🔥", "⭐", "💎", "🎯", "🚀", "💫"];
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const initGame = useCallback(() => {
    const shuffled = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  }, []);

  useEffect(() => { initGame(); }, [initGame]);

  const handleFlip = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        setMatched((m) => [...m, ...newFlipped]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  const isComplete = matched.length === cards.length && cards.length > 0;

  return (
    <Card className="p-5 border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Puzzle className="h-5 w-5 text-purple-500" />
        <h3 className="font-semibold text-foreground">Memory Match</h3>
        <span className="ml-auto text-xs text-muted-foreground">Moves: {moves}</span>
      </div>

      {isComplete ? (
        <div className="text-center py-4">
          <p className="text-2xl mb-1">🎉</p>
          <p className="font-semibold text-foreground mb-1">Completed in {moves} moves!</p>
          <Button onClick={initGame} variant="outline" size="sm" className="mt-2">
            Play Again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {cards.map((emoji, i) => {
            const isFlipped = flipped.includes(i) || matched.includes(i);
            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleFlip(i)}
                className={`aspect-square rounded-xl text-lg flex items-center justify-center transition-colors font-medium ${
                  isFlipped
                    ? "bg-muted border border-border"
                    : "bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-200/30 dark:border-purple-800/30"
                }`}
              >
                {isFlipped ? emoji : "?"}
              </motion.button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

const Gaming = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center h-14 px-4 max-w-screen-xl mx-auto gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <Gamepad2 className="h-5 w-5 text-foreground" />
            <h1 className="font-semibold text-lg">Gaming</h1>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-screen-md mx-auto p-4 space-y-4"
        >
          {/* Header card */}
          <Card className="p-5 bg-gradient-to-br from-[#7C3AED]/10 to-[#EC4899]/10 border-purple-200/30 dark:border-purple-800/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#EC4899] flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Mini Games</h2>
                <p className="text-xs text-muted-foreground">Quick games to play while you scroll</p>
              </div>
            </div>
          </Card>

          <TapChallenge />
          <MemoryMatch />

          {/* Coming soon */}
          <Card className="p-5 border-border/50 border-dashed text-center">
            <Star className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">More games coming soon</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Trivia, word games, and more!</p>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Gaming;
