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
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests-received"] });
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
      toast({ title: "Follow request accepted!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to accept request", description: error.message, variant: "destructive" });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests-received"] });
      toast({ title: "Request declined" });
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await supabase.from("friend_requests").delete().eq("id", requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests-sent"] });
      toast({ title: "Follow request cancelled" });
    },
  });

  return (
    <Tabs defaultValue="received">
      <TabsList>
        <TabsTrigger value="received">
          Received ({receivedRequests?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="sent">
          Requested ({sentRequests?.length || 0})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="received" className="mt-4">
        {!receivedRequests || receivedRequests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No pending follow requests</p>
        ) : (
          <div className="space-y-3">
            {receivedRequests.map((request) => {
              const sender = request.profiles;
              return (
                <Card key={request.id} className="p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={sender.avatar_url || ""} />
                      <AvatarFallback><UserCircle className="h-8 w-8" /></AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{sender.display_name || sender.username}</h3>
                      <p className="text-sm text-muted-foreground">@{sender.username}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl"
                        onClick={() => acceptRequestMutation.mutate(request.id)}
                        disabled={acceptRequestMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl"
                        onClick={() => rejectRequestMutation.mutate(request.id)}
                        disabled={rejectRequestMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
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
          <p className="text-center text-muted-foreground py-8">No pending requests</p>
        ) : (
          <div className="space-y-3">
            {sentRequests.map((request) => {
              const recipient = request.profiles;
              return (
                <Card key={request.id} className="p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={recipient.avatar_url || ""} />
                      <AvatarFallback><UserCircle className="h-8 w-8" /></AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{recipient.display_name || recipient.username}</h3>
                      <p className="text-sm text-muted-foreground">@{recipient.username}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => cancelRequestMutation.mutate(request.id)}
                    >
                      Requested
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
