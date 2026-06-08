# Goods & Tickets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/goods` 목록 + `/goods/[id]` 상세 페이지를 랜딩 스타일로 구현하고 Supabase DB 기반 상품 데이터 + 찜 기능을 추가한다.

**Architecture:** Supabase에 `categories` / `goods` / `goods_wishlist` 3개 테이블을 추가하고, Next.js 서버 컴포넌트에서 직접 조회한다. 찜 버튼만 클라이언트 컴포넌트로 분리하고, 나머지는 서버 컴포넌트로 구성한다. 랜딩 헤더/사이드바는 기존 `LandingClient`를 그대로 재사용한다.

**Tech Stack:** Next.js 16 (App Router), Supabase (SSR client), TypeScript, Tailwind CSS

---

## File Map

| 상태 | 경로 | 역할 |
|------|------|------|
| 수정 | `apps/web/app/landing/LandingSidebar.tsx` | Goods & Tickets href → /goods |
| 생성 | `apps/web/app/goods/page.tsx` | 목록 페이지 (서버 컴포넌트) |
| 생성 | `apps/web/app/goods/[id]/page.tsx` | 상세 페이지 (서버 컴포넌트) |
| 생성 | `apps/web/app/goods/_components/GoodsCard.tsx` | 상품 카드 (클라이언트) |
| 생성 | `apps/web/app/goods/_components/WishlistButton.tsx` | 찜 버튼 (클라이언트) |
| 생성 | `apps/web/app/goods/_components/CategoryFilter.tsx` | 카테고리 필터 링크 |

---

## Task 1: Supabase SQL 마이그레이션 실행

**Files:**
- 없음 (Supabase 대시보드에서 직접 실행)

- [ ] **Step 1: Supabase SQL 에디터에서 아래 SQL 실행**

```sql
-- categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

-- goods
create table if not exists goods (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  title text not null,
  description text,
  detail_content text,
  price integer not null,
  original_price integer,
  images text[] default '{}',
  status text not null default 'available' check (status in ('available', 'sold_out')),
  created_at timestamptz default now()
);

-- goods_wishlist
create table if not exists goods_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  goods_id uuid references goods(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, goods_id)
);

-- RLS 활성화
alter table categories enable row level security;
alter table goods enable row level security;
alter table goods_wishlist enable row level security;

-- categories: 전체 읽기
create policy "categories_read_all" on categories for select using (true);

-- goods: 전체 읽기
create policy "goods_read_all" on goods for select using (true);

-- goods_wishlist: 본인만
create policy "wishlist_select_own" on goods_wishlist for select using (auth.uid() = user_id);
create policy "wishlist_insert_own" on goods_wishlist for insert with check (auth.uid() = user_id);
create policy "wishlist_delete_own" on goods_wishlist for delete using (auth.uid() = user_id);

-- 시드 데이터: 카테고리
insert into categories (name, slug) values
  ('Goods', 'goods'),
  ('Tickets', 'tickets'),
  ('Books', 'books')
on conflict (slug) do nothing;

-- 시드 데이터: 상품 (category_id는 위에서 생성된 uuid를 사용)
insert into goods (category_id, title, description, detail_content, price, original_price, images, status)
select
  c.id,
  item.title,
  item.description,
  item.detail_content,
  item.price,
  item.original_price,
  item.images,
  item.status
from (values
  ('goods',   'COSMOS 에코백',         '100% 유기농 면 소재의 에코백입니다.',          '소재: 유기농 면 100%\n크기: 38 x 42 cm\n색상: 오프화이트\n\n독서를 사랑하는 사람들을 위한 에코백입니다. 코스모스 워드마크가 심플하게 새겨져 있습니다.', 28000, 35000, array['/monet_01_water_lilies_1906_ryerson_hq.png'], 'available'),
  ('goods',   'COSMOS 머그컵',          '하루를 여는 독서 시간을 위한 머그컵.',           '소재: 도자기\n용량: 350ml\n전자레인지 사용 가능\n\n매일 아침 책 한 페이지와 함께하는 머그컵입니다.', 22000, null, array['/monet_04_artist_garden_giverny_hq.png'], 'available'),
  ('tickets', '[B TALK] 독서의 계절',    '가을 독서 시즌을 여는 북토크 이벤트.',           '일시: 2026년 9월 20일 (토) 오후 3시\n장소: 코스모스 라운지, 서울 마포구\n정원: 30명\n\n올 가을 꼭 읽어야 할 책을 추천받고, 독자들과 함께 이야기 나누는 시간입니다.\n\n참가비에 음료와 소책자가 포함됩니다.', 30000, null, array['/monet_05_japanese_footbridge_hq.png'], 'available'),
  ('tickets', '[SOLD OUT] 여름 북클럽',  '여름 한정 독서 클럽 오프라인 모임.',             '일시: 2026년 7월 15일\n장소: 코스모스 라운지\n\n이미 마감된 이벤트입니다.', 25000, null, array['/monet_06_seine_at_vetheuil_hq.png'], 'sold_out'),
  ('books',   'COSMOS 에디션 — 이방인', '알베르 카뮈의 이방인 코스모스 특별판.',           '출판사: Cosmos Editions\n저자: 알베르 카뮈\n번역: 김화영\n페이지: 176p\n\n코스모스 특별 에디션은 원문에 충실한 번역과 함께 독자들을 위한 큐레이션 노트를 수록합니다.', 18000, null, array['/monet_03_water_lily_pond_weeping_willow_hq.png'], 'available')
) as item(slug, title, description, detail_content, price, original_price, images, status)
join categories c on c.slug = item.slug;
```

