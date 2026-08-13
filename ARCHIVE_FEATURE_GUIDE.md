# Archive Post Feature - Implementation Guide

Complete step-by-step guide for implementing the Instagram-style Archive Post feature in your social media application.

## 📋 Overview

The Archive Post feature allows users to hide posts from public view without permanently deleting them. This is useful for cleaning up profiles or temporarily hiding posts from feed visibility.

### Key Features:
- ✅ Archive/unarchive posts without deletion
- ✅ Archived posts only visible to owner
- ✅ Dedicated "Archived Posts" view
- ✅ One-click restore to profile
- ✅ Smooth UI with toast notifications

---

## 🗄️ Database Setup

### Step 1: Run the Migration

Execute the SQL migration to add archive functionality to your Supabase database:

```sql
-- File: supabase/migrations/add_archive_post_feature.sql

ALTER TABLE posts
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_posts_is_archived ON posts(is_archived);
CREATE INDEX idx_posts_user_archived ON posts(user_id, is_archived);
CREATE INDEX idx_posts_archived_by_user ON posts(user_id, is_archived, created_at DESC)
WHERE is_archived = true;
CREATE INDEX idx_posts_feed ON posts(created_at DESC)
WHERE is_archived = false;
```

**What this does:**
- Adds `is_archived` column to all posts (defaults to `false`)
- Creates indexes for efficient queries
- All existing posts remain visible (is_archived = false)

### Step 2: Update Your Feed Queries

Ensure all feed-related queries exclude archived posts:

```typescript
// Example feed query - BEFORE
const { data } = await supabase
  .from("posts")
  .select("*")
  .order("created_at", { ascending: false });

// AFTER - exclude archived posts
const { data } = await supabase
  .from("posts")
  .select("*")
  .eq("is_archived", false)  // ← Add this line
  .order("created_at", { ascending: false });
```

**Locations to update:**
- Main feed queries
- Explore/Discover page
- User profile feeds
- Search results

---

## 🎣 Frontend Hooks

### 1. `useToggleArchive` - Archive/Unarchive Posts

```typescript
import { useToggleArchive } from "@/hooks/usePostInteractions";

// In your component
const toggleArchive = useToggleArchive(postId);

const handleArchive = async () => {
  await toggleArchive.mutateAsync(isCurrentlyArchived);
};
```

**Features:**
- Optimistic UI updates
- Automatic query cache invalidation
- Toast notifications
- Owner verification

### 2. `useArchivedPosts` - Fetch Archived Posts

```typescript
import { useArchivedPosts } from "@/hooks/usePostInteractions";

// Fetches all archived posts for current user
const { data: archivedPosts, isLoading } = useArchivedPosts();
```

**Returns:**
- Array of posts where `is_archived = true`
- Only for logged-in user
- Includes user profile data

### 3. `useDeletePost` - Delete Posts

```typescript
import { useDeletePost } from "@/hooks/usePostActions";

const deletePost = useDeletePost();

const handleDelete = async (postId: string) => {
  await deletePost.mutateAsync(postId);
};
```

---

## 🧩 UI Components

### 1. PostOptionsMenu Component

Three-dot menu for post actions (archive/delete):

```typescript
import { PostOptionsMenu } from "@/components/PostOptionsMenu";

<PostOptionsMenu
  postId={post.id}
  isOwner={currentUser.id === post.user_id}
  isArchived={post.is_archived}
  onDeleteSuccess={() => {
    // Handle post deletion (e.g., remove from list)
  }}
/>
```

**Features:**
- Only shows for post owner
- Toggles between "Archive Post" and "Show on Profile"
- Delete option with confirmation
- Loading states

### 2. ArchivedPostsModal Component

Modal for viewing and managing archived posts:

```typescript
import { ArchivedPostsModal } from "@/components/ArchivedPostsModal";

const [archiveModalOpen, setArchiveModalOpen] = useState(false);

<ArchivedPostsModal
  open={archiveModalOpen}
  onOpenChange={setArchiveModalOpen}
/>
```

**Features:**
- Displays all user's archived posts
- Post previews with images
- Unarchive/delete actions
- Empty state handling
- Loading and error states

### 3. ArchiveNavigation Components

Add archive button to navigation:

```typescript
import { ArchiveNavigation } from "@/components/ArchiveNavigation";

// Standalone button variant
<ArchiveNavigation />

// Or dropdown menu variant
<ArchiveMenuDropdown />
```

---

## 📍 Integration Points

### Where to Add the Archive Button

#### 1. Post Card/Feed Item (3-dot menu)
```typescript
// In your post component
<PostOptionsMenu
  postId={post.id}
  isOwner={isOwner}
  isArchived={post.is_archived}
/>
```

#### 2. Profile Navigation
Add to user profile sidebar or menu:
```typescript
<ArchiveNavigation />

// Or in a dropdown menu
<ArchiveMenuDropdown />
```

#### 3. User Settings/Preferences
Add as a link in user settings drawer.

---

## 🔄 Data Flow

### Archiving a Post

```
User clicks "Archive Post"
    ↓
PostOptionsMenu triggers toggleArchive.mutateAsync(false)
    ↓
useToggleArchive hook:
  1. Optimistically remove post from UI
  2. Send update to Supabase
  3. Invalidate cache
    ↓
Post disappears from feed
Toast: "Post archived"
    ↓
Post now in Archived Posts view
```

### Viewing Archived Posts

