# Archive Post Feature - Quick Start

## 🎯 TL;DR - What You Need to Do

### 1️⃣ Run Database Migration (5 min)
```sql
-- Go to Supabase Dashboard > SQL Editor
-- Copy entire content from: supabase/migrations/add_archive_post_feature.sql
-- Execute it
```

### 2️⃣ Update Feed Queries (10 min)
Find all your feed queries and add `.eq("is_archived", false)`:

```typescript
// In your feed query file
const { data } = await supabase
  .from("posts")
  .select("*")
  .eq("is_archived", false)  // ← ADD THIS LINE
  .order("created_at", { ascending: false });
```

**Update these locations:**
- Main feed page
- Explore/Discover page
- User profile page
- Search results

### 3️⃣ Add 3-Dot Menu to Posts (5 min)
In your post component:

```typescript
import { PostOptionsMenu } from "@/components/PostOptionsMenu";

// Inside your post rendering JSX:
<PostOptionsMenu
  postId={post.id}
  isOwner={currentUserId === post.user_id}
  isArchived={post.is_archived}
/>
```

### 4️⃣ Add Archive Button to Navigation (5 min)
Choose ONE location:

```typescript
// Option A: Profile menu
import { ArchiveNavigation } from "@/components/ArchiveNavigation";
<ArchiveNavigation />

// Option B: Navigation bar
import { ArchiveIconButton } from "@/components/ArchiveNavigation";
<ArchiveIconButton />

// Option C: User dropdown
import { ArchiveMenuDropdown } from "@/components/ArchiveNavigation";
<ArchiveMenuDropdown />
```

### 5️⃣ Test (10 min)
- [ ] Archive a post → disappears from feed
- [ ] Click archive button → modal opens
- [ ] Click "Show on Profile" → post returns
- [ ] Other user doesn't see archived post

---

## 📁 File Reference

| File | Purpose | Action |
|------|---------|--------|
| `usePostInteractions.ts` | Archive hooks | ✅ Already created |
| `usePostActions.ts` | Delete hook | ✅ Already created |
| `PostOptionsMenu.tsx` | 3-dot menu | ✅ Already created → Add to posts |
| `ArchivedPostsModal.tsx` | Archive viewer | ✅ Already created → Import in nav |
| `ArchiveNavigation.tsx` | Navigation | ✅ Already created → Add to your UI |
| Migration SQL | Database | ✅ Already created → Run in Supabase |

---

## 🔗 Code Examples

### Example 1: Integrating into Post Card

```typescript
// components/PostCard.tsx
import { PostOptionsMenu } from "@/components/PostOptionsMenu";
import { useAuth } from "@/hooks/useAuth";

export const PostCard = ({ post }) => {
  const { user } = useAuth();
  const isOwner = user?.id === post.user_id;

  return (
    <div className="post-card border rounded-lg p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3>{post.profiles.display_name}</h3>
          <span className="text-sm text-gray-500">@{post.profiles.username}</span>
        </div>
        
        {/* ARCHIVE OPTIONS MENU */}
        <PostOptionsMenu
          postId={post.id}
          isOwner={isOwner}
          isArchived={post.is_archived}
        />
      </div>

      {/* Content */}
      <p className="mb-3">{post.content}</p>
      {post.image_url && <img src={post.image_url} alt="Post" className="w-full rounded" />}

      {/* Footer - likes, comments */}
      <div className="flex gap-4 mt-4 text-gray-600">
        <button>❤️ {post.likes_count}</button>
        <button>💬 {post.comments_count}</button>
      </div>
    </div>
  );
};
```

### Example 2: Adding to Navigation

```typescript
// components/Navigation.tsx or layout component
import { ArchiveIconButton } from "@/components/ArchiveNavigation";
import { useAuth } from "@/hooks/useAuth";

export const Navigation = () => {
  const { user } = useAuth();

  return (
    <nav className="navbar flex items-center gap-4">
      <Link to="/">Home</Link>
      <Link to="/explore">Explore</Link>
      
      {user && (
        <>
          {/* ARCHIVE BUTTON */}
          <ArchiveIconButton />
          
          <UserMenu />
        </>
      )}
    </nav>
  );
};
```

### Example 3: Updating Feed Query

```typescript
// hooks/useFeedPosts.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFeedPosts = () => {
  return useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("is_archived", false)  // ← ADD THIS LINE
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });
};
```

---

## ✅ Verification Checklist

After integration, verify:

- [ ] Migration ran successfully (check Supabase: posts table has `is_archived` column)
- [ ] Feed queries updated (posts with `is_archived = true` don't appear in feed)
- [ ] Archive button visible on your posts (3-dot menu in post card)
- [ ] Archive button NOT visible on others' posts
- [ ] "Archived Posts" navigation button visible (in nav/menu)
- [ ] Click archive → post disappears from feed
- [ ] Click "Archived Posts" → modal opens and shows archived posts
- [ ] Click "Show on Profile" → post returns to feed
- [ ] Click "Delete" → post is removed permanently
- [ ] Other users cannot see archived posts

---

## 🆘 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| "is_archived column not found" | Run migration in Supabase SQL Editor |
| "Archive button not showing" | Check `isOwner` prop is true; verify component import |
| "Archived posts still in feed" | Add `.eq("is_archived", false)` to feed query |
| "Modal opens but empty" | Check user is logged in; check browser console |
| "Can't unarchive" | Verify `is_archived` prop passed to PostOptionsMenu |
| "Get permission error" | Check RLS policies; ensure user owns post |

---

## 📊 What Happens Behind the Scenes

### When User Archives a Post:
```
UI: User clicks "Archive Post"
  ↓
Hook: useToggleArchive.mutateAsync(false)
  ↓
Optimistic Update: Remove from local cache
  ↓
Database: Update posts SET is_archived = true
  ↓
Result: Post disappears from feed
  ↓
Toast: "Post archived" notification
```

### When User Views Archives:
```
UI: User clicks "Archived Posts"
  ↓
Modal Opens: ArchivedPostsModal component
  ↓
Hook: useArchivedPosts()
  ↓
Query: SELECT * FROM posts 
       WHERE user_id = AUTH_USER 
       AND is_archived = true
  ↓
Result: Display archived posts in modal
```

---

## 🎨 Customization Options

### Change Archive Button Icon
```typescript
// In PostOptionsMenu.tsx
import { Bookmark } from "lucide-react"; // or any other icon

<Bookmark className="mr-2 h-4 w-4" />
<span>Save Post</span>
```

### Change Modal Appearance
```typescript
// In ArchivedPostsModal.tsx
<DialogContent className="max-w-4xl">  // Make wider
  {/* ... */}
</DialogContent>
```

### Add Bulk Operations
```typescript
// Future enhancement: select multiple posts to unarchive
const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

// Render checkboxes, add "Unarchive All" button
```

---

## 🚀 Performance Tips

1. **Indexes Created** - Queries are optimized with database indexes
2. **Query Caching** - React Query caches archived posts list
3. **Pagination** - Consider adding pagination for users with many archived posts:

```typescript
// Future enhancement
const [page, setPage] = useState(1);
const { data: archivedPosts } = useArchivedPosts(page);

<Pagination 
  page={page}
  onPageChange={setPage}
  total={archivedPosts?.length}
/>
```

---

## 📝 Summary

You now have a complete, production-ready archive feature! 

**Total integration time: ~30 minutes**

1. ✅ All code files created
2. ✅ Database migration provided
3. ✅ Security policies included
4. ✅ Full documentation available
5. 👉 **Next: Follow the 5 steps above to integrate into your app**

Good luck! 🚀
