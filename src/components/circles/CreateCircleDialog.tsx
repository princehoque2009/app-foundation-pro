import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, ImagePlus, Globe, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = ["General", "Technology", "Sports", "Music", "Art", "Gaming", "Education", "Business", "Health", "Travel"];

interface CreateCircleDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId?: string;
}

export const CreateCircleDialog = ({ open, onOpenChange, userId }: CreateCircleDialogProps) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const reset = () => { setStep(1); setName(""); setDescription(""); setCategory(""); setPrivacy("public"); setCoverFile(null); setIconFile(null); };

  const handleCreate = async () => {
    if (!name.trim()) return toast({ title: "Name required", variant: "destructive" });
    setIsCreating(true);
    try {
      let banner_url = null, logo_url = null;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `circles/${userId}/${Date.now()}-cover.${ext}`;
        const { error } = await supabase.storage.from("banners").upload(path, coverFile);
        if (!error) banner_url = supabase.storage.from("banners").getPublicUrl(path).data.publicUrl;
      }
      if (iconFile) {
        const ext = iconFile.name.split(".").pop();
        const path = `circles/${userId}/${Date.now()}-icon.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, iconFile);
        if (!error) logo_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }

      const { data: circle, error } = await supabase
        .from("community_groups")
        .insert({ name: name.trim(), description: description.trim(), category, privacy, created_by: userId!, banner_url, logo_url })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("community_group_members").insert({ group_id: circle.id, user_id: userId!, role: "admin" });

      queryClient.invalidateQueries({ queryKey: ["circles"] });
      toast({ title: "Circle created!" });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-[360px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">Create Circle — Step {step}/4</DialogTitle>
        </DialogHeader>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 pt-2">
            {step === 1 && (
              <>
                <label className="block text-sm font-medium">Cover Image</label>
                <div className="h-28 bg-muted rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative" onClick={() => document.getElementById("cover-upload")?.click()}>
                  {coverFile ? <img src={URL.createObjectURL(coverFile)} className="w-full h-full object-cover" /> : <ImagePlus className="h-8 w-8 text-muted-foreground" />}
                  <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                </div>
                <label className="block text-sm font-medium">Circle Icon</label>
                <div className="flex justify-center">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center cursor-pointer overflow-hidden" onClick={() => document.getElementById("icon-upload")?.click()}>
                    {iconFile ? <img src={URL.createObjectURL(iconFile)} className="w-full h-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                    <input id="icon-upload" type="file" accept="image/*" className="hidden" onChange={(e) => setIconFile(e.target.files?.[0] || null)} />
                  </div>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <Input placeholder="Circle name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
                <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} rows={3} />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </>
            )}
            {step === 3 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium">Privacy</label>
                {[
                  { value: "public", icon: Globe, label: "Public", desc: "Anyone can join" },
                  { value: "private", icon: Lock, label: "Private", desc: "Approval required" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPrivacy(opt.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${privacy === opt.value ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <opt.icon className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {step === 4 && (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">Ready to create <strong>{name || "your circle"}</strong>?</p>
                <p className="text-xs text-muted-foreground">Category: {category || "None"} · {privacy === "public" ? "Public" : "Private"}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="flex gap-2 pt-2">
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 rounded-full">Back</Button>}
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} className="flex-1 rounded-full" style={{ background: "#FF5A5F" }}>Next</Button>
          ) : (
            <Button onClick={handleCreate} disabled={isCreating || !name.trim()} className="flex-1 rounded-full" style={{ background: "#FF5A5F" }}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Circle"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