- [ ] **Step 2: SQL 실행 완료 확인**

Supabase 대시보드 → Table Editor에서 `categories`, `goods`, `goods_wishlist` 테이블이 생성되고 데이터가 들어갔는지 확인한다.

---

## Task 2: LandingSidebar 라우팅 수정

**Files:**
- Modify: `apps/web/app/landing/LandingSidebar.tsx:4`

- [ ] **Step 1: Goods & Tickets href 변경**

`apps/web/app/landing/LandingSidebar.tsx` 파일에서 아래를 찾아:

```ts
{ label: 'Goods & Tickets', href: '/coming-soon' },
```

아래로 교체:

```ts
{ label: 'Goods & Tickets', href: '/goods' },
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/app/landing/LandingSidebar.tsx
git commit -m "feat: route Goods & Tickets to /goods"
```

---

## Task 3: GoodsCard 컴포넌트

**Files:**
- Create: `apps/web/app/goods/_components/GoodsCard.tsx`

- [ ] **Step 1: 파일 생성**

`apps/web/app/goods/_components/GoodsCard.tsx`:

```tsx
import Link from 'next/link'
import Image from 'next/image'

export interface GoodsItem {
  id: string
  title: string
  description: string | null
  price: number
  original_price: number | null
  images: string[]
  status: 'available' | 'sold_out'
  categories: { name: string; slug: string } | null
}

interface Props {
  item: GoodsItem
}

export default function GoodsCard({ item }: Props) {
  const discount = item.original_price
    ? Math.round((1 - item.price / item.original_price) * 100)
    : null

  return (
    <Link href={`/goods/${item.id}`} className="group block">
      {/* 이미지 */}
      <div className="relative w-full aspect-[3/4] overflow-hidden mb-3" style={{ backgroundColor: '#E8E5E0' }}>
        {item.images[0] ? (
          <Image
            src={item.images[0]}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#A8A49C' }}>
            No Image
          </div>
        )}
        {item.status === 'sold_out' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(28,28,28,0.5)' }}>
            <span className="text-xs tracking-widest uppercase text-white border border-white px-3 py-1">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div>
        {item.categories && (
          <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#A8A49C' }}>
            {item.categories.name}
          </p>
        )}
        <p className="text-sm font-light mb-1.5 line-clamp-2" style={{ color: '#1C1C1C' }}>
          {item.title}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium" style={{ color: '#1C1C1C' }}>
            ₩{item.price.toLocaleString()}
          </span>
          {item.original_price && (
            <>
              <span className="text-xs line-through" style={{ color: '#A8A49C' }}>
                ₩{item.original_price.toLocaleString()}
              </span>
              <span className="text-xs" style={{ color: '#6B6862' }}>
                {discount}% OFF
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
```

---

## Task 4: WishlistButton 컴포넌트

**Files:**
- Create: `apps/web/app/goods/_components/WishlistButton.tsx`

- [ ] **Step 1: 파일 생성**

`apps/web/app/goods/_components/WishlistButton.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  goodsId: string
  initialWished?: boolean
}

export default function WishlistButton({ goodsId, initialWished = false }: Props) {
  const router = useRouter()
  const [wished, setWished] = useState(initialWished)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setWished(initialWished)
  }, [initialWished])

  async function toggle() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setLoading(true)
    if (wished) {
      await supabase
        .from('goods_wishlist')
        .delete()
        .eq('goods_id', goodsId)
        .eq('user_id', user.id)
      setWished(false)
    } else {
      await supabase
        .from('goods_wishlist')
        .insert({ goods_id: goodsId, user_id: user.id })
      setWished(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-2 text-sm tracking-wide transition-opacity hover:opacity-60 disabled:opacity-40"
      style={{ color: '#1C1C1C' }}
    >
      <span className="text-base">{wished ? '♥' : '♡'}</span>
      {wished ? '위시리스트에서 제거' : '위시리스트에 추가'}
    </button>
  )
}
```

