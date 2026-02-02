import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  FileText,
  Upload,
  ArrowLeft,
  ArrowRight,
  Globe,
  Lock,
  Loader2,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { id: 1, title: "Name", description: "What's your page called?" },
  { id: 2, title: "Description", description: "Tell us about your page" },
  { id: 3, title: "Category", description: "Choose a category" },
  { id: 4, title: "Banner", description: "Add a cover image" },
  { id: 5, title: "Logo", description: "Add your page logo" },
  { id: 6, title: "Privacy", description: "Who can see your page?" },
];

const CATEGORIES = [
  "Brand",
  "Community",
  "Entertainment",
  "Education",
  "Business",
  "Creator",
  "Sports",
  "Music",
  "Gaming",
  "News",
  "Other",
];

export const CreatePageDialog = ({ open, onOpenChange }: CreatePageDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  const createPageMutation = useMutation({
    mutationFn: async () => {
      let banner_url = null;
      let logo_url = null;

      // Upload banner
      if (bannerFile) {
        const fileExt = bannerFile.name.split(".").pop();
        const fileName = `${user?.id}/page-banner-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("lab-media")
          .upload(fileName, bannerFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from("lab-media")
          .getPublicUrl(fileName);
        banner_url = publicUrl;
      }

      // Upload logo
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${user?.id}/page-logo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("lab-media")
          .upload(fileName, logoFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from("lab-media")
          .getPublicUrl(fileName);
        logo_url = publicUrl;
      }

      // Create page
      const { data: page, error } = await supabase
        .from("pages")
        .insert({
          name,
          description,
          category,
          privacy,
          banner_url,
          logo_url,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return page;
    },
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ["my-pages"] });
      toast({ title: "Page created!", description: `${name} is now live` });
      resetForm();
      onOpenChange(false);
      navigate(`/page/${page.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "banner" | "logo"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      if (type === "banner") {
        setBannerFile(file);
        setBannerPreview(preview);
      } else {
        setLogoFile(file);
        setLogoPreview(preview);
      }
    }
  };

  const resetForm = () => {
    setStep(1);
    setName("");
    setDescription("");
    setCategory("");
    setPrivacy("public");
    setBannerFile(null);
    setBannerPreview("");
    setLogoFile(null);
    setLogoPreview("");
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return name.trim().length >= 2;
      case 2:
        return true; // Description is optional
      case 3:
        return category.length > 0;
      case 4:
        return true; // Banner is optional
      case 5:
        return true; // Logo is optional
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    } else {
      createPageMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-center font-semibold">
            Create Page
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex justify-between items-center mb-2">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  step === s.id
                    ? "bg-primary text-primary-foreground"
                    : step > s.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </div>
            ))}
          </div>
          <p className="text-sm text-center text-muted-foreground">
            {STEPS[step - 1].description}
          </p>
        </div>

        {/* Step Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <div className="space-y-4">
                  <Label htmlFor="name">Page Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter page name"
                    className="bg-muted border-0"
                    autoFocus
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's your page about?"
                    className="bg-muted border-0 resize-none min-h-[120px]"
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <Label>Category</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={cn(
                          "p-3 rounded-xl text-sm font-medium transition-all",
                          category === cat
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <Label>Banner Image (optional)</Label>
                  <label className="cursor-pointer block">
                    <div
                      className={cn(
                        "aspect-[3/1] rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-colors hover:border-primary/50",
                        bannerPreview && "border-solid border-primary"
                      )}
                    >
                      {bannerPreview ? (
                        <img
                          src={bannerPreview}
                          alt="Banner preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">
                            Tap to upload
                          </span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, "banner")}
                    />
                  </label>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <Label>Logo (optional)</Label>
                  <div className="flex flex-col items-center">
                    <label className="cursor-pointer">
                      <Avatar className="h-24 w-24 rounded-2xl">
                        {logoPreview ? (
                          <AvatarImage src={logoPreview} />
                        ) : (
                          <AvatarFallback className="rounded-2xl bg-muted">
                            <FileText className="h-10 w-10 text-muted-foreground" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="text-center mt-2">
                        <span className="text-sm text-primary font-medium">
                          {logoPreview ? "Change Logo" : "Add Logo"}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, "logo")}
                      />
                    </label>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  <Label>Privacy</Label>
                  <div className="space-y-2">
                    <button
                      onClick={() => setPrivacy("public")}
                      className={cn(
                        "w-full p-4 rounded-xl flex items-center gap-3 transition-all",
                        privacy === "public"
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-muted"
                      )}
                    >
                      <Globe className="h-5 w-5" />
                      <div className="text-left">
                        <h4 className="font-medium text-sm">Public</h4>
                        <p className="text-xs text-muted-foreground">
                          Anyone can find and follow
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setPrivacy("private")}
                      className={cn(
                        "w-full p-4 rounded-xl flex items-center gap-3 transition-all",
                        privacy === "private"
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-muted"
                      )}
                    >
                      <Lock className="h-5 w-5" />
                      <div className="text-left">
                        <h4 className="font-medium text-sm">Private</h4>
                        <p className="text-xs text-muted-foreground">
                          Only approved followers can see
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border flex gap-3">
          {step > 1 ? (
            <Button variant="outline" className="flex-1" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={!canProceed() || createPageMutation.isPending}
            onClick={handleNext}
          >
            {createPageMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Creating...
              </>
            ) : step === 6 ? (
              "Create Page"
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
