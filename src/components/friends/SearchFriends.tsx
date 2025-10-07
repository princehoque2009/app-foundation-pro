import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Search, UserCircle, UserPlus } from "lucide-react";

export const SearchFriends = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchResults } = useQuery({
    queryKey: ["search-users", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .neq("id", user?.id)
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length > 0,
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (toUserId: string) => {
      const { error } = await supabase
        .from("friend_requests")
        .insert({
          from_user_id: user?.id,
          to_user_id: toUserId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests-sent"] });
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully.",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by username or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {searchResults && searchResults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchResults.map((profile) => (
            <Card key={profile.id} className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar>
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback>
                    <UserCircle className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{profile.display_name || profile.username}</h3>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => sendRequestMutation.mutate(profile.id)}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add Friend
              </Button>
            </Card>
          ))}
        </div>
      ) : searchQuery ? (
        <p className="text-center text-muted-foreground py-8">No users found</p>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          Start typing to search for friends
        </p>
      )}
    </div>
  );
};
