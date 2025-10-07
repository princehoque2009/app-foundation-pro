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
import { CheckCircle, XCircle, Clock, Upload } from "lucide-react";

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
      if (!fullName || !email || !idFile) {
        throw new Error("Please fill all fields and upload an ID document");
      }

      // Upload ID document
      const fileExt = idFile.name.split(".").pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(fileName, idFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(fileName);

      // Create verification request
      const { error } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user?.id,
          full_name: fullName,
          email,
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
  );
};
