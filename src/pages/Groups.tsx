import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateGroupDialog } from "@/components/groups/CreateGroupDialog";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  MessageCircle,
  Settings,
  UserCircle,
  ArrowLeft,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const Groups = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch user's groups
  const { data: groups, isLoading } = useQuery({
    queryKey: ["user-groups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_group_members")
        .select(`
          role,
          chat_groups (
            id,
            name,
            description,
            avatar_url,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", user?.id);

      if (error) throw error;
      return data?.map((m) => ({
        ...m.chat_groups,
        role: m.role,
      })) || [];
    },
    enabled: !!user?.id,
  });

  const filteredGroups = groups?.filter((g: any) =>
    g?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h1 className="font-semibold text-lg">Groups</h1>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-4 max-w-screen-xl mx-auto space-y-4"
        >
          {/* Search */}
          <motion.div variants={itemVariants} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted border-0 rounded-full"
            />
          </motion.div>

          {/* Groups List */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-3 w-48 bg-muted rounded" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredGroups && filteredGroups.length > 0 ? (
            <motion.div variants={itemVariants} className="space-y-3">
              {filteredGroups.map((group: any) => (
                <Card
                  key={group.id}
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-all hover:-translate-y-0.5"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 rounded-xl">
                      <AvatarImage src={group.avatar_url || ""} />
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg">
                        {group.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{group.name}</h3>
                        {group.role === "admin" && (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {group.description || "No description"}
                      </p>
                      {/* TODO: Add last message preview from Firebase */}
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated {formatDistanceToNow(new Date(group.updated_at), { addSuffix: true })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* TODO: Add unread count from Firebase */}
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MessageCircle className="h-5 w-5 text-primary" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </motion.div>
          ) : (
            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="font-semibold text-lg mb-2">No groups yet</h2>
              <p className="text-muted-foreground text-sm max-w-xs mb-6">
                Create a group to start chatting with multiple friends at once
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Group
              </Button>
            </motion.div>
          )}
        </motion.div>

        <CreateGroupDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </MainLayout>
  );
};

export default Groups;
