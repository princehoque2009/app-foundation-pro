import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Camera, MapPin, Smile, Loader2, X, Image } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface CircleComposerProps {
  circleId: string;
  circleName: string;
  userId: string;
  onPostCreated: () => void;
}

const FEELINGS = ["😊 Happy", "😢 Sad", "😡 Angry", "🤩 Excited", "😴 Tired", "🥳 Celebrating", "🤔 Thinking", "❤️ Loved"];

export const CircleComposer = ({ circleId, circleName, userId, onPostCreated }: CircleComposerProps) => {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [feeling, setFeeling] = useState("");
  const [showFeelings, setShowFeelings] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["my-profile-mini", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("avatar_url, display_name, username").eq("id", userId).single();
      return data;
    },
    staleTime: 60000,
  });

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      if (!expanded) setExpanded(true);
    }
  };

  const handlePost = async () => {
    if (!text.trim() && !mediaFile) return;
    setPosting(true);
    try {
      let media_url = null;
      let media_type = null;
      if (mediaFile) {
        const ext = mediaFile.name.split(".").pop();
        const path = `circles/${circleId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("post-media").upload(path, mediaFile);
        if (!error) {
          media_url = supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
          media_type = mediaFile.type.startsWith("video") ? "video" : "image";
        }
      }

      const caption = feeling ? `${text.trim()} — ${feeling}` : text.trim();

      await supabase.from("community_group_posts").insert({
        group_id: circleId,
        user_id: userId,
        caption: caption || null,
        media_url,
        media_type,
      });

      setText("");
      setMediaFile(null);
      setMediaPreview(null);
      setFeeling("");
      setExpanded(false);
      setShowFeelings(false);
      onPostCreated();
      toast({ title: "Posted!" });
    } catch {
      toast({ title: "Error posting", variant: "destructive" });
    }
    setPosting(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden">
      {/* Compact row */}
      <div className="flex items-center gap-3 p-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="bg-muted text-xs font-semibold">
            {(profile?.display_name || profile?.username || "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <button
          onClick={() => setExpanded(true)}
          className="flex-1 h-10 px-4 rounded-full bg-muted/60 text-sm text-muted-foreground text-left hover:bg-muted transition-colors"
        >
          Write something to this Circle…
        </button>
      </div>

      {/* Expanded composer */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2">
              <p className="text-[11px] text-muted-foreground mb-1.5">
                Post to <span className="font-semibold text-foreground">{circleName}</span>
                {feeling && <span className="ml-1">· {feeling}</span>}
              </p>
              <Textarea
                placeholder="What's on your mind?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="resize-none border-0 bg-transparent focus-visible:ring-0 p-0 text-sm min-h-[60px]"
                autoFocus
              />
            </div>

            {/* Media preview */}
            {mediaPreview && (
              <div className="px-3 pb-2 relative">
                <img src={mediaPreview} className="w-full rounded-xl object-cover max-h-48" alt="" />
                <button
                  onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                  className="absolute top-2 right-5 p-1 rounded-full bg-black/50 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Feelings picker */}
            <AnimatePresence>
              {showFeelings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3 pb-2 overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {FEELINGS.map((f) => (
                      <button
                        key={f}
                        onClick={() => { setFeeling(f); setShowFeelings(false); }}
                        className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                          feeling === f ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Post button row */}
            <div className="flex items-center justify-between px-3 pb-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setExpanded(false); setText(""); setMediaFile(null); setMediaPreview(null); setFeeling(""); setShowFeelings(false); }}
                className="text-xs text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePost}
                disabled={posting || (!text.trim() && !mediaFile)}
                className="rounded-full text-xs h-8 px-5 text-white"
                style={{ background: "#FF5A5F" }}
              >
                {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Post"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      <div className="h-px bg-border/40 mx-3" />

      {/* Bottom action row */}
      <div className="flex items-center justify-around py-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-muted/60 transition-colors min-h-[44px]"
        >
          <Image className="h-4.5 w-4.5 text-emerald-500" />
          <span className="text-xs text-muted-foreground font-medium">Photo/Video</span>
        </button>
        <button
          onClick={() => { if (!expanded) setExpanded(true); toast({ title: "Location", description: "Coming soon!" }); }}
          className="flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-muted/60 transition-colors min-h-[44px]"
        >
          <MapPin className="h-4.5 w-4.5 text-red-500" />
          <span className="text-xs text-muted-foreground font-medium">Location</span>
        </button>
        <button
          onClick={() => { if (!expanded) setExpanded(true); setShowFeelings(!showFeelings); }}
          className="flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-muted/60 transition-colors min-h-[44px]"
        >
          <Smile className="h-4.5 w-4.5 text-amber-500" />
          <span className="text-xs text-muted-foreground font-medium">Feeling</span>
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaSelect} />
    </div>
  );
};
