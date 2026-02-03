import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PanelStatsGrid, PanelStatItem } from "./PanelStatsGrid";
import { PanelUserCard } from "./PanelUserCard";
import { PanelDataTable, TableColumn, TableFilter } from "./PanelDataTable";
import { PanelAuditLog } from "./PanelAuditLog";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, subDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserCheck,
  UserX,
  Ban,
  Shield,
  AlertTriangle,
  Search,
  RefreshCw,
  History,
  MessageSquare,
  Eye,
  Filter,
  Crown,
  Loader2,
} from "lucide-react";

interface UserWithRoles {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_verified: boolean;
  is_suspended: boolean;
  suspended_until?: string;
  suspension_reason?: string;
  created_at: string;
  roles: string[];
}

export const UsersManagementPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [suspendDays, setSuspendDays] = useState("7");
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Fetch users with roles
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["admin-users", roleFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter === "suspended") {
        query = query.eq("is_suspended", true);
      } else if (statusFilter === "verified") {
        query = query.eq("is_verified", true);
      } else if (statusFilter === "active") {
        query = query.eq("is_suspended", false);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      // Fetch roles for all users
      const userIds = profiles?.map((p) => p.id) || [];
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      // Group roles by user
      const rolesMap: Record<string, string[]> = {};
      rolesData?.forEach((r) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });

      // Filter by role if needed
      let result = profiles?.map((p) => ({
        ...p,
        roles: rolesMap[p.id] || [],
      })) || [];

      if (roleFilter !== "all") {
        result = result.filter((u) => u.roles.includes(roleFilter));
      }

      return result as UserWithRoles[];
    },
    refetchInterval: 30000,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["admin-user-stats"],
    queryFn: async () => {
      const weekAgo = subDays(new Date(), 7);
      const [total, suspended, verified, newUsers, admins] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_suspended", true),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin"),
      ]);

      return {
        total: total.count || 0,
        suspended: suspended.count || 0,
        verified: verified.count || 0,
        newUsers: newUsers.count || 0,
        admins: admins.count || 0,
      };
    },
  });

  // Suspend/Unsuspend user
  const suspendMutation = useMutation({
    mutationFn: async ({ userId, suspend, days, reason }: {
      userId: string;
      suspend: boolean;
      days?: number;
      reason?: string;
    }) => {
      const update: any = {
        is_suspended: suspend,
        suspension_reason: suspend ? reason : null,
        suspended_until: suspend && days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", userId);

      if (error) throw error;

      // Log action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: suspend ? "user_suspended" : "user_unsuspended",
        target_id: userId,
        target_type: "user",
        details: { days, reason },
      });

      // Send notification
      if (suspend) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Account Suspended",
          message: reason || "Your account has been suspended for violating our community guidelines.",
          type: "system_warning",
          from_user_id: user?.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-stats"] });
      setShowSuspendDialog(false);
      setSelectedUser(null);
      setSuspendReason("");
      toast({ title: "User updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Assign/Remove role
  const roleMutation = useMutation({
    mutationFn: async ({ userId, role, action }: {
      userId: string;
      role: string;
      action: "assign" | "remove";
    }) => {
      if (action === "assign") {
        const { error } = await supabase.from("user_roles").insert({
          user_id: userId,
          role: role as "admin" | "moderator" | "user" | "advisor" | "support",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role as "admin" | "moderator" | "user" | "advisor" | "support");
        if (error) throw error;
      }

      // Log action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: action === "assign" ? "role_assigned" : "role_removed",
        target_id: userId,
        target_type: "user",
        details: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowRoleDialog(false);
      setSelectedUser(null);
      setSelectedRole("");
      toast({ title: "Role updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredUsers = users?.filter((u) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        u.username?.toLowerCase().includes(query) ||
        u.display_name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const statsItems: PanelStatItem[] = [
    {
      label: "Total Users",
      value: stats?.total || 0,
      icon: Users,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Verified",
      value: stats?.verified || 0,
      icon: UserCheck,
      iconColor: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Suspended",
      value: stats?.suspended || 0,
      icon: Ban,
      iconColor: "text-destructive",
      bgColor: "bg-destructive/10",
      highlight: (stats?.suspended || 0) > 0,
    },
    {
      label: "New (7 days)",
      value: `+${stats?.newUsers || 0}`,
      icon: UserX,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Admins",
      value: stats?.admins || 0,
      icon: Crown,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "moderator": return "default";
      case "advisor": return "secondary";
      case "support": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <PanelStatsGrid stats={statsItems} columns={5} />

      {/* Filters & Search */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full lg:w-40">
              <Shield className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="moderator">Moderators</SelectItem>
              <SelectItem value="advisor">Advisors</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowAuditLog(true)}>
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({filteredUsers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
                filteredUsers?.map((u) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card
                      className="p-3 cursor-pointer hover:bg-muted/30 transition-all"
                      onClick={() => setSelectedUser(u)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={u.avatar_url} />
                            <AvatarFallback>{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm truncate">
                                {u.display_name || u.username}
                              </span>
                              {u.is_verified && <VerifiedBadge size="sm" />}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">@{u.username}</span>
                              {u.roles.map((role) => (
                                <Badge key={role} variant={getRoleBadgeColor(role) as any} className="text-[10px] px-1 py-0">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {u.is_suspended && (
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <Ban className="h-3 w-3" />
                              Suspended
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser && !showSuspendDialog && !showRoleDialog} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          {selectedUser && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedUser.avatar_url} />
                    <AvatarFallback>{selectedUser.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      {selectedUser.display_name || selectedUser.username}
                      {selectedUser.is_verified && <VerifiedBadge />}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.roles.length === 0 ? (
                      <Badge variant="secondary">User</Badge>
                    ) : (
                      selectedUser.roles.map((role) => (
                        <Badge key={role} variant={getRoleBadgeColor(role) as any}>
                          {role}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {selectedUser.is_suspended && (
                  <div className="bg-destructive/10 rounded-lg p-3">
                    <p className="text-sm font-medium text-destructive flex items-center gap-2">
                      <Ban className="h-4 w-4" />
                      Suspended
                    </p>
                    {selectedUser.suspension_reason && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedUser.suspension_reason}
                      </p>
                    )}
                    {selectedUser.suspended_until && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Until: {new Date(selectedUser.suspended_until).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button variant="outline" onClick={() => setShowRoleDialog(true)}>
                    <Shield className="h-4 w-4 mr-2" />
                    Manage Roles
                  </Button>
                  <Button
                    variant={selectedUser.is_suspended ? "default" : "destructive"}
                    onClick={() => {
                      if (selectedUser.is_suspended) {
                        suspendMutation.mutate({ userId: selectedUser.id, suspend: false });
                      } else {
                        setShowSuspendDialog(true);
                      }
                    }}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    {selectedUser.is_suspended ? "Unsuspend" : "Suspend"}
                  </Button>
                </div>
                <Button variant="ghost" className="w-full" onClick={() => window.open(`/profile/${selectedUser.id}`, "_blank")}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Suspend User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Duration</label>
              <Select value={suspendDays} onValueChange={setSuspendDays}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Input
                className="mt-1"
                placeholder="Reason for suspension..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedUser) {
                  suspendMutation.mutate({
                    userId: selectedUser.id,
                    suspend: true,
                    days: suspendDays === "permanent" ? undefined : parseInt(suspendDays),
                    reason: suspendReason,
                  });
                }
              }}
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Suspend User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Roles</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedUser?.roles.length === 0 ? (
                  <Badge variant="secondary">User</Badge>
                ) : (
                  selectedUser?.roles.map((role) => (
                    <Badge key={role} variant={getRoleBadgeColor(role) as any} className="gap-1">
                      {role}
                      <button
                        className="ml-1 hover:text-destructive"
                        onClick={() => {
                          if (selectedUser) {
                            roleMutation.mutate({ userId: selectedUser.id, role, action: "remove" });
                          }
                        }}
                      >
                        ×
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Assign Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="advisor">Advisor</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser && selectedRole) {
                  roleMutation.mutate({ userId: selectedUser.id, role: selectedRole, action: "assign" });
                }
              }}
              disabled={!selectedRole || roleMutation.isPending}
            >
              {roleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log */}
      <PanelAuditLog
        open={showAuditLog}
        onOpenChange={setShowAuditLog}
        userId={user?.id}
        title="User Management Activity"
      />
    </div>
  );
};
