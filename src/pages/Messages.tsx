import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { FirebaseChatList } from "@/components/messages/FirebaseChatList";
import { FirebaseChatWindow } from "@/components/messages/FirebaseChatWindow";
import { CallInterface } from "@/components/calling/CallInterface";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Search, Users, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

const Messages = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { initiateCall, incomingCall, currentCall } = useWebRTC();

  // Get friend ID from URL params
  useEffect(() => {
    const friendId = searchParams.get("friend");
    if (friendId) {
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", friendId)
        .single()
        .then(({ data }) => {
          if (data) setSelectedFriend(data);
        });
    }
  }, [searchParams]);

  // Fetch friends list
  const { data: friends } = useQuery({
    queryKey: ["friends", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          friend:profiles!friendships_friend_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("user_id", user?.id);

      if (error) throw error;
      return data?.map((f) => f.friend) || [];
    },
    enabled: !!user?.id,
  });

  const handleSelectFriend = (friendId: string, profile: Profile) => {
    setSelectedFriend(profile);
    setSearchParams({ friend: friendId });
  };

  const handleBack = () => {
    setSelectedFriend(null);
    setSearchParams({});
  };

  const handleStartCall = (type: "audio" | "video") => {
    if (selectedFriend) {
      initiateCall(selectedFriend.id, type);
    }
  };

  // Get profile for incoming call
  const [incomingCallerProfile, setIncomingCallerProfile] = useState<Profile | null>(null);
  
  useEffect(() => {
    if (incomingCall) {
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", incomingCall.callerId)
        .single()
        .then(({ data }) => {
          if (data) setIncomingCallerProfile(data);
        });
    }
  }, [incomingCall]);

  // Filter friends by search
  const filteredFriends = friends?.filter(
    (f) =>
      f?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      {/* Call interface */}
      <CallInterface profile={selectedFriend || incomingCallerProfile || undefined} />

      <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] flex">
        {/* Chat list - hide on mobile when chat is open */}
        <div
          className={cn(
            "w-full md:w-80 lg:w-96 border-r bg-card flex flex-col",
            selectedFriend ? "hidden md:flex" : "flex"
          )}
        >
          {/* Header */}
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              Messages
            </h1>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted border-0 rounded-full"
              />
            </div>
          </div>

          {/* Friends / Chat list */}
          <ScrollArea className="flex-1">
            {searchQuery ? (
              // Show search results
              <div className="p-2 space-y-1">
                {filteredFriends && filteredFriends.length > 0 ? (
                  filteredFriends.map((friend) => (
                    <button
                      key={friend?.id}
                      onClick={() =>
                        friend && handleSelectFriend(friend.id, friend as Profile)
                      }
                      className={cn(
                        "w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:bg-accent/50",
                        selectedFriend?.id === friend?.id && "bg-accent"
                      )}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={friend?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {friend?.display_name?.[0] || friend?.username?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-semibold truncate">
                          {friend?.display_name || friend?.username}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          @{friend?.username}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No friends found
                  </div>
                )}
              </div>
            ) : (
              // Show chat list or friends
              <div className="p-2 space-y-1">
                {friends && friends.length > 0 ? (
                  friends.map((friend) => (
                    <button
                      key={friend?.id}
                      onClick={() =>
                        friend && handleSelectFriend(friend.id, friend as Profile)
                      }
                      className={cn(
                        "w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:bg-accent/50",
                        selectedFriend?.id === friend?.id && "bg-accent"
                      )}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={friend?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {friend?.display_name?.[0] || friend?.username?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-semibold truncate">
                          {friend?.display_name || friend?.username}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          @{friend?.username}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <UserCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground font-medium">No friends yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add friends to start chatting
                    </p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat window */}
        <div className={cn("flex-1", selectedFriend ? "flex" : "hidden md:flex")}>
          {selectedFriend ? (
            <FirebaseChatWindow
              friendId={selectedFriend.id}
              friendProfile={selectedFriend}
              onBack={handleBack}
              onStartCall={handleStartCall}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/30">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Your Messages</h2>
              <p className="text-muted-foreground max-w-sm">
                Select a friend from the list to start chatting
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Messages;
