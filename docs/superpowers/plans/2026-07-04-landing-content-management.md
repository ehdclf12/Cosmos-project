# 랜딩 콘텐츠 관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 랜딩 페이지의 이미지·문구를 어드민에서 편집(초안→미리보기→발행)할 수 있게 하고, Hero를 관리자 지정 속도의 자동 슬라이드 캐러셀로 만든다.

**Architecture:** 랜딩 콘텐츠를 `content.ts` 하드코딩 → Supabase `site_content` 테이블(JSONB, 발행/초안 2행)로 이전. 순수 타입·기본값·merge 로직은 `@cosmos/shared`에 두고 jest로 TDD. 랜딩 렌더는 DB에서 발행본을 읽고, `/?preview=1`(admin 한정)로 초안을 미리보기한다. 어드민 `/admin/content` 에디터에서 이미지 업로드(`landing-images` 버킷)와 텍스트를 편집한다.

**Tech Stack:** Next.js 16 (App Router, Server Components/Actions), React 19, Supabase (Postgres + Storage, untyped client), `@cosmos/shared`(ts-jest), TypeScript.

## Global Constraints

- node/pnpm 경로: `/Users/cosmos/.local/node/bin` — 명령 실행 전 `export PATH="/Users/cosmos/.local/node/bin:$PATH"`.
- 이 repo는 **auto-commit hook**이 편집 시 자동 커밋·푸시한다. 각 Task의 커밋 스텝은 논리적 단위 표시용이며, 훅이 이미 커밋했으면 `git commit`은 "nothing to commit"일 수 있다 — 정상.
- Supabase 마이그레이션은 **수동 적용**(Supabase 대시보드 SQL 에디터). 파일 작성 = 코드 작업, 실제 적용 = 사용자 수동 단계.
- Supabase 클라이언트는 untyped. 쿼리 결과의 `any`는 로컬 타입 캐스트(`as unknown as T`)로 처리하고 인라인 `as any` 금지 (기존 컨벤션, ESLint `no-explicit-any` 0 유지).
- 어드민 라우트(`/admin/:path*`)는 `middleware.ts`가 `app_metadata.role === 'admin'`로 이미 보호. 추가 가드 불필요.
- 스타일 토큰: 텍스트/보더 `#1C1C1C`, 카드 배경 `#E8E5E0`, 서브텍스트 `#6B6862`/`#A8A49C`.
- 슬라이드 속도는 UI에서 **초 단위** 입력, 저장은 **ms**(`intervalMs`).

---

## File Structure

| 파일 | 책임 |
|------|------|
| `packages/shared/src/landing.ts` | 랜딩 콘텐츠 타입 + `DEFAULT_LANDING_CONTENT` + `withDefaults()` merge (순수) |
| `packages/shared/src/__tests__/landing.test.ts` | `withDefaults` 유닛 테스트 |
| `packages/shared/src/index.ts` | `./landing` 재export (수정) |
| `supabase/migrations/017_site_content.sql` | 테이블 + RLS + `landing-images` 버킷 + 시드 |
| `apps/web/lib/landing-content.ts` | `getPublishedLandingContent` / `getDraftLandingContent` (DB 어댑터) |
| `apps/web/app/page.tsx` | 랜딩 렌더 — async, 발행본 fetch, `?preview=1` 초안(admin) (수정) |
| `apps/web/app/landing/sections/HeroCarousel.tsx` | 자동 슬라이드 캐러셀 (신규) |
| `apps/web/app/landing/sections/HeroSection.tsx` | 캐러셀 사용하도록 수정 |
| `apps/web/app/landing/sections/{EditorialSection,GridSection,BannerSection}.tsx` | 타입 import를 `@cosmos/shared`로 변경 |
| `apps/web/app/landing/content.ts` | 삭제 (타입·기본값은 shared로 이전) |
| `apps/web/app/(admin)/admin/content/actions.ts` | `saveDraft` / `publish` server actions |
| `apps/web/app/(admin)/admin/content/page.tsx` | 초안 로드 → 에디터 |
| `apps/web/app/(admin)/admin/content/_components/upload.ts` | Storage 업로드 헬퍼 |
| `apps/web/app/(admin)/admin/content/_components/SlotImageField.tsx` | 단일 이미지 슬롯 필드 |
| `apps/web/app/(admin)/admin/content/_components/HeroImagesField.tsx` | Hero 다중 이미지 + 속도 |
| `apps/web/app/(admin)/admin/content/_components/ContentEditor.tsx` | 에디터 폼 + 저장/발행/미리보기 |
| `apps/web/app/(admin)/_components/AdminSidebar.tsx` | "콘텐츠 관리" 메뉴 추가 (수정) |

---

## Task 1: 랜딩 콘텐츠 타입·기본값·merge (shared, TDD)

