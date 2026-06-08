import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Send, X, Play, Pause, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob) => void;
  disabled?: boolean;
}

export const VoiceRecorder = ({ onSend, disabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch (e) {
      console.error("mic error", e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // PREVIEW MODE — recorded, awaiting send
  if (audioBlob && audioUrl) {
    return (
      <div className="absolute inset-x-2 bottom-2 z-20 flex items-center gap-2 bg-card border border-border rounded-full px-2 py-1.5 shadow-md">
        <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0" onClick={togglePlayback}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">{fmt(recordingTime)}</span>
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-full bg-coral-gradient" />
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive shrink-0" onClick={cancelRecording}>
          <X className="h-4 w-4" />
        </Button>
        <Button size="icon" className="h-8 w-8 rounded-full bg-coral-gradient shrink-0" onClick={handleSend}>
          <Send className="h-4 w-4 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isRecording ? (
        <motion.div
          key="rec"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute inset-x-2 bottom-2 z-20 flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-full px-3 py-1.5"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
          </span>
          <span className="text-xs font-medium text-destructive tabular-nums shrink-0">{fmt(recordingTime)}</span>

          <div className="flex-1 min-w-0 flex items-center justify-center gap-[2px] h-5 overflow-hidden">
            {Array.from({ length: 18 }).map((_, i) => (
              <motion.span
                key={i}
                className="w-[2px] bg-destructive/70 rounded-full"
                animate={{ height: [4, Math.random() * 14 + 4, 4] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.04 }}
              />
            ))}
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive shrink-0" onClick={cancelRecording}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="icon" className="h-8 w-8 rounded-full bg-coral-gradient shrink-0" onClick={stopRecording}>
            <Check className="h-4 w-4 text-white" />
          </Button>
        </motion.div>
      ) : (
        <Button
          key="mic"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full shrink-0"
          onClick={startRecording}
          disabled={disabled}
        >
          <Mic className="h-5 w-5" />
        </Button>
      )}
    </AnimatePresence>
  );
};
