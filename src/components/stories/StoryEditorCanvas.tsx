import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Type, Smile, Paintbrush, Sparkles, Undo2, Redo2, X, Check,
  Bold, Italic, AlignCenter, Palette, BarChart3, HelpCircle,
  Timer, MapPin, AtSign, ChevronDown, Music
} from "lucide-react";

// ─── Text Styles ───────────────────────────────────────────────
const FONT_STYLES = [
  { id: "modern", label: "Modern", font: "'Work Sans', sans-serif", weight: 700 },
  { id: "serif", label: "Serif", font: "'Lora', serif", weight: 600 },
  { id: "mono", label: "Mono", font: "'Inconsolata', monospace", weight: 700 },
  { id: "handwritten", label: "Script", font: "cursive", weight: 400 },
];

const TEXT_COLORS = [
  "#FFFFFF", "#000000", "#FF4F5A", "#FF9500", "#FFCC00",
  "#34C759", "#007AFF", "#AF52DE", "#FF2D55",
];

// ─── Sticker Types ─────────────────────────────────────────────
const EMOJI_STICKERS = ["😂", "❤️", "🔥", "✨", "🎉", "💯", "🥰", "😎", "🤩", "💀", "👀", "🙌"];

// ─── Filters ───────────────────────────────────────────────────
const FILTERS = [
  { id: "none", label: "Original", css: "" },
  { id: "warm", label: "Warm", css: "brightness(1.1) saturate(1.3) sepia(0.15)" },
  { id: "cool", label: "Cool", css: "brightness(1.05) saturate(0.9) hue-rotate(15deg)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.4) contrast(1.1) brightness(0.95)" },
  { id: "dramatic", label: "Drama", css: "contrast(1.4) saturate(1.2) brightness(0.9)" },
  { id: "fade", label: "Fade", css: "contrast(0.85) brightness(1.1) saturate(0.8)" },
  { id: "bw", label: "B&W", css: "grayscale(1) contrast(1.2)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.6) contrast(1.1)" },
];

type EditorTool = "none" | "text" | "stickers" | "draw" | "filters" | "music";

export interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  bgColor: string | null;
  fontStyle: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
}

export interface StickerElement {
  id: string;
  type: "emoji" | "poll" | "question" | "countdown" | "mention" | "location";
  x: number;
  y: number;
  scale: number;
  data: any;
}

export interface DrawingPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface StoryEditorCanvasProps {
  mediaSrc: string;
  mediaType: "image" | "video";
  onSave: (data: {
    texts: TextElement[];
    stickers: StickerElement[];
    drawings: DrawingPath[];
    filter: string;
    musicUrl?: string;
    musicTitle?: string;
  }) => void;
  onCancel: () => void;
}

