export interface FeedPostMedia {
  id: string;
  media_url: string;
  media_type: string;
  display_order: number;
}

export interface FeedAuthor {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  profile_theme?: string | null;
}

export interface FeedPost {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  likes_count: number;
  comments_count: number;
  is_reel: boolean;
  created_at: string;
  topic_tags?: string[] | null;
  visibility?: string | null;
  circle_id?: string | null;
  profiles: FeedAuthor | null;
  post_media?: FeedPostMedia[];
}

export interface FeedPage {
  posts: FeedPost[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type FeedbackType = "not_interested" | "hide" | "mute" | "block";

export type FeedEventType =
  | "post_view"
  | "post_view_duration"
  | "post_like"
  | "post_comment"
  | "post_share"
  | "post_save"
  | "post_hide"
  | "post_not_interested"
  | "profile_visit"
  | "follow"
  | "unfollow";
