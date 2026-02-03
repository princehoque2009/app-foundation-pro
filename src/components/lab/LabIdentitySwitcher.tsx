import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { 
  UserCircle, 
  FileText, 
  Users, 
  Check,
  Crown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LabIdentitySwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type IdentityType = "personal" | "page" | "group";

interface Identity {
  id: string;
  type: IdentityType;
  name: string;
  avatar?: string;
  role?: string;
}

export const LabIdentitySwitcher = ({ open, onOpenChange }: LabIdentitySwitcherProps) => {
  const { user } = useAuth();
  const [activeIdentity, setActiveIdentity] = useState<string>("personal");

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Fetch user's pages
  const { data: pages } = useQuery({
    queryKey: ["my-pages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("created_by", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Fetch user's groups
  const { data: groups } = useQuery({
    queryKey: ["my-community-groups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_groups")
        .select("*")
        .eq("created_by", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const identities: Identity[] = [
    {
      id: "personal",
      type: "personal",
      name: profile?.display_name || profile?.username || "Personal Account",
      avatar: profile?.avatar_url || undefined,
      role: "Owner",
    },
    ...(pages?.map(page => ({
      id: page.id,
      type: "page" as IdentityType,
      name: page.name,
      avatar: page.logo_url || undefined,
      role: "Admin",
    })) || []),
    ...(groups?.map(group => ({
      id: group.id,
      type: "group" as IdentityType,
      name: group.name,
      avatar: group.logo_url || undefined,
      role: "Admin",
    })) || []),
  ];

  const handleSelect = (identity: Identity) => {
    setActiveIdentity(identity.id);
    toast({
      title: "Identity Switched",
      description: `Now posting as ${identity.name}`,
    });
    onOpenChange(false);
  };

  const getIcon = (type: IdentityType) => {
    switch (type) {
      case "personal":
        return UserCircle;
      case "page":
        return FileText;
      case "group":
        return Users;
    }
  };

  const getTypeLabel = (type: IdentityType) => {
    switch (type) {
      case "personal":
        return "Personal";
      case "page":
        return "Page";
      case "group":
        return "Group";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-center font-semibold flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Switch Identity
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            <AnimatePresence>
              {identities.map((identity, index) => {
                const Icon = getIcon(identity.type);
                const isActive = activeIdentity === identity.id;
                
                return (
                  <motion.button
                    key={identity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelect(identity)}
                    className={cn(
                      "w-full p-3 rounded-xl flex items-center gap-3 transition-all",
                      isActive 
                        ? "bg-primary/10 border-2 border-primary" 
                        : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                    )}
                  >
                    <Avatar className="h-12 w-12 rounded-xl">
                      <AvatarImage src={identity.avatar || ""} />
                      <AvatarFallback className="rounded-xl bg-background">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{identity.name}</h4>
                        {identity.role && (
                          <Badge variant="secondary" className="text-[10px] px-1.5">
                            {identity.role}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        {getTypeLabel(identity.type)}
                      </p>
                    </div>
                    {isActive && (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {identities.length === 1 && (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">Create a Page or Group to unlock multiple identities</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};