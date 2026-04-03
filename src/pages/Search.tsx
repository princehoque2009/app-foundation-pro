import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, TrendingUp, Clock, UserCircle, X, Loader2, Hash, Image, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const trendingTopics = [
  { tag: "#photography", posts: "12.5K posts" },
  { tag: "#sunset", posts: "8.2K posts" },
  { tag: "#travel", posts: "45.1K posts" },
  { tag: "#food", posts: "32.8K posts" },
  { tag: "#fitness", posts: "21.3K posts" },
  { tag: "#music", posts: "18.7K posts" },
];

const TABS = [
  { id: "top", label: "Top", icon: TrendingUp },
  { id: "users", label: "Users", icon: UserCircle },
  { id: "hashtags", label: "Hashtags", icon: Hash },
  { id: "posts", label: "Posts", icon: Image },
];

const Search = () => {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("top");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query.trim()) return { users: [], posts: [] };
      const [usersRes, postsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, is_verified, bio, followers_count")
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
          .limit(15),
        supabase
          .from("posts")
          .select("id, caption, media_url, media_type, likes_count, comments_count")
          .ilike("caption", `%${query}%`)
          .limit(20),
      ]);
      return { users: usersRes.data || [], posts: postsRes.data || [] };
    },
    enabled: query.length > 0,
  });

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery && !recentSearches.includes(searchQuery)) {
      setRecentSearches([searchQuery, ...recentSearches.slice(0, 4)]);
    }
  };

  const handleUserClick = (userId: string) => navigate(`/profile/${userId}`);
  const clearRecentSearches = () => setRecentSearches([]);

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6 page-transition">
        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground text-center mb-5">Explore</h1>

        {/* Search Bar */}
        <div className="relative mb-5 max-w-lg mx-auto">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search here"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-12 h-12 rounded-2xl bg-muted/40 border-0 text-base focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 justify-center">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Search Results */}
        {query && !isLoading && (
          <div className="space-y-6">
            {/* Users */}
            {(activeTab === "top" || activeTab === "users") && searchResults?.users && searchResults.users.length > 0 && (
              <div>
                {activeTab === "top" && (
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <UserCircle className="h-4 w-4" /> People
                  </h3>
                )}
                <div className="space-y-2">
                  {searchResults.users.map((user: any) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserClick(user.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-sm truncate">{user.display_name || user.username}</p>
                          {user.is_verified && <span className="text-primary text-xs">✓</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                        {user.followers_count > 0 && (
                          <p className="text-xs text-muted-foreground">{user.followers_count} followers</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Posts - Masonry Grid */}
            {(activeTab === "top" || activeTab === "posts") && searchResults?.posts && searchResults.posts.length > 0 && (
              <div>
                {activeTab === "top" && (
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Posts</h3>
                )}
                <div className="columns-2 sm:columns-3 gap-2 space-y-2">
                  {searchResults.posts.map((post: any, index: number) => (
                    <div
                      key={post.id}
                      className={cn(
                        "break-inside-avoid rounded-2xl overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity",
                        index % 5 === 0 ? "aspect-[3/4]" : index % 3 === 0 ? "aspect-square" : "aspect-[4/3]"
                      )}
                      onClick={() => navigate(`/post/${post.id}`)}
                    >
                      {post.media_url && post.media_type === "image" ? (
                        <img src={post.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-4 bg-muted/80">
                          <p className="text-xs text-muted-foreground line-clamp-4">{post.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchResults?.users?.length === 0 && searchResults?.posts?.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No results found for "{query}"</p>
              </div>
            )}
          </div>
        )}

        {/* Default - Trending */}
        {!query && (
          <div className="space-y-6">
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Recent
                  </h3>
                  <button onClick={clearRecentSearches} className="text-xs text-primary font-medium">
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(search)}
                      className="px-4 py-2 bg-muted/50 rounded-full text-sm hover:bg-muted transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Explore Grid Placeholder */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Trending
              </h3>
              <div className="space-y-2">
                {trendingTopics.map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(topic.tag)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-muted/50 transition-colors text-left"
                  >
                    <div>
                      <p className="font-semibold text-primary">{topic.tag}</p>
                      <p className="text-xs text-muted-foreground">{topic.posts}</p>
                    </div>
                    <span className="text-lg font-bold text-muted-foreground/30">#{index + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Search;
