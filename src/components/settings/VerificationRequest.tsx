import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Upload, Palette, Shield, Star, Users, Zap, Eye } from "lucide-react";
import { z } from "zod";

const verificationSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  idDocument: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, "Document must be less than 10MB")
    .refine(
      (file) => file.type.startsWith("image/") || file.type === "application/pdf",
      "Document must be an image or PDF"
    ),
});

export const VerificationRequest = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);

  const { data: verificationRequest } = useQuery({
    queryKey: ["verification-request", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      const validation = verificationSchema.safeParse({
        fullName: fullName.trim(),
        email: email.trim(),
        idDocument: idFile,
      });

      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const fileExt = idFile!.name.split(".").pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(fileName, idFile!);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user?.id,
          full_name: fullName.trim(),
          email: email.trim(),
          id_document_url: publicUrl,
          status: "pending",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-request", user?.id] });
      toast({
        title: "Verification request submitted",
        description: "Your verification request has been submitted for review.",
      });
      setFullName("");
      setEmail("");
      setIdFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      default:
        return null;
    }
  };

  if (verificationRequest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
          <CardDescription>Your verification request status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Status:</span>
            {getStatusBadge(verificationRequest.status)}
          </div>
          
          {verificationRequest.admin_notes && (
            <div>
              <span className="font-medium">Admin Notes:</span>
              <p className="text-sm text-muted-foreground mt-1">{verificationRequest.admin_notes}</p>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Submitted on {new Date(verificationRequest.created_at).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Detailed Benefits Section */}
      <Card className="border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-900 dark:via-black dark:to-zinc-900 overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">
            <img src="https://i.ibb.co.com/Gv9mNjcT/1000022833-removebg-preview.png" alt="Verified" className="h-8 w-8 object-contain" />
            Why get verified?
          </CardTitle>
          <CardDescription className="text-[13px]">Themes only for verified users • Stand out from the crowd</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Verified Badge - Detailed */}
          <div className="rounded-[16px] border border-border/50 bg-background p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border">
                <img src="https://i.ibb.co.com/Gv9mNjcT/1000022833-removebg-preview.png" alt="Badge" className="h-6 w-6 object-contain" />
              </div>
              <div>
                <div className="text-[15px] font-semibold flex items-center gap-2">Verified Badge <span className="text-[10px] px-2 py-0.5 rounded-full bg-black text-white">Official</span></div>
                <div className="text-[11px] text-muted-foreground">Your official authenticity checkmark</div>
              </div>
            </div>
            <div className="pl-[52px] space-y-1.5">
              <div className="flex gap-2 text-[12px]"><span className="text-green-600">✓</span><span>Shows next to your name everywhere - profile, posts, comments, messages</span></div>
              <div className="flex gap-2 text-[12px]"><span className="text-green-600">✓</span><span>People trust verified accounts 3x more - more followers, more engagement</span></div>
              <div className="flex gap-2 text-[12px]"><span className="text-green-600">✓</span><span>Protects your identity - no one can impersonate you</span></div>
            </div>
          </div>

          {/* Exclusive Themes - Detailed with mini preview */}
          <div className="rounded-[16px] border border-amber-200/50 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-orange-50/50 dark:from-amber-950/10 dark:via-yellow-950/10 dark:to-orange-950/10 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shrink-0 shadow-sm">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-[15px] font-semibold">Exclusive Profile Themes</div>
                <div className="text-[11px] text-muted-foreground">Only for verified users - make your profile stand out</div>
              </div>
            </div>
            <div className="pl-[52px] grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-amber-300 bg-gradient-to-br from-amber-100 to-yellow-50 p-2 text-center">
                <div className="h-8 w-8 mx-auto rounded-full bg-white shadow-sm ring-2 ring-amber-400 mb-1"></div>
                <div className="text-[10px] font-medium">Gold</div>
                <div className="text-[8px] text-muted-foreground">Premium glow</div>
              </div>
              <div className="rounded-lg border border-zinc-400 bg-zinc-100 p-2 text-center">
                <div className="h-8 w-8 mx-auto rounded-full bg-white shadow-[0_0_0_3px_black] mb-1"></div>
                <div className="text-[10px] font-medium">Platinum</div>
                <div className="text-[8px] text-muted-foreground">Mono + white ring</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black p-2 text-center">
                <div className="h-8 w-8 mx-auto rounded-full bg-zinc-800 border-2 border-white shadow-[0_0_8px_white] mb-1 animate-pulse"></div>
                <div className="text-[10px] font-medium text-white">Nitro</div>
                <div className="text-[8px] text-white/60">GIF banner • Exclusive</div>
              </div>
            </div>
            <div className="pl-[52px] space-y-1">
              <div className="flex gap-2 text-[11px]"><span className="text-amber-600">•</span><span><b>Gold:</b> Amber gradient name, premium shadow, exclusive border</span></div>
              <div className="flex gap-2 text-[11px]"><span className="text-amber-600">•</span><span><b>Platinum:</b> Black & white aesthetic, white glowing ring</span></div>
              <div className="flex gap-2 text-[11px]"><span className="text-amber-600">•</span><span><b>Nitro:</b> GIF banner support, animated white ring, B&W badge - most exclusive</span></div>
            </div>
          </div>

          {/* Trust & Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-[14px] border border-border/50 bg-background p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-[13px] font-semibold">Trust & Safety</div>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                <div>✓ Appear higher in search results</div>
                <div>✓ Your comments & posts get priority</div>
                <div>✓ People trust you instantly</div>
              </div>
            </div>
            <div className="rounded-[14px] border border-border/50 bg-background p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center">
                  <Eye className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-[13px] font-semibold">More Visibility</div>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                <div>✓ Featured in Suggested Accounts</div>
                <div>✓ 2-3x more profile views</div>
                <div>✓ Grow followers faster</div>
              </div>
            </div>
            <div className="rounded-[14px] border border-border/50 bg-background p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-[13px] font-semibold">Community</div>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                <div>✓ Join verified-only circles</div>
                <div>✓ Exclusive events & features</div>
                <div>✓ Direct line to support</div>
              </div>
            </div>
            <div className="rounded-[14px] border border-border/50 bg-background p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Star className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div className="text-[13px] font-semibold">Premium Feel</div>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                <div>✓ Early access to new features</div>
                <div>✓ Priority customer support</div>
                <div>✓ No ads experience (coming)</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-black text-white p-3.5 flex gap-3 items-start">
            <Zap className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-[12px] font-medium">Themes only for verified users</div>
              <div className="text-[11px] text-white/70 leading-relaxed">Gold, Platinum and Nitro themes are exclusive to verified accounts. Nitro is the most exclusive with GIF banner, animated ring and special badge. Stand out from 99% of users.</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request Verification</CardTitle>
          <CardDescription>Submit your information to get your account verified - usually reviewed within 24-48 hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
        </div>

        <div>
          <Label htmlFor="idDocument">ID Document</Label>
          <p className="text-[11px] text-muted-foreground mb-2">Government ID, passport, or any official document with your photo</p>
          <div className="mt-2">
            <Label htmlFor="idDocument" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{idFile ? idFile.name : "Click to upload ID document"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Image or PDF, max 10MB</p>
              </div>
            </Label>
            <Input id="idDocument" type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
          </div>
        </div>

        <Button onClick={() => submitRequestMutation.mutate()} disabled={submitRequestMutation.isPending} className="w-full">
          {submitRequestMutation.isPending ? "Submitting..." : "Submit Request"}
        </Button>
        <p className="text-[10px] text-center text-muted-foreground">By submitting, you agree to our verification process. We never share your ID document.</p>
      </CardContent>
    </Card>
    </div>
  );
};
