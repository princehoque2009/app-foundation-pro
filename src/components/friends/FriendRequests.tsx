import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { UserCircle, Check, X } from "lucide-react";

export const FriendRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: receivedRequests } = useQuery({
    queryKey: ["friend-requests-received", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friend_requests")
        .select("*, profiles!friend_requests_from_user_id_fkey(*)")
        .eq("to_user_id", user?.id)
        .eq("status", "pending");
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: sentRequests } = useQuery({
    queryKey: ["friend-requests-sent", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friend_requests")
        .select("*, profiles!friend_requests_to_user_id_fkey(*)")
        .eq("from_user_id", user?.id)
        .eq("status", "pending");
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      // Simply update status to 'accepted' - trigger will handle friendship creation
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests-received"] });
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
      toast({ title: "Friend request accepted!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept friend request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await supabase
        .from("friend_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests-received"] });
      toast({ title: "Friend request rejected" });
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await supabase
        .from("friend_requests")
        .delete()
        .eq("id", requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests-sent"] });
      toast({ title: "Friend request cancelled" });
    },
  });

  return (
    <Tabs defaultValue="received">
      <TabsList>
        <TabsTrigger value="received">
          Received ({receivedRequests?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="sent">
          Sent ({sentRequests?.length || 0})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="received" className="mt-4">
        {!receivedRequests || receivedRequests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No pending requests</p>
        ) : (
          <div className="space-y-4">
            {receivedRequests.map((request) => {
              const sender = request.profiles;
              return (
                <Card key={request.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={sender.avatar_url || ""} />
                      <AvatarFallback>
                        <UserCircle className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{sender.display_name || sender.username}</h3>
                      <p className="text-sm text-muted-foreground">@{sender.username}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => acceptRequestMutation.mutate(request.id)}
                        disabled={acceptRequestMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        className="bg-muted text-foreground hover:bg-muted/80"
                        variant="ghost"
                        onClick={() => rejectRequestMutation.mutate(request.id)}
                        disabled={rejectRequestMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="sent" className="mt-4">
        {!sentRequests || sentRequests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No sent requests</p>
        ) : (
          <div className="space-y-4">
            {sentRequests.map((request) => {
              const recipient = request.profiles;
              return (
                <Card key={request.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={recipient.avatar_url || ""} />
                      <AvatarFallback>
                        <UserCircle className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{recipient.display_name || recipient.username}</h3>
                      <p className="text-sm text-muted-foreground">@{recipient.username}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelRequestMutation.mutate(request.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};
