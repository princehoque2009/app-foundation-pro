# Implementation Examples - Archive Posts Not Shown on Grid

## ✅ Critical: Exclude Archived Posts from All Feed Queries

This ensures archived posts are **NEVER** displayed in any public grid/feed view.

---

## Example 1: Main Feed/Home Page

### BEFORE (❌ Shows archived posts)
```typescript
// pages/Feed.tsx or hooks/useFeedPosts.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFeedPosts = () => {
  return useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });
};
```

### AFTER (✅ Excludes archived posts)
```typescript
// pages/Feed.tsx or hooks/useFeedPosts.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFeedPosts = () => {
  return useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("is_archived", false)  // ← ADD THIS LINE - CRITICAL!
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });
};
```

---

## Example 2: User Profile Page (Viewing Own Profile)

### BEFORE (❌ Shows own archived posts on profile)
```typescript
// pages/Profile.tsx or hooks/useUserPosts.ts
export const useUserPosts = (userId: string) => {
  return useQuery({
    queryKey: ["user-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};
```

### AFTER (✅ Shows only non-archived posts on profile)
```typescript
// pages/Profile.tsx or hooks/useUserPosts.ts
export const useUserPosts = (userId: string) => {
  return useQuery({
    queryKey: ["user-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .eq("is_archived", false)  // ← ADD THIS LINE - CRITICAL!
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};
```

**Note:** User's own archived posts are still accessible via the "Archived Posts" modal, just not on their public profile.

---

## Example 3: Explore/Discover Page

### BEFORE (❌ Shows archived posts in explore)
```typescript
// pages/Explore.tsx or hooks/useExplorePosts.ts
export const useExplorePosts = () => {
  return useQuery({
    queryKey: ["explore-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
};
```

### AFTER (✅ Excludes archived posts from explore)
```typescript
// pages/Explore.tsx or hooks/useExplorePosts.ts
export const useExplorePosts = () => {
  return useQuery({
    queryKey: ["explore-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("is_archived", false)  // ← ADD THIS LINE - CRITICAL!
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
};
```

---

## Example 4: Search Results

### BEFORE (❌ Shows archived posts in search)
```typescript
// pages/Search.tsx or hooks/useSearchPosts.ts
export const useSearchPosts = (query: string) => {
  return useQuery({
    queryKey: ["search-posts", query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .or(`content.ilike.%${query}%,profiles.display_name.ilike.%${query}%`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};
```

### AFTER (✅ Excludes archived posts from search)
```typescript
// pages/Search.tsx or hooks/useSearchPosts.ts
export const useSearchPosts = (query: string) => {
  return useQuery({
    queryKey: ["search-posts", query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("is_archived", false)  // ← ADD THIS LINE - CRITICAL!
        .or(`content.ilike.%${query}%,profiles.display_name.ilike.%${query}%`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};
```

---

## Example 5: Hashtag/Tag Page

### BEFORE (❌ Shows archived posts in hashtag results)
```typescript
// pages/Hashtag.tsx or hooks/useHashtagPosts.ts
export const useHashtagPosts = (hashtag: string) => {
  return useQuery({
    queryKey: ["hashtag-posts", hashtag],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .filter("content", "ilike", `%#${hashtag}%`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};
```

### AFTER (✅ Excludes archived posts from hashtag)
```typescript
// pages/Hashtag.tsx or hooks/useHashtagPosts.ts
export const useHashtagPosts = (hashtag: string) => {
  return useQuery({
    queryKey: ["hashtag-posts", hashtag],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("is_archived", false)  // ← ADD THIS LINE - CRITICAL!
        .filter("content", "ilike", `%#${hashtag}%`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};
```

---

## Example 6: Real-World Integration in Component

Complete component showing how archive works end-to-end:

```typescript
// components/PostGrid.tsx
import { useFeedPosts } from "@/hooks/useFeedPosts";
import { PostCard } from "./PostCard";
import { useAuth } from "@/hooks/useAuth";

export const PostGrid = () => {
  const { data: posts, isLoading, error } = useFeedPosts();
  const { user } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading posts</div>;
  if (!posts || posts.length === 0) {
    return <div>No posts found</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isOwner={user?.id === post.user_id}
          onArchive={() => {
            // Post will be removed automatically via query invalidation
            // No need to manually filter - React Query handles it
          }}
        />
      ))}
    </div>
  );
};
```

```typescript
// components/PostCard.tsx
import { PostOptionsMenu } from "@/components/PostOptionsMenu";

