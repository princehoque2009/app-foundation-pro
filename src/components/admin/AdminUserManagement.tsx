import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Search,
  UserCircle,
  BadgeCheck,
  Ban,
  AlertTriangle,
  MessageSquareOff,
  FileX,
  LogOut,
  Key,
  Eye,
  MoreHorizontal,
  Calendar,
  Mail,
  Phone,
  Shield,
  UserPlus,
  UserMinus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const AdminUserManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<{ type: string; user: any } | null>(null);
  const [roleDialog, setRoleDialog] = useState<{ user: any } | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [actionReason, setActionReason] = useState("");
  const [suspendDuration, setSuspendDuration] = useState("7");

  // Fetch users
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

  // Fetch user roles
  const { data: userRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const getUserRole = (userId: string) => {
    const roles = userRoles?.filter((r: any) => r.user_id === userId).map((r: any) => r.role) || [];
    return roles.length > 0 ? roles : ["user"];
  };

  // Role assignment mutation
  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "moderator" | "user" | "advisor" | "support" }) => {
      // Check if role already exists
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", role)
        .maybeSingle();

      if (existing) {
        throw new Error("User already has this role");
      }

      const { error } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role }]);

      if (error) throw error;

      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "role_assigned",
        target_id: userId,
        target_type: "user",
        details: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      setRoleDialog(null);
      setSelectedRole("");
      toast({ title: "Role assigned successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Role removal mutation
  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "moderator" | "user" | "advisor" | "support" }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;

      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "role_removed",
        target_id: userId,
        target_type: "user",
        details: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast({ title: "Role removed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Admin action mutation
  const adminAction = useMutation({
    mutationFn: async ({ 
      userId, 
      actionType, 
      updates 
    }: { 
      userId: string; 
      actionType: string; 
      updates: Record<string, any>;
    }) => {
      // Update user profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (updateError) throw updateError;

      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: actionType,
        target_id: userId,
        target_type: "user",
        details: { reason: actionReason, ...updates },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setActionDialog(null);
      setActionReason("");
      toast({ title: "Action completed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAction = (type: string, targetUser: any) => {
    switch (type) {
      case "warn":
        // Send warning notification
        supabase.rpc("create_notification", {
          p_user_id: targetUser.id,
          p_from_user_id: user?.id,
          p_type: "admin_warning",
          p_title: "Account Warning",
          p_message: actionReason || "You have received a warning from the admin team.",
        }).then(() => {
          supabase.from("admin_logs").insert({
            admin_id: user?.id,
            action_type: "user_warned",
            target_id: targetUser.id,
            target_type: "user",
            details: { reason: actionReason },
          });
          toast({ title: "Warning sent" });
          setActionDialog(null);
          setActionReason("");
        });
        break;

      case "suspend":
        const suspendUntil = new Date();
        suspendUntil.setDate(suspendUntil.getDate() + parseInt(suspendDuration));
        adminAction.mutate({
          userId: targetUser.id,
          actionType: "user_suspended",
          updates: {
            is_suspended: true,
            suspended_until: suspendUntil.toISOString(),
            suspension_reason: actionReason,
          },
        });
        break;

      case "ban":
        adminAction.mutate({
          userId: targetUser.id,
          actionType: "user_banned",
          updates: {
            is_suspended: true,
            suspended_until: null,
            suspension_reason: actionReason,
          },
        });
        break;

      case "disable_messaging":
        adminAction.mutate({
          userId: targetUser.id,
          actionType: "messaging_disabled",
          updates: { messaging_disabled: true },
        });
        break;

      case "disable_posting":
        adminAction.mutate({
          userId: targetUser.id,
          actionType: "posting_disabled",
          updates: { posting_disabled: true },
        });
        break;

      case "remove_verification":
        adminAction.mutate({
          userId: targetUser.id,
          actionType: "verification_removed",
          updates: { is_verified: false },
        });
        break;

      case "unsuspend":
        adminAction.mutate({
          userId: targetUser.id,
          actionType: "user_unsuspended",
          updates: {
            is_suspended: false,
            suspended_until: null,
            suspension_reason: null,
          },
        });
        break;

      case "enable_messaging":
        adminAction.mutate({
          userId: targetUser.id,
          actionType: "messaging_enabled",
          updates: { messaging_disabled: false },
        });
        break;

      case "enable_posting":
        adminAction.mutate({
          userId: targetUser.id,
          actionType: "posting_enabled",
          updates: { posting_disabled: false },
        });
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by username or display name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading users...</div>
              ) : users?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No users found</div>
              ) : (
                users?.map((u: any) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-3 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors sm:flex-row sm:items-center"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback>{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.display_name || u.username}</span>
                        {u.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                        {u.is_suspended && <Badge variant="destructive">Suspended</Badge>}
                        {u.messaging_disabled && <Badge variant="outline">No Messaging</Badge>}
                        {u.posting_disabled && <Badge variant="outline">No Posting</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">@{u.username}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {u.date_of_birth && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            DOB: {format(new Date(u.date_of_birth), "MMM d, yyyy")}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {getUserRole(u.id).join(", ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUser(u)}
                        className="flex-1 sm:flex-none"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setActionDialog({ type: "warn", user: u })}>
                            <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                            Warn User
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {!u.is_suspended ? (
                            <>
                              <DropdownMenuItem onClick={() => setActionDialog({ type: "suspend", user: u })}>
                                <Ban className="h-4 w-4 mr-2 text-orange-500" />
                                Temporarily Suspend
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setActionDialog({ type: "ban", user: u })}>
                                <Ban className="h-4 w-4 mr-2 text-destructive" />
                                Permanently Ban
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem onClick={() => handleAction("unsuspend", u)}>
                              <Shield className="h-4 w-4 mr-2 text-green-500" />
                              Unsuspend User
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {!u.messaging_disabled ? (
                            <DropdownMenuItem onClick={() => handleAction("disable_messaging", u)}>
                              <MessageSquareOff className="h-4 w-4 mr-2" />
                              Disable Messaging
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleAction("enable_messaging", u)}>
                              <MessageSquareOff className="h-4 w-4 mr-2" />
                              Enable Messaging
                            </DropdownMenuItem>
                          )}

                          {!u.posting_disabled ? (
                            <DropdownMenuItem onClick={() => handleAction("disable_posting", u)}>
                              <FileX className="h-4 w-4 mr-2" />
                              Disable Posting
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleAction("enable_posting", u)}>
                              <FileX className="h-4 w-4 mr-2" />
                              Enable Posting
                            </DropdownMenuItem>
                          )}

                          {u.is_verified && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleAction("remove_verification", u)}>
                                <BadgeCheck className="h-4 w-4 mr-2" />
                                Remove Verification
                              </DropdownMenuItem>
                            </>
                          )}

                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => setRoleDialog({ user: u })}>
                            <UserPlus className="h-4 w-4 mr-2 text-primary" />
                            Manage Roles
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar_url} />
                  <AvatarFallback>{selectedUser.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {selectedUser.display_name || selectedUser.username}
                    {selectedUser.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  </h3>
                  <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                </div>
              </div>

              <Separator />

                <div className="space-y-3 text-sm">
                 <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Role</span>
                   <Badge className="max-w-[60%] truncate">{getUserRole(selectedUser.id).join(", ")}</Badge>
                </div>
                 <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span>{selectedUser.date_of_birth ? format(new Date(selectedUser.date_of_birth), "MMM d, yyyy") : "Not set"}</span>
                </div>
                 <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Auth Provider</span>
                  <span className="capitalize">{selectedUser.auth_provider || "email"}</span>
                </div>
                 <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Account Type</span>
                  <span className="capitalize">{selectedUser.account_type}</span>
                </div>
                 <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Followers</span>
                  <span>{selectedUser.followers_count || 0}</span>
                </div>
                 <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Following</span>
                  <span>{selectedUser.following_count || 0}</span>
                </div>
                 <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Joined</span>
                  <span>{format(new Date(selectedUser.created_at), "MMM d, yyyy")}</span>
                </div>
              </div>

              {selectedUser.is_suspended && (
                <>
                  <Separator />
                  <div className="p-3 bg-destructive/10 rounded-lg text-sm">
                    <p className="font-medium text-destructive">Suspended</p>
                    {selectedUser.suspended_until && (
                      <p className="text-muted-foreground">Until: {format(new Date(selectedUser.suspended_until), "MMM d, yyyy")}</p>
                    )}
                    {selectedUser.suspension_reason && (
                      <p className="text-muted-foreground">Reason: {selectedUser.suspension_reason}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === "warn" && "Warn User"}
              {actionDialog?.type === "suspend" && "Suspend User"}
              {actionDialog?.type === "ban" && "Ban User"}
            </DialogTitle>
          </DialogHeader>

          {actionDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Taking action on: <strong>@{actionDialog.user.username}</strong>
              </p>

              {actionDialog.type === "suspend" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Suspension Duration</label>
                  <Select value={suspendDuration} onValueChange={setSuspendDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  placeholder="Enter reason for this action..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setActionDialog(null)}>
                  Cancel
                </Button>
                <Button
                  variant={actionDialog.type === "ban" ? "destructive" : "default"}
                  onClick={() => handleAction(actionDialog.type, actionDialog.user)}
                  disabled={!actionReason.trim()}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Management Dialog */}
      <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
          </DialogHeader>
          {roleDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Managing roles for: <strong>@{roleDialog.user.username}</strong>
              </p>

              {/* Current Roles */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Roles</label>
                <div className="flex flex-wrap gap-2">
                  {getUserRole(roleDialog.user.id).map((role: string) => (
                    <Badge key={role} variant="secondary" className="flex items-center gap-1">
                      {role}
                      {role !== "user" && (
                        <button
                          onClick={() => removeRole.mutate({ 
                            userId: roleDialog.user.id, 
                            role: role as "admin" | "moderator" | "user" | "advisor" | "support" 
                          })}
                          className="ml-1 hover:text-destructive"
                        >
                          <UserMinus className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Add Role */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Role</label>
                <div className="flex gap-2">
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="advisor">Advisor</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (selectedRole) {
                        assignRole.mutate({ 
                          userId: roleDialog.user.id, 
                          role: selectedRole as "admin" | "moderator" | "user" | "advisor" | "support" 
                        });
                      }
                    }}
                    disabled={!selectedRole || assignRole.isPending}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setRoleDialog(null)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
