-- 017_site_content.sql — 랜딩 콘텐츠(발행/초안) + 이미지 버킷

create table if not exists public.site_content (
  key        text primary key,          -- 'landing' | 'landing_draft'
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- 발행본만 공개 read (비로그인 랜딩 렌더)
drop policy if exists "site_content_public_read" on public.site_content;
create policy "site_content_public_read" on public.site_content
  for select using (key = 'landing');

-- 관리자 전체 접근 (기존 is_admin() 재사용)
drop policy if exists "site_content_admin_all" on public.site_content;
create policy "site_content_admin_all" on public.site_content
  for all using (public.is_admin()) with check (public.is_admin());

-- 시드: 발행본 + 초안 (현재 content.ts와 동일 초기값, Hero는 images 배열)
insert into public.site_content (key, data) values
  ('landing', '{
    "hero": { "images": [{ "src": "/monet_05_japanese_footbridge_hq.png", "alt": "Monet — The Japanese Footbridge" }], "intervalMs": 5000 },
    "section1": {
      "featured": { "imageSrc": "/monet_01_water_lilies_1906_ryerson_hq.png", "imageAlt": "Monet — Water Lilies", "category": "FEATURED", "title": "The books that shaped us", "body": "A curated selection of titles from our community of readers." },
      "grid": [
        { "imageSrc": "/monet_04_artist_garden_giverny_hq.png", "imageAlt": "Monet — Artist Garden at Giverny", "title": "Reading together" },
        { "imageSrc": "/monet_06_seine_at_vetheuil_hq.png", "imageAlt": "Monet — The Seine at Vétheuil", "title": "Slow books" },
        { "imageSrc": "/monet_03_water_lily_pond_weeping_willow_hq.png", "imageAlt": "Monet — Water Lily Pond", "title": "Club picks" },
        { "imageSrc": "/monet_02_impression_sunrise_hq.png", "imageAlt": "Monet — Impression, Sunrise", "title": "This month" }
      ]
    },
    "section2": { "items": [
      { "imageSrc": "/monet_06_seine_at_vetheuil_hq.png", "imageAlt": "Monet — The Seine at Vétheuil", "category": "BOOKS", "title": "Titles worth your time" },
      { "imageSrc": "/monet_04_artist_garden_giverny_hq.png", "imageAlt": "Monet — Artist Garden at Giverny", "category": "CLUBS", "title": "Find your reading circle" },
      { "imageSrc": "/monet_05_japanese_footbridge_hq.png", "imageAlt": "Monet — The Japanese Footbridge", "category": "COMMUNITY", "title": "Notes from our readers" }
    ] },
    "section3": { "imageSrc": "/monet_03_water_lily_pond_weeping_willow_hq.png", "imageAlt": "Monet — Water Lily Pond with Weeping Willow", "headline": "Join the conversation", "sub": "Find your next book club." }
  }'::jsonb)
on conflict (key) do nothing;

insert into public.site_content (key, data)
  select 'landing_draft', data from public.site_content where key = 'landing'
on conflict (key) do nothing;

-- Storage 버킷 (public)
insert into storage.buckets (id, name, public)
  values ('landing-images', 'landing-images', true)
on conflict (id) do nothing;

-- 버킷 정책: 공개 read + 관리자 write/delete
drop policy if exists "landing_images_public_read" on storage.objects;
create policy "landing_images_public_read" on storage.objects
  for select using (bucket_id = 'landing-images');

drop policy if exists "landing_images_admin_write" on storage.objects;
create policy "landing_images_admin_write" on storage.objects
  for insert with check (bucket_id = 'landing-images' and public.is_admin());

drop policy if exists "landing_images_admin_delete" on storage.objects;
create policy "landing_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'landing-images' and public.is_admin());
