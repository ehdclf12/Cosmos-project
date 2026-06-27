-- supabase/migrations/003_goods_enhancement.sql

-- goods 테이블: original_price 제거, discount_rate + published_at 추가
alter table public.goods drop column if exists original_price;

alter table public.goods
  add column if not exists discount_rate integer not null default 0
    check (discount_rate >= 0 and discount_rate <= 100);

alter table public.goods
  add column if not exists published_at timestamptz;

-- page_views 테이블
create table if not exists public.page_views (
  id uuid default gen_random_uuid() primary key,
  path text not null,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

alter table public.page_views enable row level security;

-- 누구나 insert 가능 (비로그인 방문자 포함)
create policy "page_views_insert" on public.page_views
  for insert with check (true);

-- 관리자만 조회
create policy "page_views_admin_select" on public.page_views
  for select using (public.is_admin());

-- Storage 버킷 (이미 있으면 건너뜀)
insert into storage.buckets (id, name, public)
values ('goods-images', 'goods-images', true)
on conflict (id) do nothing;

-- Storage 정책
create policy "goods_images_public_read" on storage.objects
  for select using (bucket_id = 'goods-images');

create policy "goods_images_admin_upload" on storage.objects
  for insert with check (public.is_admin() and bucket_id = 'goods-images');

create policy "goods_images_admin_delete" on storage.objects
  for delete using (public.is_admin() and bucket_id = 'goods-images');