**Files:**
- Create: `packages/shared/src/landing.ts`
- Create: `packages/shared/src/__tests__/landing.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: `LandingContent`, `HeroContent`, `HeroImage`, `FeaturedContent`, `GridItemContent`, `GridCardContent`, `BannerContent`, `DEFAULT_LANDING_CONTENT: LandingContent`, `withDefaults(data: unknown): LandingContent`.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/__tests__/landing.test.ts`:

```ts
import { withDefaults, DEFAULT_LANDING_CONTENT } from '../landing'

describe('withDefaults', () => {
  it('빈 입력이면 기본값을 반환', () => {
    expect(withDefaults({})).toEqual(DEFAULT_LANDING_CONTENT)
    expect(withDefaults(null)).toEqual(DEFAULT_LANDING_CONTENT)
    expect(withDefaults(undefined)).toEqual(DEFAULT_LANDING_CONTENT)
  })

  it('구형 Hero(단일 imageSrc)를 images 배열로 변환', () => {
    const r = withDefaults({ hero: { imageSrc: '/a.png', imageAlt: 'A' } })
    expect(r.hero.images).toEqual([{ src: '/a.png', alt: 'A' }])
    expect(r.hero.intervalMs).toBe(5000)
  })

  it('Hero images/intervalMs를 보존', () => {
    const r = withDefaults({ hero: { images: [{ src: '/x.png', alt: 'X' }, { src: '/y.png', alt: 'Y' }], intervalMs: 3000 } })
    expect(r.hero.images).toHaveLength(2)
    expect(r.hero.intervalMs).toBe(3000)
  })

  it('Hero images가 비어있으면 기본 이미지로 대체', () => {
    const r = withDefaults({ hero: { images: [], intervalMs: 2000 } })
    expect(r.hero.images).toEqual(DEFAULT_LANDING_CONTENT.hero.images)
  })

  it('intervalMs가 유효하지 않으면 5000', () => {
    expect(withDefaults({ hero: { images: [{ src: '/x.png', alt: '' }], intervalMs: 0 } }).hero.intervalMs).toBe(5000)
    expect(withDefaults({ hero: { images: [{ src: '/x.png', alt: '' }] } }).hero.intervalMs).toBe(5000)
  })

  it('section1.featured의 부분 필드를 기본값과 병합', () => {
    const r = withDefaults({ section1: { featured: { title: '새 제목' } } })
    expect(r.section1.featured.title).toBe('새 제목')
    expect(r.section1.featured.category).toBe(DEFAULT_LANDING_CONTENT.section1.featured.category)
  })

  it('빈 grid/items는 기본값으로 대체', () => {
    const r = withDefaults({ section1: { grid: [] }, section2: { items: [] } })
    expect(r.section1.grid).toEqual(DEFAULT_LANDING_CONTENT.section1.grid)
    expect(r.section2.items).toEqual(DEFAULT_LANDING_CONTENT.section2.items)
  })

  it('section3 부분 필드 병합', () => {
    const r = withDefaults({ section3: { headline: 'HELLO' } })
    expect(r.section3.headline).toBe('HELLO')
    expect(r.section3.imageSrc).toBe(DEFAULT_LANDING_CONTENT.section3.imageSrc)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd packages/shared && pnpm test -- landing
```
Expected: FAIL — `Cannot find module '../landing'`.

- [ ] **Step 3: Write the implementation**

Create `packages/shared/src/landing.ts`:

