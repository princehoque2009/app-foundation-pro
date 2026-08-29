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
import { CheckCircle, XCircle, Clock, Upload, BadgeCheck, Palette, Shield, Star } from "lucide-react";
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
      // Validate input
      const validation = verificationSchema.safeParse({
        fullName: fullName.trim(),
        email: email.trim(),
        idDocument: idFile,
      });

      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      // Upload ID document
      const fileExt = idFile!.name.split(".").pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(fileName, idFile!);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(fileName);

      // Create verification request
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
          <CardDescription>
            Your verification request status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Status:</span>
            {getStatusBadge(verificationRequest.status)}
          </div>
          
          {verificationRequest.admin_notes && (
            <div>
              <span className="font-medium">Admin Notes:</span>
              <p className="text-sm text-muted-foreground mt-1">
                {verificationRequest.admin_notes}
              </p>
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
      {/* Benefits Info Section */}
      <Card className="border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-900 dark:via-black dark:to-zinc-900 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center text-sm">✓</div>
            Why get verified?
          </CardTitle>
          <CardDescription>Themes only for verified users • Exclusive benefits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex gap-3 p-3 rounded-xl bg-background border border-border/50">
              <div className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                <BadgeCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Verified Badge</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Blue checkmark on your profile • More trust</div>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-xl bg-background border border-border/50">
              <div className="h-9 w-9 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center shrink-0">
                <Palette className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Exclusive Themes</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Gold • Platinum • Nitro (GIF banner, animated ring)</div>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-xl bg-background border border-border/50">
              <div className="h-9 w-9 rounded-full bg-green-50 dark:bg-green-950/20 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Trust & Visibility</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Higher in search • More profile views</div>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-xl bg-background border border-border/50">
              <div className="h-9 w-9 rounded-full bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center shrink-0">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Premium Features</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Early access to new features • Priority support</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-black text-white p-3 flex items-center gap-2 text-[11px]">
            <span className="text-amber-400">⚡</span> Themes only for verified users. Nitro is exclusive - requires special access.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request Verification</CardTitle>
          <CardDescription>
            Submit your information to get your account verified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>

        <div>
          <Label htmlFor="idDocument">ID Document</Label>
          <div className="mt-2">
            <Label htmlFor="idDocument" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {idFile ? idFile.name : "Click to upload ID document"}
                </p>
              </div>
            </Label>
            <Input
              id="idDocument"
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setIdFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <Button 
          onClick={() => submitRequestMutation.mutate()}
          disabled={submitRequestMutation.isPending}
          className="w-full"
        >
          {submitRequestMutation.isPending ? "Submitting..." : "Submit Request"}
        </Button>
      </CardContent>
    </Card>
    </div>
  );
};