```
User clicks "Archived Posts" button
    ↓
ArchivedPostsModal opens
    ↓
useArchivedPosts fetches:
  SELECT * FROM posts
  WHERE user_id = AUTH_USER
  AND is_archived = true
    ↓
Display archived posts with unarchive/delete options
```

### Unarchiving a Post

```
User clicks "Show on Profile"
    ↓
toggleArchive.mutateAsync(true)
    ↓
Update sets is_archived = false
    ↓
Post removed from archive view
Post reappears in user's profile feed
Toast: "Post restored"
```

---

## 🛡️ Security Considerations

### Row-Level Security (RLS)

Add RLS policies to Supabase:

```sql
-- Users can only view their own archived posts
CREATE POLICY "Users can view their own archived posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id AND is_archived = true);

-- Archived posts never visible to others
CREATE POLICY "Public cannot see archived posts"
  ON posts FOR SELECT
  USING (is_archived = false OR auth.uid() = user_id);

-- Only owner can archive
CREATE POLICY "Users can archive their own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Backend Verification

All mutations verify ownership:
```typescript
// Example from useToggleArchive
const { data: post } = await supabase
  .from("posts")
  .select("user_id")
  .eq("id", postId)
  .single();

if (post.user_id !== user.id) 
  throw new Error("Only post owner can archive posts");
```

---

## 📊 Query Optimization

### Feed Queries (Performance)

Always exclude archived posts:

```typescript
// ❌ BAD - Inefficient
const { data } = await supabase
  .from("posts")
  .select("*")
  .order("created_at", { ascending: false });

// ✅ GOOD - Efficient with index
const { data } = await supabase
  .from("posts")
  .select("*")
  .eq("is_archived", false)
  .order("created_at", { ascending: false });
```

### Archive Queries (Performance)

Use composite index:

```typescript
// Uses idx_posts_archived_by_user index
const { data } = await supabase
  .from("posts")
  .select("*")
  .eq("user_id", currentUser.id)
  .eq("is_archived", true)
  .order("created_at", { ascending: false });
```

---

## 🧪 Testing Checklist

- [ ] Archive a post → disappears from feed
- [ ] Open Archived Posts → post appears
- [ ] Unarchive a post → reappears in profile
- [ ] Delete archived post → removed from archive
- [ ] Only owner sees archive button
- [ ] Archived posts don't show in other user feeds
- [ ] Toast notifications appear
- [ ] Optimistic updates work smoothly
- [ ] Error handling works (network failures)
- [ ] Loading states display correctly

---

## 🚀 Deployment

### Steps to Deploy

1. **Back up your database** (Supabase → Backups)

2. **Run the migration:**
   - Go to Supabase Dashboard → SQL Editor
   - Paste and run `supabase/migrations/add_archive_post_feature.sql`
   - Verify: `SELECT * FROM posts LIMIT 1;` should show `is_archived` column

3. **Deploy code changes:**
   ```bash
   git add .
   git commit -m "feat: Implement archive post feature"
   git push
   ```

4. **Test in production:**
   - Create a test post
   - Archive it
   - Verify it disappears from feed
   - Open Archived Posts modal
   - Verify it appears there

5. **Monitor:**
   - Check Supabase logs for errors
   - Monitor performance with new indexes

---

## 🐛 Troubleshooting

### Posts still visible after archiving

**Problem:** `is_archived` column not added to database
**Solution:** 
1. Check Supabase migrations table
2. Run migration manually via SQL Editor
3. Verify column exists: `DESC posts;`

### Archived Posts modal shows empty

**Problem:** Query filtering not working correctly
**Solution:**
1. Check browser console for errors
2. Verify auth user is logged in
3. Check Supabase RLS policies

### Archive button not showing

**Problem:** Component not imported or condition incorrect
**Solution:**
1. Verify `isOwner` prop is true
2. Import `PostOptionsMenu` correctly
3. Check component is rendered

### Query too slow

**Problem:** Missing indexes
**Solution:**
1. Run migration with all indexes
2. Check query plan: `EXPLAIN ANALYZE SELECT ...`
3. Verify index creation: `SELECT * FROM pg_indexes;`

---

## 📚 Files Created

| File | Purpose |
|------|---------|
| `src/hooks/usePostInteractions.ts` | `useToggleArchive` + `useArchivedPosts` hooks |
| `src/hooks/usePostActions.ts` | `useDeletePost` hook |
| `src/components/PostOptionsMenu.tsx` | 3-dot menu for post actions |
| `src/components/ArchivedPostsModal.tsx` | Archive viewing modal |
| `src/components/ArchiveNavigation.tsx` | Navigation to archived posts |
| `supabase/migrations/add_archive_post_feature.sql` | Database migration |
| `supabase/policies/archive_post_policies.sql` | RLS policies |

---

## 🎯 Next Steps

1. ✅ Database migration created
2. ✅ Backend hooks implemented
3. ✅ UI components created
4. **→ Integrate components into your existing pages**
5. **→ Update all feed queries to exclude archived**
6. **→ Test thoroughly**
7. **→ Deploy to production**

---

## 💡 Tips & Best Practices

- **Soft Delete Pattern:** Archiving is a soft delete - data remains for analytics
- **User Experience:** Show clear toast messages for every action
- **Performance:** Always filter archived posts in feed queries
- **Analytics:** Track archive/unarchive for user insights
- **Future:** Consider bulk archive operations for premium users

---

## 🔗 Related Documentation

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [React Query](https://tanstack.com/query/latest)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

**Questions?** Check the implementation files or review the database migration for reference.