```ts
export interface HeroImage { src: string; alt: string }
export interface HeroContent { images: HeroImage[]; intervalMs: number }
export interface FeaturedContent { imageSrc: string; imageAlt: string; category: string; title: string; body: string }
export interface GridItemContent { imageSrc: string; imageAlt: string; title: string }
export interface GridCardContent { imageSrc: string; imageAlt: string; category: string; title: string }
export interface BannerContent { imageSrc: string; imageAlt: string; headline: string; sub: string }

export interface LandingContent {
  hero: HeroContent
  section1: { featured: FeaturedContent; grid: GridItemContent[] }
  section2: { items: GridCardContent[] }
  section3: BannerContent
}

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  hero: {
    images: [{ src: '/monet_05_japanese_footbridge_hq.png', alt: 'Monet — The Japanese Footbridge' }],
    intervalMs: 5000,
  },
  section1: {
    featured: {
      imageSrc: '/monet_01_water_lilies_1906_ryerson_hq.png',
      imageAlt: 'Monet — Water Lilies',
      category: 'FEATURED',
      title: 'The books that shaped us',
      body: 'A curated selection of titles from our community of readers.',
    },
    grid: [
      { imageSrc: '/monet_04_artist_garden_giverny_hq.png', imageAlt: 'Monet — Artist Garden at Giverny', title: 'Reading together' },
      { imageSrc: '/monet_06_seine_at_vetheuil_hq.png', imageAlt: 'Monet — The Seine at Vétheuil', title: 'Slow books' },
      { imageSrc: '/monet_03_water_lily_pond_weeping_willow_hq.png', imageAlt: 'Monet — Water Lily Pond', title: 'Club picks' },
      { imageSrc: '/monet_02_impression_sunrise_hq.png', imageAlt: 'Monet — Impression, Sunrise', title: 'This month' },
    ],
  },
  section2: {
    items: [
      { imageSrc: '/monet_06_seine_at_vetheuil_hq.png', imageAlt: 'Monet — The Seine at Vétheuil', category: 'BOOKS', title: 'Titles worth your time' },
      { imageSrc: '/monet_04_artist_garden_giverny_hq.png', imageAlt: 'Monet — Artist Garden at Giverny', category: 'CLUBS', title: 'Find your reading circle' },
      { imageSrc: '/monet_05_japanese_footbridge_hq.png', imageAlt: 'Monet — The Japanese Footbridge', category: 'COMMUNITY', title: 'Notes from our readers' },
    ],
  },
  section3: {
    imageSrc: '/monet_03_water_lily_pond_weeping_willow_hq.png',
    imageAlt: 'Monet — Water Lily Pond with Weeping Willow',
    headline: 'Join the conversation',
    sub: 'Find your next book club.',
  },
}

function coerceHero(hero: unknown): HeroContent {
  const h = (hero ?? {}) as Record<string, unknown>
  // 구형 데이터 호환: { imageSrc, imageAlt } → images[]
  if (typeof h.imageSrc === 'string' && !Array.isArray(h.images)) {
    return { images: [{ src: h.imageSrc, alt: typeof h.imageAlt === 'string' ? h.imageAlt : '' }], intervalMs: 5000 }
  }
  const rawImages = Array.isArray(h.images) ? (h.images as unknown[]) : []
  const images = rawImages
    .map((im) => im as Record<string, unknown>)
    .filter((im) => typeof im.src === 'string' && im.src.length > 0)
    .map((im) => ({ src: im.src as string, alt: typeof im.alt === 'string' ? im.alt : '' }))
  const intervalMs = typeof h.intervalMs === 'number' && h.intervalMs > 0 ? h.intervalMs : 5000
  return {
    images: images.length > 0 ? images : DEFAULT_LANDING_CONTENT.hero.images,
    intervalMs,
  }
}

export function withDefaults(data: unknown): LandingContent {
  const d = (data ?? {}) as Partial<LandingContent>
  const s1 = (d.section1 ?? {}) as Partial<LandingContent['section1']>
  const s2 = (d.section2 ?? {}) as Partial<LandingContent['section2']>
  const grid = Array.isArray(s1.grid) && s1.grid.length > 0 ? s1.grid : DEFAULT_LANDING_CONTENT.section1.grid
  const items = Array.isArray(s2.items) && s2.items.length > 0 ? s2.items : DEFAULT_LANDING_CONTENT.section2.items
  return {
    hero: coerceHero(d.hero),
    section1: {
      featured: { ...DEFAULT_LANDING_CONTENT.section1.featured, ...(s1.featured ?? {}) },
      grid,
    },
    section2: { items },
    section3: { ...DEFAULT_LANDING_CONTENT.section3, ...(d.section3 ?? {}) },
  }
}
```

Modify `packages/shared/src/index.ts` — add at the end:

```ts
export * from './landing'
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd packages/shared && pnpm test -- landing && pnpm run lint
```
Expected: all tests PASS; `lint` (tsc --noEmit) exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/landing.ts packages/shared/src/__tests__/landing.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): landing content types + withDefaults merge"
```

---

## Task 2: DB 마이그레이션 (site_content + RLS + 버킷 + 시드)

**Files:**
- Create: `supabase/migrations/017_site_content.sql`

**Interfaces:**
- Produces: `public.site_content(key, data, updated_at)` 테이블, `landing`/`landing_draft` 시드 행, `landing-images` Storage 버킷. `lib/landing-content.ts`(Task 3)와 actions(Task 4)가 소비.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/017_site_content.sql`:

```sql
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/017_site_content.sql
git commit -m "feat(db): site_content table + RLS + landing-images bucket + seed"
```

- [ ] **Step 3: 수동 적용 안내 (사용자 액션)**

Supabase 대시보드 → SQL Editor에 위 파일 내용을 붙여 실행. 검증 쿼리:
```sql
select key, jsonb_typeof(data) from public.site_content;   -- landing, landing_draft 2행 / object
select id, public from storage.buckets where id = 'landing-images';  -- public = true
```
Expected: `landing`, `landing_draft` 두 행 존재, 버킷 public.

---

## Task 3: 랜딩 렌더 DB 연동 (fetch 레이어 + page.tsx + Hero 캐러셀)

**Files:**
- Create: `apps/web/lib/landing-content.ts`
- Create: `apps/web/app/landing/sections/HeroCarousel.tsx`
- Modify: `apps/web/app/landing/sections/HeroSection.tsx`
- Modify: `apps/web/app/landing/sections/EditorialSection.tsx`, `GridSection.tsx`, `BannerSection.tsx` (타입 import만)
- Modify: `apps/web/app/page.tsx`
- Delete: `apps/web/app/landing/content.ts`

