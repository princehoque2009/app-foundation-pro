import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyFriends } from "@/components/friends/MyFriends";
import { FriendSuggestions } from "@/components/friends/FriendSuggestions";
import { SearchFriends } from "@/components/friends/SearchFriends";

const Friends = () => {
  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Followers</h1>

        <Tabs defaultValue="followers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>

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
