import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyFriends } from "@/components/friends/MyFriends";
import { FriendRequests } from "@/components/friends/FriendRequests";
import { FriendSuggestions } from "@/components/friends/FriendSuggestions";
import { SearchFriends } from "@/components/friends/SearchFriends";

const Friends = () => {
  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Followers</h1>
        
        <Tabs defaultValue="followers" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="followers">Following</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="suggestions">Discover</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>
          
          <TabsContent value="followers" className="mt-6">
            <MyFriends />
          </TabsContent>
          
          <TabsContent value="requests" className="mt-6">
            <FriendRequests />
          </TabsContent>
          
          <TabsContent value="suggestions" className="mt-6">
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
