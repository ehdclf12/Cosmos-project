-- profiles
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- 신규 가입 시 profiles 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8),
    coalesce(new.raw_user_meta_data->>'full_name', '독자')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- books
create table public.books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text not null,
  cover_url text,
  publisher text,
  published_year integer,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

-- user_books
create type public.book_status as enum ('want_to_read', 'reading', 'finished');

create table public.user_books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  status public.book_status not null default 'want_to_read',
  current_page integer check (current_page >= 0),
  total_pages integer check (total_pages >= 1),
  started_at date,
  finished_at date,
  memo text,
  created_at timestamptz default now() not null,
  unique(user_id, book_id)
);

create index on public.user_books(user_id);
create index on public.user_books(book_id);

-- reviews
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  content text,
  is_public boolean not null default true,
  created_at timestamptz default now() not null,
  unique(user_id, book_id)
);

create index on public.reviews(book_id);
create index on public.reviews(user_id);

-- RLS 활성화
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.user_books enable row level security;
alter table public.reviews enable row level security;

-- profiles
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- books
create policy "books_select" on public.books for select using (true);
create policy "books_insert" on public.books for insert with check (auth.role() = 'authenticated');

-- user_books
create policy "user_books_select" on public.user_books for select using (auth.uid() = user_id);
create policy "user_books_insert" on public.user_books for insert with check (auth.uid() = user_id);
create policy "user_books_update" on public.user_books for update using (auth.uid() = user_id);
create policy "user_books_delete" on public.user_books for delete using (auth.uid() = user_id);

-- reviews
create policy "reviews_select" on public.reviews for select using (is_public = true or auth.uid() = user_id);
create policy "reviews_insert" on public.reviews for insert with check (auth.uid() = user_id);
create policy "reviews_update" on public.reviews for update using (auth.uid() = user_id);
create policy "reviews_delete" on public.reviews for delete using (auth.uid() = user_id);
