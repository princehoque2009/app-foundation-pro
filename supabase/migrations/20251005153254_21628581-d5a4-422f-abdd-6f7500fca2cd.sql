-- Create profiles table for user data
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  
  constraint username_length check (char_length(username) >= 3 and char_length(username) <= 30),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]+$')
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles are viewable by everyone
create policy "Profiles are viewable by everyone" 
  on public.profiles 
  for select 
  using (true);

-- Users can update their own profile
create policy "Users can update their own profile" 
  on public.profiles 
  for update 
  using (auth.uid() = id);

-- Users can insert their own profile
create policy "Users can insert their own profile" 
  on public.profiles 
  for insert 
  with check (auth.uid() = id);

-- Function to handle new user signups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name')
  );
  return new;
end;
$$;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for updated_at on profiles
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();