**Interfaces:**
- Consumes: `withDefaults`, `LandingContent`, `HeroContent` from `@cosmos/shared`; `site_content` 테이블 (Task 2).
- Produces: `getPublishedLandingContent(): Promise<LandingContent>`, `getDraftLandingContent(): Promise<LandingContent>`.

- [ ] **Step 1: fetch 레이어 작성**

Create `apps/web/lib/landing-content.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { withDefaults, type LandingContent } from '@cosmos/shared'

async function readContent(key: 'landing' | 'landing_draft'): Promise<LandingContent> {
  const supabase = await createClient()
  const { data } = await supabase.from('site_content').select('data').eq('key', key).single()
  return withDefaults((data as { data?: unknown } | null)?.data)
}

export function getPublishedLandingContent(): Promise<LandingContent> {
  return readContent('landing')
}

export function getDraftLandingContent(): Promise<LandingContent> {
  return readContent('landing_draft')
}
```

- [ ] **Step 2: Hero 캐러셀 작성**

Create `apps/web/app/landing/sections/HeroCarousel.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { HeroContent } from '@cosmos/shared'

export default function HeroCarousel({ content }: { content: HeroContent }) {
  const { images, intervalMs } = content
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const t = setInterval(
      () => setIdx((i) => (i + 1) % images.length),
      Math.max(1000, intervalMs)
    )
    return () => clearInterval(t)
  }, [images.length, intervalMs])

  return (
    <div className="absolute inset-0" style={{ backgroundColor: '#C8C5BC' }}>
      {images.map((img, i) => (
        <Image
          key={`${img.src}-${i}`}
          src={img.src}
          alt={img.alt}
          fill
          priority={i === 0}
          className="object-cover transition-opacity duration-1000"
          style={{ opacity: i === idx ? 1 : 0 }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: HeroSection이 캐러셀을 쓰도록 수정**

Replace `apps/web/app/landing/sections/HeroSection.tsx` entirely:

```tsx
import type { HeroContent } from '@cosmos/shared'
import HeroCarousel from './HeroCarousel'

interface Props {
  content: HeroContent
}

export default function HeroSection({ content }: Props) {
  return (
    <section className="relative w-full" style={{ height: '100svh', marginTop: '56px' }}>
      <HeroCarousel content={content} />
    </section>
  )
}
```

- [ ] **Step 4: 나머지 섹션 타입 import 변경**

In `EditorialSection.tsx`, `GridSection.tsx`, `BannerSection.tsx`, change the type import line `from '../content'` to `from '@cosmos/shared'`. Example (EditorialSection.tsx line 2):

```tsx
// 변경 전: import type { FeaturedContent, GridItemContent } from '../content'
import type { FeaturedContent, GridItemContent } from '@cosmos/shared'
```
(GridSection: `GridCardContent`; BannerSection: `BannerContent` — 각 파일이 실제 import하는 타입명만 그대로 유지하고 경로만 교체.)

- [ ] **Step 5: page.tsx를 DB 연동 + 미리보기 지원으로 수정**

Replace the top imports and `RootPage` in `apps/web/app/page.tsx` (footer/JSX 하단은 유지):

```tsx
// apps/web/app/page.tsx
import LandingClient from './landing/LandingClient'
import HeroSection from './landing/sections/HeroSection'
import EditorialSection from './landing/sections/EditorialSection'
import GridSection from './landing/sections/GridSection'
import BannerSection from './landing/sections/BannerSection'
import { getPublishedLandingContent, getDraftLandingContent } from '@/lib/landing-content'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const { preview } = await searchParams

  let content = await getPublishedLandingContent()
  if (preview) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.app_metadata?.role === 'admin') {
      content = await getDraftLandingContent()
    }
  }

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />

      <main>
        <HeroSection content={content.hero} />
        <EditorialSection content={content.section1} />
        <GridSection content={content.section2} />
        <BannerSection content={content.section3} />
      </main>

      <footer
        className="px-6 md:px-12 py-12 border-t flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        style={{ borderColor: '#E8E5E0' }}
      >
        <span className="text-sm font-light tracking-widest" style={{ color: '#1C1C1C' }}>
          COSMOS
        </span>
        <div className="flex gap-8">
          <Link href="/coming-soon" className="text-xs tracking-wide hover:underline underline-offset-4" style={{ color: '#6B6862' }}>About</Link>
          <Link href="/clubs" className="text-xs tracking-wide hover:underline underline-offset-4" style={{ color: '#6B6862' }}>Clubs</Link>
          <Link href="/coming-soon" className="text-xs tracking-wide hover:underline underline-offset-4" style={{ color: '#6B6862' }}>Newsletter</Link>
        </div>
        <p className="text-xs" style={{ color: '#A8A49C' }}>© 2026 Cosmos. All rights reserved.</p>
      </footer>
    </div>
  )
}
```

- [ ] **Step 6: 구 content.ts 삭제**

```bash
git rm apps/web/app/landing/content.ts
```

- [ ] **Step 7: 타입체크 + 린트 검증**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint app lib
```
Expected: tsc 0 errors; eslint 0 errors (기존 경고 외 신규 없음). `../content` 잔여 import가 있으면 tsc가 잡아줌 → 해당 파일 경로 수정.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/landing-content.ts apps/web/app/landing apps/web/app/page.tsx
git commit -m "feat(landing): DB-driven content + hero carousel + preview param"
```

---

## Task 4: 어드민 액션 (saveDraft / publish)

**Files:**
- Create: `apps/web/app/(admin)/admin/content/actions.ts`

**Interfaces:**
- Consumes: `LandingContent` from `@cosmos/shared`; `site_content` 테이블.
- Produces: `saveDraft(data: LandingContent): Promise<{ error?: string }>`, `publish(): Promise<{ error?: string }>`.

- [ ] **Step 1: actions 작성**

Create `apps/web/app/(admin)/admin/content/actions.ts`:

```ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { LandingContent } from '@cosmos/shared'

