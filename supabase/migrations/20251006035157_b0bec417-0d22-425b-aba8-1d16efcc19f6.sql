-- Create storage bucket for post media
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true);

-- Create posts table
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  caption text,
  media_url text,
  media_type text check (media_type in ('image', 'video')),
  likes_count integer default 0,
  comments_count integer default 0,
  is_reel boolean default false,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create comments table
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now() not null
);

-- Create likes table
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null,
  unique(post_id, user_id)
);

-- Enable RLS
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;

-- Posts policies
create policy "Posts are viewable by everyone"
  on public.posts for select
  using (true);

create policy "Users can create their own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on public.posts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- Comments policies
create policy "Comments are viewable by everyone"
  on public.comments for select
  using (true);

create policy "Users can create comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own comments"
  on public.comments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- Likes policies
create policy "Likes are viewable by everyone"
  on public.likes for select
  using (true);

create policy "Users can create likes"
  on public.likes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own likes"
  on public.likes for delete
  using (auth.uid() = user_id);

-- Storage policies for post-media bucket
create policy "Post media is publicly accessible"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "Users can upload their own post media"
  on storage.objects for insert
  with check (
    bucket_id = 'post-media' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own post media"
  on storage.objects for update
  using (
    bucket_id = 'post-media' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own post media"
  on storage.objects for delete
  using (
    bucket_id = 'post-media' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to increment likes count
create or replace function public.handle_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts
    set likes_count = likes_count + 1
    where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts
    set likes_count = likes_count - 1
    where id = OLD.post_id;
  end if;
  return null;
end;
$$;

-- Function to increment comments count
create or replace function public.handle_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts
    set comments_count = comments_count + 1
    where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts
    set comments_count = comments_count - 1
    where id = OLD.post_id;
  end if;
  return null;
end;
$$;

-- Triggers
create trigger on_like_created
  after insert on public.likes
  for each row execute function public.handle_like_count();

create trigger on_like_deleted
  after delete on public.likes
  for each row execute function public.handle_like_count();

create trigger on_comment_created
  after insert on public.comments
  for each row execute function public.handle_comment_count();

create trigger on_comment_deleted
  after delete on public.comments
  for each row execute function public.handle_comment_count();

create trigger on_posts_updated
  before update on public.posts
  for each row execute function public.handle_updated_at();