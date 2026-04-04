import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyFriends } from "@/components/friends/MyFriends";
import { FriendRequests } from "@/components/friends/FriendRequests";
import { FriendSuggestions } from "@/components/friends/FriendSuggestions";
import { SearchFriends } from "@/components/friends/SearchFriends";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Friends = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const isPrivate = profile?.account_type === "private";

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Followers</h1>

        <Tabs defaultValue={isPrivate ? "requests" : "followers"} className="w-full">
          <TabsList className={`grid w-full ${isPrivate ? "grid-cols-4" : "grid-cols-3"}`}>
            {isPrivate && <TabsTrigger value="requests">Requests</TabsTrigger>}
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>

          {isPrivate && (
            <TabsContent value="requests" className="mt-6">
              <FriendRequests />
            </TabsContent>
          )}

          <TabsContent value="followers" className="mt-6">
            <MyFriends />
          </TabsContent>

          <TabsContent value="discover" className="mt-6">
            <FriendSuggestions />
          </TabsContent>

          <TabsContent value="search" className="mt-6">
            <SearchFriends />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Friends;