export async function saveDraft(data: LandingContent): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('site_content')
    .upsert({ key: 'landing_draft', data, updated_at: new Date().toISOString() })
  return error ? { error: error.message } : {}
}

export async function publish(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: draft, error: readErr } = await supabase
    .from('site_content')
    .select('data')
    .eq('key', 'landing_draft')
    .single()
  if (readErr || !draft) return { error: readErr?.message ?? '초안을 찾을 수 없습니다.' }

  const { error } = await supabase
    .from('site_content')
    .upsert({ key: 'landing', data: (draft as { data: unknown }).data, updated_at: new Date().toISOString() })
  if (error) return { error: error.message }

  revalidatePath('/')
  return {}
}
```

- [ ] **Step 2: 타입체크**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(admin)/admin/content/actions.ts"
git commit -m "feat(admin): landing content saveDraft/publish actions"
```

---

## Task 5: 어드민 에디터 UI (업로드·필드·에디터·미리보기·메뉴)

**Files:**
- Create: `apps/web/app/(admin)/admin/content/_components/upload.ts`
- Create: `apps/web/app/(admin)/admin/content/_components/SlotImageField.tsx`
- Create: `apps/web/app/(admin)/admin/content/_components/HeroImagesField.tsx`
- Create: `apps/web/app/(admin)/admin/content/_components/ContentEditor.tsx`
- Create: `apps/web/app/(admin)/admin/content/page.tsx`
- Modify: `apps/web/app/(admin)/_components/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `saveDraft`, `publish` (Task 4); `getDraftLandingContent` (Task 3); `LandingContent`, `HeroContent` from `@cosmos/shared`; client Supabase Storage `landing-images` (Task 2).

- [ ] **Step 1: 업로드 헬퍼**

Create `apps/web/app/(admin)/admin/content/_components/upload.ts`:

```ts
import { createClient } from '@/lib/supabase/client'

export async function uploadLandingImage(file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('landing-images')
    .upload(path, file, { contentType: file.type })
  if (error) throw new Error(error.message)
  const { data: { publicUrl } } = supabase.storage.from('landing-images').getPublicUrl(path)
  return publicUrl
}
```

- [ ] **Step 2: 단일 이미지 슬롯 필드**

Create `apps/web/app/(admin)/admin/content/_components/SlotImageField.tsx`:

```tsx
'use client'
import { useState } from 'react'
import Image from 'next/image'
import { uploadLandingImage } from './upload'

interface Props {
  label: string
  recommended: string
  src: string
  onChange: (url: string) => void
}

export default function SlotImageField({ label, recommended, src, onChange }: Props) {
  const [busy, setBusy] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      onChange(await uploadLandingImage(file))
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: '#6B6862' }}>
        {label} <span style={{ color: '#A8A49C' }}>(권장 {recommended})</span>
      </label>
      <div className="flex items-center gap-3">
        <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: '#E8E5E0' }}>
          {src && <Image src={src} alt="" fill className="object-cover" />}
        </div>
        <label className="text-xs px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}>
          {busy ? '업로드 중...' : '이미지 변경'}
          <input type="file" accept="image/*" hidden onChange={handleFile} disabled={busy} />
        </label>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Hero 다중 이미지 필드**

Create `apps/web/app/(admin)/admin/content/_components/HeroImagesField.tsx`:

