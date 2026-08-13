# Archive Post Feature - Complete Integration Guide

## ✅ What Has Been Created

You now have a complete Instagram-style archive post feature with all these files:

### Backend Hooks (in `src/hooks/`)
- ✅ `usePostInteractions.ts` - Contains `useToggleArchive()` and `useArchivedPosts()` hooks
- ✅ `usePostActions.ts` - Contains `useDeletePost()` hook

### UI Components (in `src/components/`)
- ✅ `PostOptionsMenu.tsx` - 3-dot menu with Archive/Delete options (visible only to post owner)
- ✅ `ArchivedPostsModal.tsx` - Modal to view all archived posts and unarchive them
- ✅ `ArchiveNavigation.tsx` - Navigation components to access archived posts

### Database & Security (in `supabase/`)
- ✅ `migrations/add_archive_post_feature.sql` - Adds `is_archived` column with indexes
- ✅ `policies/archive_post_policies.sql` - RLS policies to hide archived posts from public

### Documentation
- ✅ `ARCHIVE_FEATURE_GUIDE.md` - Complete feature documentation
- ✅ This file - Integration checklist

---

## 🚀 Step-by-Step Integration

### Step 1: Database Migration (Do First!)

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy the entire content from: `supabase/migrations/add_archive_post_feature.sql`
4. Paste and execute it
5. Verify the migration worked by running:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'posts' AND column_name = 'is_archived';
   ```
   Should return: `is_archived` column

---

### Step 2: Update Your Feed Queries

**CRITICAL:** All feed queries must exclude archived posts. Find and update:

#### Main Feed Query
```typescript
// BEFORE
const { data } = await supabase
  .from("posts")
  .select("*")
  .order("created_at", { ascending: false });

// AFTER - Add this line!
const { data } = await supabase
  .from("posts")
  .select("*")
  .eq("is_archived", false)  // ← ADD THIS
  .order("created_at", { ascending: false });
```

**Find these files and update them:**
- Feed/Home page query
- Explore/Discover page query
- User profile query
- Search results query
- Any other public feed queries

---

### Step 3: Add Archive Button to Post Card

In your **post component** (e.g., `PostCard.tsx`, `FeedItem.tsx`), add the options menu:

```typescript
import { PostOptionsMenu } from "@/components/PostOptionsMenu";

export const PostCard = ({ post, currentUserId }) => {
  const isOwner = currentUserId === post.user_id;

  return (
    <div className="post-card">
      {/* Post header */}
      <div className="flex justify-between items-center">
        <div>Author name</div>
        
        {/* ADD THIS - 3-dot menu */}
        <PostOptionsMenu
          postId={post.id}
          isOwner={isOwner}
          isArchived={post.is_archived}
          onDeleteSuccess={() => {
            // Refresh feed or remove post from UI
          }}
        />
      </div>

      {/* Post content */}
      <div>Post content here...</div>
    </div>
  );
};
```

---

### Step 4: Add Archive Navigation Button

Choose where to add the archive access button in your app:

#### Option A: User Profile Menu
```typescript
import { ArchiveNavigation } from "@/components/ArchiveNavigation";

export const UserMenu = () => {
  return (
    <div className="user-menu">
      <ArchiveNavigation />  {/* Add this */}
      {/* Other menu items */}
    </div>
  );
};
```

#### Option B: Navigation Bar
```typescript
import { ArchiveIconButton } from "@/components/ArchiveNavigation";

export const Navbar = () => {
  return (
    <nav className="navbar">
      <ArchiveIconButton />  {/* Add this */}
      {/* Other nav items */}
    </nav>
  );
};
```

#### Option C: Dropdown Menu
```typescript
import { ArchiveMenuDropdown } from "@/components/ArchiveNavigation";