interface PostCardProps {
  post: any;
  isOwner: boolean;
  onArchive?: () => void;
}

export const PostCard = ({ post, isOwner, onArchive }: PostCardProps) => {
  // IMPORTANT: is_archived should always be false here
  // because the query already excludes archived posts
  
  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Post Header */}
      <div className="p-4 flex justify-between items-center border-b">
        <div>
          <h3 className="font-semibold">{post.profiles.display_name}</h3>
          <p className="text-xs text-gray-500">@{post.profiles.username}</p>
        </div>
        
        {/* ARCHIVE OPTIONS - Only visible to owner */}
        {isOwner && (
          <PostOptionsMenu
            postId={post.id}
            isOwner={isOwner}
            isArchived={post.is_archived}  // Should always be false here
            onDeleteSuccess={onArchive}
          />
        )}
      </div>

      {/* Post Content */}
      <div className="p-4">
        <p className="text-sm mb-3">{post.content}</p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post"
            className="w-full rounded-lg object-cover max-h-96"
          />
        )}
      </div>

      {/* Post Footer - Interactions */}
      <div className="p-4 border-t flex gap-4 text-sm text-gray-600">
        <button className="hover:text-red-500">❤️ {post.likes_count || 0}</button>
        <button className="hover:text-blue-500">💬 {post.comments_count || 0}</button>
        <button className="hover:text-gray-800">🔄 Share</button>
      </div>
    </div>
  );
};
```

---

## 🔍 Verification: Confirm Archived Posts Are Hidden

### Test 1: Archive a Post
```
1. Create/find a post you own
2. Click 3-dot menu
3. Click "Archive Post"
4. Post disappears from grid immediately ✅
```

### Test 2: Check Other Feeds
```
1. Go to Explore page
2. Search for the post
3. Post should NOT appear in results ✅
```

### Test 3: Other Users Don't See It
```
1. Open another user's account
2. Switch to different user account
3. Search for archived post
4. Post NOT visible to other user ✅
```

### Test 4: Archive Modal Shows It
```
1. Click "Archived Posts" button
2. Modal opens
3. Archived post appears in modal ✅
4. Click "Show on Profile"
5. Post returns to main grid ✅
```

---

## 📋 Checklist: All Queries Updated

- [ ] Main feed query - `.eq("is_archived", false)` added
- [ ] User profile query - `.eq("is_archived", false)` added
- [ ] Explore page query - `.eq("is_archived", false)` added
- [ ] Search query - `.eq("is_archived", false)` added
- [ ] Hashtag query - `.eq("is_archived", false)` added
- [ ] Any other feed query - `.eq("is_archived", false)` added
- [ ] Test: Archive post → disappears from grid
- [ ] Test: Unarchive post → returns to grid
- [ ] Test: Other users don't see archived posts

---

## ⚡ Quick Command to Find All Posts Queries

Search your codebase for queries that need updating:

```bash
# Find all .from("posts") queries
grep -r "from.*posts" src/hooks src/pages --include="*.ts" --include="*.tsx"

# Find all .select() with posts
grep -r "\.select\(" src/hooks src/pages --include="*.ts" --include="*.tsx" | grep posts
```

Then add `.eq("is_archived", false)` to each one.

---

## ✅ Result

After applying all these changes:

✅ Archived posts **NEVER** appear in any public feed  
✅ Archived posts **ONLY** visible to owner in "Archived Posts" modal  
✅ Posts can be unarchived anytime to restore to profile  
✅ One-click archive/unarchive with smooth UI  
✅ Complete data preservation (soft delete pattern)  

You now have a production-ready archive feature! 🎉
