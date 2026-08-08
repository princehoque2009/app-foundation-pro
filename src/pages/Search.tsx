import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Search as SearchIcon,
  TrendingUp,
  Clock,
  UserRound,
  X,
  Hash,
  ImageIcon,
  Compass,
  SearchX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const RECENT_KEY = "prangon.recentSearches";

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
  { id: "users", label: "People", icon: UserRound },
  { id: "hashtags", label: "Tags", icon: Hash },
  { id: "posts", label: "Posts", icon: ImageIcon },
];

const UserRowSkeleton = () => (
  <div className="flex items-center gap-3 p-3">
    <div className="h-12 w-12 rounded-full shimmer" />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 w-1/3 rounded-full shimmer" />
      <div className="h-3 w-1/5 rounded-full shimmer" />
    </div>
  </div>
);

const Search = () => {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("top");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

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

  const commitRecent = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setRecentSearches((prev) => [v, ...prev.filter((s) => s !== v)].slice(0, 8));
  };

  const handleUserClick = (userId: string) => {
    commitRecent(query);
    navigate(`/profile/${userId}`);
  };

  return (
    <MainLayout showBottomNav={false}>
      <div className="max-w-2xl mx-auto px-4 pb-16 page-transition">
        {/* Sticky glass search surface */}
        <div className="sticky top-14 z-30 -mx-4 px-4 pt-4 pb-3 lg-nav">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="h-5 w-5 text-primary" />
            <h1 className="text-[22px] font-bold tracking-tight">Explore</h1>
          </div>

          <div className="lg-field relative flex items-center h-12 rounded-2xl px-4">
            <SearchIcon className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
            <input
              placeholder="Search people, posts and tags"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitRecent(query)}
              className="flex-1 bg-transparent outline-none px-3 text-[15px] placeholder:text-muted-foreground/70"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground lg-press"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "lg-chip flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap lg-press",
                  activeTab === tab.id ? "lg-chip-active" : "text-muted-foreground"
                )}
              >
                <tab.icon className="h-[15px] w-[15px]" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="mt-4 space-y-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <UserRowSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Results */}
        {query && !isLoading && (
          <div className="mt-4 space-y-7">
            {(activeTab === "top" || activeTab === "users") && !!searchResults?.users?.length && (
              <section>
                <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                  People
                </h2>
                <div className="space-y-1">
                  {searchResults.users.map((user: any) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserClick(user.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted/50 transition-colors text-left lg-press"
                    >
                      <Avatar className="h-12 w-12 ring-1 ring-border">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {user.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-[14.5px] truncate">
                            {user.display_name || user.username}
                          </p>
                          {user.is_verified && (
                            <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-[12.5px] text-muted-foreground truncate">
                          @{user.username}
                          {user.followers_count > 0 && ` · ${user.followers_count} followers`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {(activeTab === "top" || activeTab === "posts") && !!searchResults?.posts?.length && (
              <section>
                <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                  Posts
                </h2>
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
                        <div className="w-full h-full flex items-center justify-center p-4">
                          <p className="text-xs text-muted-foreground line-clamp-4">{post.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!searchResults?.users?.length && !searchResults?.posts?.length && (
              <div className="text-center py-16">
                <div className="lg-panel w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <SearchX className="h-7 w-7 text-muted-foreground/60" />
                </div>
                <h3 className="font-semibold">No results for “{query}”</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Try a different name, handle or keyword.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Discovery state */}
        {!query && (
          <div className="mt-5 space-y-7">
            {recentSearches.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Recent
                  </h2>
                  <button
                    onClick={() => setRecentSearches([])}
                    className="text-xs text-primary font-medium lg-press"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search) => (
                    <button
                      key={search}
                      onClick={() => setQuery(search)}
                      className="lg-chip px-3.5 py-1.5 rounded-full text-[13px] lg-press"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Trending now
              </h2>
              <div className="lg-panel divide-y divide-border/50 overflow-hidden">
                {trendingTopics.map((topic, index) => (
                  <button
                    key={topic.tag}
                    onClick={() => setQuery(topic.tag)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div>
                      <p className="font-semibold text-[14.5px]">{topic.tag}</p>
                      <p className="text-[12px] text-muted-foreground">{topic.posts}</p>
                    </div>
                    <span className="text-lg font-bold text-muted-foreground/25 tabular-nums">
                      {index + 1}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Search;