```tsx
'use client'
import { useState } from 'react'
import Image from 'next/image'
import type { HeroContent } from '@cosmos/shared'
import { uploadLandingImage } from './upload'

interface Props {
  value: HeroContent
  onChange: (v: HeroContent) => void
}

export default function HeroImagesField({ value, onChange }: Props) {
  const [busy, setBusy] = useState(false)

  async function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const url = await uploadLandingImage(file)
      onChange({ ...value, images: [...value.images, { src: url, alt: '' }] })
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setBusy(false)
    }
  }

  function setAlt(i: number, alt: string) {
    onChange({ ...value, images: value.images.map((im, j) => (j === i ? { ...im, alt } : im)) })
  }
  function remove(i: number) {
    onChange({ ...value, images: value.images.filter((_, j) => j !== i) })
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= value.images.length) return
    const arr = [...value.images]
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    onChange({ ...value, images: arr })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs" style={{ color: '#6B6862' }}>슬라이드 속도(초)</label>
        <input
          type="number"
          min={1}
          step={0.5}
          value={value.intervalMs / 1000}
          onChange={(e) => onChange({ ...value, intervalMs: Math.max(1, Number(e.target.value) || 1) * 1000 })}
          className="w-20 border rounded px-2 py-1 text-sm bg-white"
          style={{ borderColor: '#E8E5E0', color: '#1C1C1C' }}
        />
      </div>

      {value.images.map((im, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg p-2" style={{ backgroundColor: '#E8E5E0' }}>
          <div className="relative w-16 h-16 rounded overflow-hidden shrink-0" style={{ backgroundColor: '#C8C5BC' }}>
            {im.src && <Image src={im.src} alt="" fill className="object-cover" />}
          </div>
          <input
            value={im.alt}
            onChange={(e) => setAlt(i, e.target.value)}
            placeholder="설명(alt)"
            className="flex-1 border rounded px-2 py-1 text-sm bg-white"
            style={{ borderColor: '#E8E5E0', color: '#1C1C1C' }}
          />
          <button type="button" onClick={() => move(i, -1)} className="text-xs px-1" style={{ color: '#6B6862' }}>▲</button>
          <button type="button" onClick={() => move(i, 1)} className="text-xs px-1" style={{ color: '#6B6862' }}>▼</button>
          <button type="button" onClick={() => remove(i)} className="text-xs px-2" style={{ color: '#dc2626' }}>삭제</button>
        </div>
      ))}

      <label className="inline-block text-xs px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}>
        {busy ? '업로드 중...' : '+ 이미지 추가'} (권장 1920×1080)
        <input type="file" accept="image/*" hidden onChange={addImage} disabled={busy} />
      </label>
    </div>
  )
}
```

- [ ] **Step 4: 에디터 폼**