---

## Task 5: CategoryFilter 컴포넌트

**Files:**
- Create: `apps/web/app/goods/_components/CategoryFilter.tsx`

- [ ] **Step 1: 파일 생성**

`apps/web/app/goods/_components/CategoryFilter.tsx`:

```tsx
import Link from 'next/link'

interface Category {
  id: string
  name: string
  slug: string
}

interface Props {
  categories: Category[]
  activeSlug: string | null
}

export default function CategoryFilter({ categories, activeSlug }: Props) {
  const items = [{ id: 'all', name: 'All', slug: '' }, ...categories]

  return (
    <div className="flex gap-6 mb-10">
      {items.map((cat) => {
        const isActive = cat.slug === '' ? !activeSlug : activeSlug === cat.slug
        return (
          <Link
            key={cat.id}
            href={cat.slug ? `/goods?category=${cat.slug}` : '/goods'}
            className="text-xs tracking-widest uppercase pb-0.5 transition-colors"
            style={{
              color: isActive ? '#1C1C1C' : '#A8A49C',
              borderBottom: isActive ? '1px solid #1C1C1C' : '1px solid transparent',
            }}
          >
            {cat.name}
          </Link>
        )
      })}
    </div>
  )
}
```

---

## Task 6: Goods 목록 페이지

**Files:**
- Create: `apps/web/app/goods/page.tsx`

- [ ] **Step 1: 파일 생성**

`apps/web/app/goods/page.tsx`:

```tsx
import type { Metadata } from 'next'
import LandingClient from '@/app/landing/LandingClient'
import { createClient } from '@/lib/supabase/server'
import GoodsCard from './_components/GoodsCard'
import CategoryFilter from './_components/CategoryFilter'

export const metadata: Metadata = { title: 'Goods & Tickets — Cosmos' }

interface Props {
  searchParams: Promise<{ category?: string }>
}

export default async function GoodsPage({ searchParams }: Props) {
  const { category } = await searchParams
  const supabase = await createClient()

  const { data: categories = [] } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  let query = supabase
    .from('goods')
    .select('id, title, description, price, original_price, images, status, categories(name, slug)')
    .order('created_at', { ascending: false })

  if (category) {
    const cat = categories.find((c) => c.slug === category)
    if (cat) query = query.eq('category_id', cat.id)
  }

  const { data: goods = [] } = await query

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />

      <main className="pt-20 px-6 md:px-12 pb-20">
        {/* 타이틀 */}
        <div className="py-12 border-b mb-10" style={{ borderColor: '#E8E5E0' }}>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#A8A49C' }}>Cosmos</p>
          <h1 className="text-3xl font-light tracking-widest" style={{ color: '#1C1C1C' }}>
            GOODS & TICKETS
          </h1>
        </div>

        {/* 카테고리 필터 */}
        <CategoryFilter categories={categories} activeSlug={category ?? null} />

        {/* 상품 그리드 */}
        {goods.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: '#A8A49C' }}>상품이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
            {goods.map((item) => (
              <GoodsCard key={item.id} item={item as any} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

---

## Task 7: Goods 상세 페이지

**Files:**
- Create: `apps/web/app/goods/[id]/page.tsx`

- [ ] **Step 1: 파일 생성**

`apps/web/app/goods/[id]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import LandingClient from '@/app/landing/LandingClient'
import { createClient } from '@/lib/supabase/server'
import WishlistButton from '../_components/WishlistButton'
import GoodsCard from '../_components/GoodsCard'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('goods').select('title').eq('id', id).single()
  return { title: data ? `${data.title} — Cosmos` : 'Goods — Cosmos' }
}

