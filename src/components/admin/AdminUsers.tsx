import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Users, UserCircle, Search, BadgeCheck, Ban, Shield, Loader2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

export const AdminUsers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionType, setActionType] = useState<"ban" | "verify" | "unverify" | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const updateUserVerification = useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_verified: verified })
        .eq("id", userId);
      
      if (error) throw error;

      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: verified ? "user_verified" : "user_unverified",
        target_type: "user",
        target_id: userId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUser(null);
      setActionType(null);
      toast({ 
        title: variables.verified ? "User Verified" : "Verification Removed", 
        description: variables.verified 
          ? "The user has been verified." 
          : "The user's verification badge has been removed." 
      });
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "moderator" | "user" }) => {
      // Remove existing role
      await supabase.from("user_roles").delete().eq("user_id", userId);
      
      // Add new role
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;

      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "role_changed",
        target_type: "user",
        target_id: userId,
        details: { new_role: role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast({ title: "Role Updated", description: "User role has been changed." });
    },
  });

  const getUserRole = (userId: string) => {
    const role = userRoles?.find(r => r.user_id === userId);
    return role?.role || "user";
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge className="bg-red-500/10 text-red-600">Admin</Badge>;
      case "moderator": return <Badge className="bg-blue-500/10 text-blue-600">Moderator</Badge>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name or username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {users?.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </CardContent>
          </Card>
        ) : (
          users?.map((profile) => {
            const role = getUserRole(profile.id);
            return (
              <Card key={profile.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback><UserCircle className="h-6 w-6" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{profile.display_name || profile.username}</p>
                          {profile.is_verified && <VerifiedBadge size="sm" />}
                          {getRoleBadge(role)}
                        </div>
                        <p className="text-sm text-muted-foreground">@{profile.username}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(`/profile/${profile.id}`, '_blank')}>
                          <UserCircle className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {!profile.is_verified ? (
                          <DropdownMenuItem 
                            onClick={() => updateUserVerification.mutate({ userId: profile.id, verified: true })}
                          >
                            <BadgeCheck className="h-4 w-4 mr-2" />
                            Add Verification
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => updateUserVerification.mutate({ userId: profile.id, verified: false })}
                            className="text-red-600"
                          >
                            <BadgeCheck className="h-4 w-4 mr-2" />
                            Remove Verification
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => updateUserRole.mutate({ userId: profile.id, role: "moderator" })}>
                          <Shield className="h-4 w-4 mr-2" />
                          Make Moderator
                        </DropdownMenuItem>
                        {role !== "admin" && (
                          <DropdownMenuItem onClick={() => updateUserRole.mutate({ userId: profile.id, role: "admin" })}>
                            <Shield className="h-4 w-4 mr-2 text-red-500" />
                            Make Admin
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