Create `apps/web/app/(admin)/admin/content/_components/ContentEditor.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { LandingContent } from '@cosmos/shared'
import { saveDraft, publish } from '../actions'
import HeroImagesField from './HeroImagesField'
import SlotImageField from './SlotImageField'

const inputCls = 'w-full border rounded px-2 py-1.5 text-sm bg-white'
const cardCls = 'rounded-2xl p-5 space-y-3'
const cardStyle = { backgroundColor: '#F5F4F1', border: '1px solid #E8E5E0' } as const

export default function ContentEditor({ initial }: { initial: LandingContent }) {
  const [content, setContent] = useState<LandingContent>(initial)
  const [status, setStatus] = useState('')
  const [previewKey, setPreviewKey] = useState(0)
  const [showPreview, setShowPreview] = useState(true)

  function patch(next: Partial<LandingContent>) {
    setContent((c) => ({ ...c, ...next }))
  }

  async function onSaveDraft() {
    setStatus('저장 중...')
    const r = await saveDraft(content)
    if (r.error) return setStatus('오류: ' + r.error)
    setStatus('초안 저장됨 ✓')
    setPreviewKey((k) => k + 1)
  }

  async function onPublish() {
    if (content.hero.images.length === 0) return setStatus('Hero 이미지를 최소 1장 등록하세요.')
    setStatus('발행 중...')
    const s = await saveDraft(content)
    if (s.error) return setStatus('오류: ' + s.error)
    const r = await publish()
    if (r.error) return setStatus('오류: ' + r.error)
    setStatus('발행 완료 ✓')
    setPreviewKey((k) => k + 1)
  }

  const s1 = content.section1
  const s2 = content.section2
  const s3 = content.section3

  return (
    <div className="flex gap-6">
      {/* 편집 폼 */}
      <div className="flex-1 space-y-6 max-w-2xl">
        {/* 액션 바 */}
        <div className="flex items-center gap-2 sticky top-0 py-2" style={{ backgroundColor: '#F2F1EE' }}>
          <button onClick={onSaveDraft} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}>초안 저장</button>
          <button onClick={() => { setShowPreview((v) => !v); setPreviewKey((k) => k + 1) }} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}>
            {showPreview ? '미리보기 숨기기' : '미리보기'}
          </button>
          <button onClick={onPublish} className="px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>발행</button>
          {status && <span className="text-xs" style={{ color: '#6B6862' }}>{status}</span>}
        </div>

        {/* Hero */}
        <div className={cardCls} style={cardStyle}>
          <h3 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>메인 (Hero 슬라이드)</h3>
          <HeroImagesField value={content.hero} onChange={(hero) => patch({ hero })} />
        </div>

        {/* Section1 - Featured */}
        <div className={cardCls} style={cardStyle}>
          <h3 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>섹션1 · 대표</h3>
          <SlotImageField label="대표 이미지" recommended="1200×900" src={s1.featured.imageSrc}
            onChange={(src) => patch({ section1: { ...s1, featured: { ...s1.featured, imageSrc: src } } })} />
          <input className={inputCls} placeholder="카테고리" value={s1.featured.category}
            onChange={(e) => patch({ section1: { ...s1, featured: { ...s1.featured, category: e.target.value } } })} />
          <input className={inputCls} placeholder="제목" value={s1.featured.title}
            onChange={(e) => patch({ section1: { ...s1, featured: { ...s1.featured, title: e.target.value } } })} />
          <textarea className={inputCls} placeholder="본문" value={s1.featured.body}
            onChange={(e) => patch({ section1: { ...s1, featured: { ...s1.featured, body: e.target.value } } })} />
          <input className={inputCls} placeholder="이미지 설명(alt)" value={s1.featured.imageAlt}
            onChange={(e) => patch({ section1: { ...s1, featured: { ...s1.featured, imageAlt: e.target.value } } })} />
        </div>

        {/* Section1 - Grid (4) */}
        <div className={cardCls} style={cardStyle}>
          <h3 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>섹션1 · 그리드 (4)</h3>
          {s1.grid.map((item, i) => (
            <div key={i} className="space-y-2 pb-3 border-b" style={{ borderColor: '#E8E5E0' }}>
              <SlotImageField label={`그리드 ${i + 1}`} recommended="600×600" src={item.imageSrc}
                onChange={(src) => patch({ section1: { ...s1, grid: s1.grid.map((g, j) => (j === i ? { ...g, imageSrc: src } : g)) } })} />
              <input className={inputCls} placeholder="제목" value={item.title}
                onChange={(e) => patch({ section1: { ...s1, grid: s1.grid.map((g, j) => (j === i ? { ...g, title: e.target.value } : g)) } })} />
              <input className={inputCls} placeholder="이미지 설명(alt)" value={item.imageAlt}
                onChange={(e) => patch({ section1: { ...s1, grid: s1.grid.map((g, j) => (j === i ? { ...g, imageAlt: e.target.value } : g)) } })} />
            </div>
          ))}
        </div>

        {/* Section2 - Cards (3) */}
        <div className={cardCls} style={cardStyle}>
          <h3 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>섹션2 · 카드 (3)</h3>
          {s2.items.map((item, i) => (
            <div key={i} className="space-y-2 pb-3 border-b" style={{ borderColor: '#E8E5E0' }}>
              <SlotImageField label={`카드 ${i + 1}`} recommended="800×1000" src={item.imageSrc}
                onChange={(src) => patch({ section2: { items: s2.items.map((g, j) => (j === i ? { ...g, imageSrc: src } : g)) } })} />
              <input className={inputCls} placeholder="카테고리" value={item.category}
                onChange={(e) => patch({ section2: { items: s2.items.map((g, j) => (j === i ? { ...g, category: e.target.value } : g)) } })} />
              <input className={inputCls} placeholder="제목" value={item.title}
                onChange={(e) => patch({ section2: { items: s2.items.map((g, j) => (j === i ? { ...g, title: e.target.value } : g)) } })} />
              <input className={inputCls} placeholder="이미지 설명(alt)" value={item.imageAlt}
                onChange={(e) => patch({ section2: { items: s2.items.map((g, j) => (j === i ? { ...g, imageAlt: e.target.value } : g)) } })} />
            </div>
          ))}
        </div>

        {/* Section3 - Banner */}
        <div className={cardCls} style={cardStyle}>
          <h3 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>섹션3 · 배너</h3>
          <SlotImageField label="배너 이미지" recommended="1920×800" src={s3.imageSrc}
            onChange={(src) => patch({ section3: { ...s3, imageSrc: src } })} />
          <input className={inputCls} placeholder="헤드라인" value={s3.headline}
            onChange={(e) => patch({ section3: { ...s3, headline: e.target.value } })} />
          <input className={inputCls} placeholder="서브텍스트" value={s3.sub}
            onChange={(e) => patch({ section3: { ...s3, sub: e.target.value } })} />
          <input className={inputCls} placeholder="이미지 설명(alt)" value={s3.imageAlt}
            onChange={(e) => patch({ section3: { ...s3, imageAlt: e.target.value } })} />
        </div>
      </div>

      {/* 미리보기 */}
      {showPreview && (
        <div className="w-[420px] shrink-0 sticky top-2 self-start">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: '#6B6862' }}>미리보기 (초안)</span>
            <a href="/?preview=1" target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: '#1C1C1C' }}>새 탭에서 열기</a>
          </div>
          <iframe
            key={previewKey}
            src={`/?preview=1&t=${previewKey}`}
            className="w-full rounded-lg"
            style={{ height: 620, border: '1px solid #E8E5E0', backgroundColor: 'white' }}
          />
          <p className="text-xs mt-2" style={{ color: '#A8A49C' }}>* 미리보기는 &apos;초안 저장&apos; 후 갱신됩니다.</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 에디터 페이지 (초안 로드)**

Create `apps/web/app/(admin)/admin/content/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { getDraftLandingContent } from '@/lib/landing-content'
import ContentEditor from './_components/ContentEditor'