export const ProfileDropdown = () => {
  return <ArchiveMenuDropdown />;  {/* Add this */}
};
```

---

### Step 5: Update RLS Policies (Optional but Recommended)

For extra security, apply the RLS policies:

1. Go to **Supabase Dashboard** → **Authentication** → **Policies**
2. Copy the policies from: `supabase/policies/archive_post_policies.sql`
3. Apply them to ensure archived posts are never visible to others

---

## 📊 How It Works

### User Flow: Archiving a Post

```
1. User clicks 3-dot menu on their post
2. Selects "Archive Post"
3. PostOptionsMenu calls useToggleArchive hook
4. Post is updated: is_archived = true
5. Post disappears from feed (optimistic update)
6. Toast notification: "Post archived"
```

### User Flow: Viewing Archived Posts

```
1. User clicks "Archived Posts" button/link
2. ArchivedPostsModal opens
3. useArchivedPosts hook fetches archived posts
4. Modal displays all archived posts
5. User can unarchive or delete them
```

### User Flow: Unarchiving a Post

```
1. User opens Archived Posts modal
2. Clicks "Show on Profile" button
3. Post is updated: is_archived = false
4. Post removed from archive view
5. Post reappears on user's profile
6. Toast notification: "Post restored"
```

---

## 🔍 Testing Checklist

Before going live, test these scenarios:

- [ ] **Archive a post** → Post disappears from main feed
- [ ] **View archived posts** → Click archive button, modal opens
- [ ] **See archived post** → Your archived post appears in modal
- [ ] **Unarchive post** → Click "Show on Profile", post returns to profile
- [ ] **Delete archived post** → Post removed from archive
- [ ] **Other user can't see archived post** → Switch to another account, archived post not visible
- [ ] **Feed doesn't show archived** → Main feed/explore doesn't show archived posts
- [ ] **Toast messages appear** → Get visual feedback for actions
- [ ] **Loading states** → Modal shows loader while fetching
- [ ] **Empty state** → Modal shows message when no archived posts

---

## 🎯 Files Location Reference

```
project-root/
├── src/
│   ├── hooks/
│   │   ├── usePostInteractions.ts    ✅ (useToggleArchive, useArchivedPosts)
│   │   └── usePostActions.ts         ✅ (useDeletePost)
│   └── components/
│       ├── PostOptionsMenu.tsx       ✅ (3-dot menu)
│       ├── ArchivedPostsModal.tsx    ✅ (archive viewer)
│       └── ArchiveNavigation.tsx     ✅ (navigation buttons)
├── supabase/
│   ├── migrations/
│   │   └── add_archive_post_feature.sql  ✅
│   └── policies/
│       └── archive_post_policies.sql     ✅
├── ARCHIVE_FEATURE_GUIDE.md          ✅ (detailed guide)
└── ARCHIVE_INTEGRATION_GUIDE.md      ✅ (this file)
```

---

## 💡 Key Implementation Details

### 1. Archive Toggle Logic
- Works as a switch: click once to archive, click again to unarchive
- `is_archived = false` → "Archive Post" button shown
- `is_archived = true` → "Show on Profile" button shown

### 2. Permissions
- Only post owner can see and use archive button
- Other users cannot see archived posts (enforced by RLS)
- Only owner can unarchive their own posts

### 3. Data Integrity
- Archived posts are NOT deleted from database
- All post data is preserved for analytics/recovery
- Can be restored anytime

### 4. Performance
- Indexes created for fast queries
- Feed queries use index to skip archived posts
- Archive view efficiently fetches only archived posts

---

## 🐛 Common Issues & Solutions

### "is_archived column not found"
**Solution:** Make sure you ran the migration in Supabase SQL Editor

### "Archive button not showing"
**Solution:** 
1. Check `isOwner` prop is correct
2. Verify import: `import { PostOptionsMenu } from "@/components/PostOptionsMenu";`

### "Archived posts still visible in feed"
**Solution:** Add `.eq("is_archived", false)` to all feed queries

### "Modal doesn't show archived posts"
**Solution:** 
1. Ensure user is logged in
2. Check browser console for errors
3. Verify RLS policies allow reading archived posts

### "Can't unarchive posts"
**Solution:** 
1. Check that `isArchived={post.is_archived}` prop is passed to PostOptionsMenu
2. Verify user ownership

---

## 📱 UI Preview

### 3-Dot Menu (in post card)
```
⋯ (click to open menu)
├─ Archive Post
└─ Delete Post
```

### Archived Posts Modal
```
[X] Archived Posts
─────────────────────────
[User Avatar] Username
               Oct 13, 2024
               Post content here...
               [Image]
                                    [⋯]
                                    ├─ Show on Profile
                                    └─ Delete Post

[No archived posts yet]
```

### Navigation Button
```
📦 Archived Posts  (or just archive icon)
```

---

## ✨ Features Summary

| Feature | Status | Location |
|---------|--------|----------|
| Archive post without deleting | ✅ | `useToggleArchive` hook |
| Unarchive posts | ✅ | `useToggleArchive` hook |
| View all archived posts | ✅ | `ArchivedPostsModal` component |
| Delete archived post | ✅ | `useDeletePost` hook |
| Hide from public feed | ✅ | Database query + RLS |
| Only owner sees archive button | ✅ | `PostOptionsMenu` component |
| Toast notifications | ✅ | `useToggleArchive` hook |
| Loading states | ✅ | `ArchivedPostsModal` component |
| Error handling | ✅ | All hooks |
| Optimistic UI updates | ✅ | React Query cache |

---

## 🚢 Deployment Checklist

- [ ] Database migration executed in Supabase
- [ ] All feed queries updated to exclude archived posts
- [ ] PostOptionsMenu added to post cards
- [ ] Archive navigation button added to UI
- [ ] All files committed to git
- [ ] Testing completed locally
- [ ] Push to production
- [ ] Monitor Supabase logs for errors

---

## 📞 Need Help?

1. **Check the detailed guide:** `ARCHIVE_FEATURE_GUIDE.md`
2. **Review hook implementations:** `src/hooks/usePostInteractions.ts`
3. **Check component code:** `src/components/ArchivedPostsModal.tsx`
4. **Look at database migration:** `supabase/migrations/add_archive_post_feature.sql`

---

## 🎉 You're Done!

All the code is ready to integrate. Follow the steps above and your archive feature will be live!

**Last step:** Test thoroughly in development before deploying to production.