export const StoryEditorCanvas = ({
  mediaSrc,
  mediaType,
  onSave,
  onCancel,
}: StoryEditorCanvasProps) => {
  const [activeTool, setActiveTool] = useState<EditorTool>("none");
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [stickers, setStickers] = useState<StickerElement[]>([]);
  const [drawings, setDrawings] = useState<DrawingPath[]>([]);
  const [undoStack, setUndoStack] = useState<DrawingPath[][]>([]);
  const [activeFilter, setActiveFilter] = useState("none");

  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [newTextValue, setNewTextValue] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textBg, setTextBg] = useState<string | null>(null);
  const [textFontStyle, setTextFontStyle] = useState("modern");
  const [textBold, setTextBold] = useState(true);
  const [textItalic, setTextItalic] = useState(false);

  // Drawing state
  const [drawColor, setDrawColor] = useState("#FFFFFF");
  const [drawWidth, setDrawWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  // Sticker sub-panel
  const [stickerPanel, setStickerPanel] = useState<"emoji" | "interactive">("emoji");

  // Poll creation
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  // Question sticker
  const [questionText, setQuestionText] = useState("");

  // Music state
  const [selectedMusic, setSelectedMusic] = useState<{ url: string; title: string; artist: string } | null>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    document.body.classList.add("story-editor-open");
    return () => {
      document.body.classList.remove("story-editor-open");
    };
  }, []);

  // Drawing handlers
  const getRelativePos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool !== "draw") return;
    e.preventDefault();
    const pos = getRelativePos(e);
    setIsDrawing(true);
    setCurrentPath([pos]);
  };

  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || activeTool !== "draw") return;
    e.preventDefault();
    const pos = getRelativePos(e);
    setCurrentPath(prev => [...prev, pos]);
  };

  const handleDrawEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      setUndoStack(prev => [...prev, drawings]);
      setDrawings(prev => [...prev, { points: currentPath, color: drawColor, width: drawWidth }]);
    }
    setCurrentPath([]);
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      setDrawings(undoStack[undoStack.length - 1]);
      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  // Text handlers
  const addTextElement = () => {
    if (!newTextValue.trim()) return;
    const newText: TextElement = {
      id: Date.now().toString(),
      text: newTextValue,
      x: 50,
      y: 50,
      color: textColor,
      bgColor: textBg,
      fontStyle: textFontStyle,
      fontSize: 24,
      bold: textBold,
      italic: textItalic,
    };
    setTexts(prev => [...prev, newText]);
    setNewTextValue("");
    setEditingTextId(null);
  };

  // Sticker handlers
  const addEmoji = (emoji: string) => {
    setStickers(prev => [...prev, {
      id: Date.now().toString(),
      type: "emoji",
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      scale: 1,
      data: { emoji },
    }]);
  };

  const addPollSticker = () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    setStickers(prev => [...prev, {
      id: Date.now().toString(),
      type: "poll",
      x: 50,
      y: 50,
      scale: 1,
      data: { question: pollQuestion, options: pollOptions.filter(o => o.trim()) },
    }]);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  const addQuestionSticker = () => {
    setStickers(prev => [...prev, {
      id: Date.now().toString(),
      type: "question",
      x: 50,
      y: 60,
      scale: 1,
      data: { question: questionText || "Ask me a question" },
    }]);
    setQuestionText("");
  };

  const addCountdownSticker = () => {
    setStickers(prev => [...prev, {
      id: Date.now().toString(),
      type: "countdown",
      x: 50,
      y: 40,
      scale: 1,
      data: { label: "Countdown", endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
    }]);
  };

  const removeSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  };

  const removeText = (id: string) => {
    setTexts(prev => prev.filter(t => t.id !== id));
  };

  const filterCss = FILTERS.find(f => f.id === activeFilter)?.css || "";

  // Dragging state for elements
  const [dragging, setDragging] = useState<{ id: string; type: "text" | "sticker"; startX: number; startY: number; elemX: number; elemY: number } | null>(null);

  const handleElementDragStart = (e: React.MouseEvent | React.TouchEvent, id: string, type: "text" | "sticker", elemX: number, elemY: number) => {
    if (activeTool === "draw") return;
    e.stopPropagation();
    const pos = getRelativePos(e);
    setDragging({ id, type, startX: pos.x, startY: pos.y, elemX, elemY });
  };

  const handleElementDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) return;
    e.preventDefault();
    const pos = getRelativePos(e);
    const dx = pos.x - dragging.startX;
    const dy = pos.y - dragging.startY;
    const newX = Math.max(5, Math.min(95, dragging.elemX + dx));
    const newY = Math.max(5, Math.min(95, dragging.elemY + dy));

    if (dragging.type === "text") {
      setTexts(prev => prev.map(t => t.id === dragging.id ? { ...t, x: newX, y: newY } : t));
    } else {
      setStickers(prev => prev.map(s => s.id === dragging.id ? { ...s, x: newX, y: newY } : s));
    }
  };

  const handleElementDragEnd = () => {
    setDragging(null);
  };

  const handleSave = () => {
    onSave({ texts, stickers, drawings, filter: activeFilter, musicUrl: selectedMusic?.url, musicTitle: selectedMusic?.title });
  };

  const tools = [
    { id: "text" as EditorTool, icon: Type, label: "Text" },
    { id: "stickers" as EditorTool, icon: Smile, label: "Stickers" },
    { id: "draw" as EditorTool, icon: Paintbrush, label: "Draw" },
    { id: "filters" as EditorTool, icon: Sparkles, label: "Filters" },
    { id: "music" as EditorTool, icon: Music, label: "Music" },
  ];

  return (
    <div className="fixed inset-0 z-[90] bg-black flex flex-col overscroll-none">
      {/* Top toolbar */}
      <div className="relative z-40 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/10">
          <X className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          {activeTool === "draw" && (
            <>
              <Button variant="ghost" size="icon" onClick={handleUndo} className="text-white hover:bg-white/10" disabled={undoStack.length === 0}>
                <Undo2 className="h-5 w-5" />
              </Button>
            </>
          )}
          <Button onClick={handleSave} className="rounded-full px-6 gap-2 bg-primary hover:bg-primary/90">
            <Check className="h-4 w-4" />
            Done
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden w-full touch-none"
        onMouseDown={activeTool === "draw" ? handleDrawStart : undefined}
        onMouseMove={activeTool === "draw" ? handleDrawMove : (dragging ? handleElementDragMove : undefined)}
        onMouseUp={activeTool === "draw" ? handleDrawEnd : handleElementDragEnd}
        onMouseLeave={activeTool === "draw" ? handleDrawEnd : handleElementDragEnd}
        onTouchStart={activeTool === "draw" ? handleDrawStart : undefined}
        onTouchMove={activeTool === "draw" ? handleDrawMove : (dragging ? handleElementDragMove : undefined)}
        onTouchEnd={activeTool === "draw" ? handleDrawEnd : handleElementDragEnd}
      >
        {/* Media */}
        {mediaType === "image" ? (
          <img
            src={mediaSrc}
            alt="Story"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            style={{ filter: filterCss }}
            draggable={false}
          />
        ) : (
          <video
            src={mediaSrc}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ filter: filterCss }}
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        {/* Drawing overlay (SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {drawings.map((path, i) => (
            <polyline
              key={i}
              points={path.points.map(p => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={path.color}
              strokeWidth={path.width / 10}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {isDrawing && currentPath.length > 1 && (
            <polyline
              points={currentPath.map(p => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={drawColor}
              strokeWidth={drawWidth / 10}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {/* Text elements */}
        {texts.map(t => {
          const font = FONT_STYLES.find(f => f.id === t.fontStyle) || FONT_STYLES[0];
          return (
            <div
              key={t.id}
              className="absolute cursor-move select-none group"
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              onMouseDown={(e) => handleElementDragStart(e, t.id, "text", t.x, t.y)}
              onTouchStart={(e) => handleElementDragStart(e, t.id, "text", t.x, t.y)}
            >
              <div className="relative">
                <p
                  style={{
                    fontFamily: font.font,
                    fontWeight: t.bold ? font.weight : 400,
                    fontStyle: t.italic ? "italic" : "normal",
                    color: t.color,
                    backgroundColor: t.bgColor || "transparent",
                    fontSize: `${t.fontSize}px`,
                  }}
                  className="px-3 py-1.5 rounded-lg text-center whitespace-pre-wrap max-w-[80vw]"
                >
                  {t.text}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); removeText(t.id); }}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Sticker elements */}
        {stickers.map(s => (
          <div
            key={s.id}
            className="absolute cursor-move select-none group"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              transform: `translate(-50%, -50%) scale(${s.scale})`,
            }}
            onMouseDown={(e) => handleElementDragStart(e, s.id, "sticker", s.x, s.y)}
            onTouchStart={(e) => handleElementDragStart(e, s.id, "sticker", s.x, s.y)}
          >
            <div className="relative">
              {s.type === "emoji" && (
                <span className="text-5xl">{s.data.emoji}</span>
              )}
              {s.type === "poll" && (
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 min-w-[200px] shadow-xl">
                  <p className="text-sm font-bold text-black mb-2">{s.data.question}</p>
                  {s.data.options.map((opt: string, i: number) => (
                    <div key={i} className="bg-gray-100 rounded-full py-2 px-4 mb-1.5 text-sm text-black text-center font-medium">
                      {opt}
                    </div>
                  ))}
                </div>
              )}
              {s.type === "question" && (
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 min-w-[200px] shadow-xl text-center">
                  <p className="text-xs font-semibold text-primary mb-2">{s.data.question}</p>
                  <div className="bg-gray-100 rounded-full py-2 px-4 text-sm text-gray-400">
                    Type your answer...
                  </div>
                </div>
              )}
              {s.type === "countdown" && (
                <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-4 min-w-[180px] shadow-xl text-center text-white">
                  <p className="text-xs font-semibold mb-1">{s.data.label}</p>
                  <p className="text-2xl font-bold">24:00:00</p>
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); removeSticker(s.id); }}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Right side tool buttons */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3">
        {tools.map(tool => (
          <motion.button
            key={tool.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveTool(activeTool === tool.id ? "none" : tool.id)}
            className={cn(
              "h-11 w-11 rounded-full flex items-center justify-center transition-all",
              activeTool === tool.id ? "bg-primary text-primary-foreground shadow-lg" : "bg-black/40 text-white hover:bg-black/60"
            )}
          >
            <tool.icon className="h-5 w-5" />
          </motion.button>
        ))}
      </div>

      {/* Bottom tool panels */}
      <AnimatePresence>
        {activeTool === "text" && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl rounded-t-3xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-4"
          >
            {/* Text input */}
            <div className="flex gap-2">
              <Input
                value={newTextValue}
                onChange={(e) => setNewTextValue(e.target.value)}
                placeholder="Type your text..."
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-full"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && addTextElement()}
              />
              <Button onClick={addTextElement} size="icon" className="rounded-full" disabled={!newTextValue.trim()}>
                <Check className="h-4 w-4" />
              </Button>
            </div>

            {/* Font styles */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {FONT_STYLES.map(f => (
                <button
                  key={f.id}
                  onClick={() => setTextFontStyle(f.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all",
                    textFontStyle === f.id ? "bg-white text-black" : "bg-white/10 text-white"
                  )}
                  style={{ fontFamily: f.font }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Text formatting */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTextBold(!textBold)}
                className={cn("p-2 rounded-lg transition-all", textBold ? "bg-white/20" : "bg-transparent")}
              >
                <Bold className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={() => setTextItalic(!textItalic)}
                className={cn("p-2 rounded-lg transition-all", textItalic ? "bg-white/20" : "bg-transparent")}
              >
                <Italic className="h-4 w-4 text-white" />
              </button>
              <div className="h-5 w-px bg-white/20" />
              <button
                onClick={() => setTextBg(textBg ? null : "rgba(0,0,0,0.6)")}
                className={cn("p-2 rounded-lg transition-all", textBg ? "bg-white/20" : "bg-transparent")}
              >
                <AlignCenter className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Color picker */}
            <div className="flex gap-2">
              {TEXT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setTextColor(color)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    textColor === color ? "border-white scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {activeTool === "stickers" && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl rounded-t-3xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-4"
          >
            {/* Tab selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setStickerPanel("emoji")}
                className={cn(
                  "flex-1 py-2 rounded-full text-sm font-medium transition-all",
                  stickerPanel === "emoji" ? "bg-white text-black" : "bg-white/10 text-white"
                )}
              >
                😊 Emoji
              </button>
              <button
                onClick={() => setStickerPanel("interactive")}
                className={cn(
                  "flex-1 py-2 rounded-full text-sm font-medium transition-all",
                  stickerPanel === "interactive" ? "bg-white text-black" : "bg-white/10 text-white"
                )}
              >
                ✨ Interactive
              </button>
            </div>

            {stickerPanel === "emoji" && (
              <div className="grid grid-cols-6 gap-3">
                {EMOJI_STICKERS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => addEmoji(emoji)}
                    className="text-3xl p-2 rounded-xl hover:bg-white/10 active:scale-110 transition-all"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {stickerPanel === "interactive" && (
              <div className="space-y-3">
                {/* Poll sticker creation */}
                <div className="bg-white/5 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-white text-sm font-semibold">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Poll
                  </div>
                  <Input
                    value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    className="bg-white/10 border-0 text-white placeholder:text-white/40 text-sm h-9"
                  />
                  {pollOptions.map((opt, i) => (
                    <Input
                      key={i}
                      value={opt}
                      onChange={e => {
                        const next = [...pollOptions];
                        next[i] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="bg-white/10 border-0 text-white placeholder:text-white/40 text-sm h-9"
                    />
                  ))}
                  <div className="flex gap-2">
                    {pollOptions.length < 4 && (
                      <Button variant="ghost" size="sm" onClick={() => setPollOptions([...pollOptions, ""])} className="text-white/60 text-xs">
                        + Add option
                      </Button>
                    )}
                    <Button size="sm" onClick={addPollSticker} className="rounded-full ml-auto" disabled={!pollQuestion.trim()}>
                      Add Poll
                    </Button>
                  </div>
                </div>

                {/* Question sticker */}
                <div className="bg-white/5 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-white text-sm font-semibold">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    Question
                  </div>
                  <Input
                    value={questionText}
                    onChange={e => setQuestionText(e.target.value)}
                    placeholder="Ask me a question..."
                    className="bg-white/10 border-0 text-white placeholder:text-white/40 text-sm h-9"
                  />
                  <Button size="sm" onClick={addQuestionSticker} className="rounded-full w-full">
                    Add Question
                  </Button>
                </div>

                {/* Countdown */}
                <button
                  onClick={addCountdownSticker}
                  className="w-full bg-white/5 rounded-2xl p-3 flex items-center gap-3 text-white hover:bg-white/10 transition-colors"
                >
                  <Timer className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Add Countdown</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {activeTool === "draw" && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl rounded-t-3xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-4"
          >
            {/* Brush size */}
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-xs w-10">Size</span>
              <Slider
                value={[drawWidth]}
                onValueChange={([v]) => setDrawWidth(v)}
                min={1}
                max={20}
                step={1}
                className="flex-1"
              />
              <div className="h-6 w-6 flex items-center justify-center">
                <div className="rounded-full bg-white" style={{ width: drawWidth, height: drawWidth }} />
              </div>
            </div>

            {/* Colors */}
            <div className="flex gap-2 justify-center">
              {TEXT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setDrawColor(color)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform",
                    drawColor === color ? "border-white scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {activeTool === "filters" && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl rounded-t-3xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
          >
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {FILTERS.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <div
                    className={cn(
                      "h-16 w-16 rounded-xl overflow-hidden border-2 transition-all",
                      activeFilter === filter.id ? "border-primary" : "border-transparent"
                    )}
                  >
                    {mediaType === "image" ? (
                      <img
                        src={mediaSrc}
                        alt={filter.label}
                        className="w-full h-full object-cover"
                        style={{ filter: filter.css }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/10" style={{ filter: filter.css }} />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium",
                    activeFilter === filter.id ? "text-primary" : "text-white/60"
                  )}>
                    {filter.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