export default async function GoodsDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item } = await supabase
    .from('goods')
    .select('*, categories(id, name, slug)')
    .eq('id', id)
    .single()

  if (!item) notFound()

  // 로그인 유저의 찜 여부 확인
  const { data: { user } } = await supabase.auth.getUser()
  let isWished = false
  if (user) {
    const { data: wl } = await supabase
      .from('goods_wishlist')
      .select('id')
      .eq('goods_id', id)
      .eq('user_id', user.id)
      .single()
    isWished = !!wl
  }

  // 관련 상품 (같은 카테고리, 최대 4개, 현재 상품 제외)
  const { data: related = [] } = await supabase
    .from('goods')
    .select('id, title, description, price, original_price, images, status, categories(name, slug)')
    .eq('category_id', item.category_id)
    .neq('id', id)
    .limit(4)

  const discount = item.original_price
    ? Math.round((1 - item.price / item.original_price) * 100)
    : null

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />

      <main className="pt-14">
        {/* 뒤로가기 */}
        <div className="px-6 md:px-12 py-4">
          <Link
            href="/goods"
            className="text-xs tracking-widest uppercase hover:underline underline-offset-4"
            style={{ color: '#6B6862' }}
          >
            ← Goods & Tickets
          </Link>
        </div>

        {/* 메인 섹션: 이미지 + 정보 */}
        <div className="flex flex-col md:flex-row">
          {/* 좌: 이미지 */}
          <div className="w-full md:w-3/5 relative" style={{ minHeight: '60vh' }}>
            {item.images[0] ? (
              <Image
                src={item.images[0]}
                alt={item.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#E8E5E0' }}>
                <span className="text-xs" style={{ color: '#A8A49C' }}>No Image</span>
              </div>
            )}
          </div>

          {/* 우: 상품 정보 */}
          <div className="w-full md:w-2/5 px-6 md:px-12 py-10 flex flex-col gap-6">
            {item.categories && (
              <p className="text-xs tracking-widest uppercase" style={{ color: '#A8A49C' }}>
                {item.categories.name}
              </p>
            )}

            <h1 className="text-2xl font-light leading-snug" style={{ color: '#1C1C1C' }}>
              {item.title}
            </h1>

            <div className="h-px" style={{ backgroundColor: '#E8E5E0' }} />

            {/* 가격 */}
            <div className="flex items-baseline gap-3">
              <span className="text-xl font-medium" style={{ color: '#1C1C1C' }}>
                ₩{item.price.toLocaleString()}
              </span>
              {item.original_price && (
                <>
                  <span className="text-sm line-through" style={{ color: '#A8A49C' }}>
                    ₩{item.original_price.toLocaleString()}
                  </span>
                  <span className="text-sm" style={{ color: '#6B6862' }}>
                    {discount}% OFF
                  </span>
                </>
              )}
            </div>

            <div className="h-px" style={{ backgroundColor: '#E8E5E0' }} />

            {/* 상세 설명 */}
            {item.detail_content && (
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#6B6862' }}>
                {item.detail_content}
              </p>
            )}

            {/* 찜 버튼 */}
            {item.status === 'available' ? (
              <WishlistButton goodsId={item.id} initialWished={isWished} />
            ) : (
              <span className="text-sm tracking-widest uppercase" style={{ color: '#A8A49C' }}>
                Sold Out
              </span>
            )}
          </div>
        </div>

        {/* 관련 상품 */}
        {related.length > 0 && (
          <section className="px-6 md:px-12 py-16 border-t" style={{ borderColor: '#E8E5E0' }}>
            <h2 className="text-xs tracking-widest uppercase mb-8" style={{ color: '#A8A49C' }}>
              Related Items
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
              {related.map((rel) => (
                <GoodsCard key={rel.id} item={rel as any} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/app/goods/
git commit -m "feat: add goods & tickets listing and detail pages"
```

---

## Task 8: 전체 동작 확인 및 최종 커밋

- [ ] **Step 1: 개발 서버 실행**

```bash
cd apps/web && pnpm dev
# 또는
turbo dev --filter=web
```

- [ ] **Step 2: 확인 항목**

| 항목 | 확인 방법 |
|------|-----------|
| 사이드바 메뉴에서 Goods & Tickets 클릭 시 `/goods` 이동 | 사이드바 열고 클릭 |
| 상품 그리드 정상 렌더링 | `/goods` 접속 |
| 카테고리 필터 클릭 시 해당 카테고리만 표시 | All / Goods / Tickets / Books 클릭 |
| 상품 카드 클릭 시 `/goods/[id]` 이동 | 카드 클릭 |
| 상세 페이지 이미지 + 정보 + 찜 버튼 표시 | 상세 페이지 확인 |
| SOLD OUT 상품 오버레이 표시 | 여름 북클럽 상품 확인 |
| 비로그인 상태 찜 버튼 클릭 시 `/login` 이동 | 로그아웃 후 찜 클릭 |
| 로그인 상태 찜 토글 정상 동작 | 로그인 후 찜 클릭 |
| 관련 상품 섹션 표시 | 동일 카테고리 상품 있는 상세 페이지 |

- [ ] **Step 3: 최종 푸시**

```bash
git push origin main
```