export const metadata: Metadata = { title: '콘텐츠 관리 — Cosmos Admin' }
export const dynamic = 'force-dynamic'

export default async function AdminContentPage() {
  const content = await getDraftLandingContent()
  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>랜딩 콘텐츠 관리</h1>
      <ContentEditor initial={content} />
    </div>
  )
}
```

- [ ] **Step 6: 사이드바에 "콘텐츠 관리" 메뉴 추가**

In `apps/web/app/(admin)/_components/AdminSidebar.tsx`, add to `NAV_ITEMS`:

```tsx
const NAV_ITEMS = [
  { href: '/admin/customers', label: '고객관리' },
  { href: '/admin/content', label: '콘텐츠 관리' },
  { href: '/admin/clubs', label: '독서클럽' },
]
```

- [ ] **Step 7: 타입체크 + 린트**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint app lib
```
Expected: tsc 0 errors; eslint 0 errors.

- [ ] **Step 8: Commit**

```bash
git add "apps/web/app/(admin)/admin/content" "apps/web/app/(admin)/_components/AdminSidebar.tsx"
git commit -m "feat(admin): landing content editor + preview + sidebar menu"
```

---

## Task 6: 통합 검증 (수동 e2e)

**Files:** (없음 — 검증 전용. 발견된 버그는 해당 Task 파일 수정 후 재커밋)

- [ ] **Step 1: 마이그레이션 적용 확인**

Task 2의 SQL이 Supabase에 적용됐는지 확인(`site_content` 2행, `landing-images` 버킷 public). 미적용 시 먼저 적용.

- [ ] **Step 2: 앱 구동**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && pnpm dev
```
브라우저에서 `/` 접속 → 기존과 동일한 랜딩(시드 이미지)이 보이는지 확인(회귀 없음).

- [ ] **Step 3: 에디터 e2e**

관리자 계정으로 로그인 → `/admin/content`:
1. Hero에 이미지 1장 추가(총 2장) + 슬라이드 속도 3초로 변경
2. 섹션1 대표 제목 변경, 카드 이미지 1개 교체
3. **초안 저장** → 우측 미리보기(iframe)가 갱신되어 변경 반영 확인
4. `/`(새 탭, preview 없음)는 아직 **기존 발행본** 유지 확인
5. **발행** → `/` 새로고침 시 변경 반영 + Hero 2장 캐러셀이 3초 간격 슬라이드 확인

- [ ] **Step 4: 권한 확인**

로그아웃(비관리자) 상태로 `/?preview=1` 접속 → **발행본**만 보임(초안 유출 없음). `/admin/content`는 `/`로 리다이렉트.

- [ ] **Step 5: 최종 린트/타입/테스트**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd packages/shared && pnpm test
cd ../../apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint app lib
```
Expected: shared 테스트 PASS, tsc 0 errors, eslint 0 errors.

- [ ] **Step 6: Commit (수정분 있으면)**

```bash
git add -A && git commit -m "test(landing): verify content management e2e"
```

---

## Self-Review 결과

**Spec coverage:**
- R1(이미지+텍스트 편집) → Task 5 ContentEditor ✓
- R2(Hero 다중+속도) → Task 1 타입, Task 3 HeroCarousel, Task 5 HeroImagesField ✓
- R3(픽셀 고정+권장 안내) → Task 3 `object-cover`, Task 5 `recommended` 라벨 ✓
- R4(초안→발행) → Task 4 actions ✓
- R5(테스트 화면) → Task 3 `?preview=1` + Task 5 iframe ✓
- 데이터 모델/RLS/버킷/시드 → Task 2 ✓
- content.ts→DB 전환 → Task 1(타입 이전) + Task 3(fetch/렌더) ✓

**Placeholder scan:** 모든 스텝에 실제 코드/명령 포함, TBD 없음.

**Type consistency:** `LandingContent`/`HeroContent`/`withDefaults`/`getDraftLandingContent`/`getPublishedLandingContent`/`saveDraft`/`publish` 시그니처가 Task 간 일치.

**스펙 대비 개선점(의도적):** 미리보기를 별도 `/admin/content/preview` 라우트 대신 `/?preview=1`(admin 한정)로 구현 — 실제 랜딩 레이아웃을 그대로 재사용하고 어드민 사이드바 간섭 제거. 스펙 §7의 요구(초안 렌더 미리보기)는 동일하게 충족.
