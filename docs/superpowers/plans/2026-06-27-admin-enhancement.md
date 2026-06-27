# Admin 고도화 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cosmos 어드민 페이지 고도화 — 스타일 정비, 방문자 지표 대시보드, 상품 등록 UX 개선(할인율·이미지 업로드·노출 시간), 상품 대시보드, 이미지 슬라이드쇼

**Architecture:** Next.js 15 App Router 서버 컴포넌트 패턴 유지. 이미지는 Supabase Storage에 업로드. 방문자 추적은 `page_views` 테이블에 클라이언트 컴포넌트로 기록. DB 스키마 변경은 단일 마이그레이션 파일(`003_goods_enhancement.sql`)로 관리.

**Tech Stack:** Next.js 15, Supabase (Storage + DB), TypeScript, Tailwind CSS (inline style 위주)

## Global Constraints

- 모든 텍스트 색상은 `#1C1C1C` (검정). `#A8A49C`, `#6B6862` 는 텍스트에 사용하지 않음
- 모든 input/textarea/select 필드 텍스트: `color: '#1C1C1C'`
- placeholder 텍스트는 회색 유지 (CSS placeholder pseudo-element)
- 배경/보더/장식용 색상은 기존 팔레트(`#E8E5E0`, `#EDEBE7`, `#F2F1EE`) 유지
- 외부 차트 라이브러리 설치 금지 — 순수 CSS div로 구현
- 외부 이미지 업로드 서비스 금지 — Supabase Storage만 사용
- 타입스크립트 에러 없이 빌드 통과

---

## 파일 맵

### 신규 생성
- `supabase/migrations/003_goods_enhancement.sql` — DB 스키마 변경 + page_views 테이블 + Storage 버킷
- `apps/web/app/components/TrackPageView.tsx` — 클라이언트 페이지뷰 트래킹 컴포넌트
- `apps/web/app/(admin)/admin/goods/[id]/page.tsx` — 상품별 어드민 대시보드
- `apps/web/app/(admin)/admin/clubs/page.tsx` — 독서클럽 플레이스홀더
- `apps/web/app/goods/_components/GoodsImageSlider.tsx` — 고객 상품 상세 이미지 슬라이드쇼

### 수정
- `apps/web/app/(admin)/_components/AdminSidebar.tsx` — 색상 + 독서클럽 메뉴 추가
- `apps/web/app/(admin)/admin/page.tsx` — 대시보드 지표 + 시간대별 차트
- `apps/web/app/(admin)/admin/goods/page.tsx` — 색상 + 상품명 클릭 시 대시보드 이동
- `apps/web/app/(admin)/admin/goods/_components/GoodsForm.tsx` — 할인율, 이미지 업로드, 노출 시간
- `apps/web/app/(admin)/admin/orders/page.tsx` — 색상
- `apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx` — 색상
- `apps/web/app/(admin)/admin/customers/page.tsx` — 색상
- `apps/web/app/(admin)/admin/customers/[id]/page.tsx` — 색상
- `apps/web/app/goods/page.tsx` — original_price → discount_rate, published_at 필터
- `apps/web/app/goods/[id]/page.tsx` — original_price → discount_rate, 슬라이드쇼
- `apps/web/app/goods/_components/GoodsCard.tsx` — original_price → discount_rate
- `apps/web/app/layout.tsx` — TrackPageView 추가

---

## Task 1: DB 마이그레이션

**Files:**
- Create: `supabase/migrations/003_goods_enhancement.sql`

**Interfaces:**
- Produces:
  - `goods.discount_rate` INTEGER 0-100 (기본값 0)
  - `goods.published_at` TIMESTAMPTZ nullable (null = 즉시 노출)
  - `goods.original_price` 컬럼 제거
  - `page_views(id, path, user_id, created_at)` 테이블
  - Supabase Storage `goods-images` 버킷 (public)

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
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
```

- [ ] **Step 2: Supabase 대시보드에서 SQL 실행**

Supabase 대시보드 → SQL Editor → 위 SQL 붙여넣기 → Run

확인: `goods` 테이블에 `discount_rate`, `published_at` 컬럼 존재, `original_price` 없음
확인: `page_views` 테이블 생성됨
확인: Storage에 `goods-images` 버킷 생성됨

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/003_goods_enhancement.sql
git commit -m "feat: add discount_rate, published_at to goods; add page_views table and goods-images storage"
```

---

## Task 2: 전역 스타일 수정 — 어드민 페이지

**Files:**
- Modify: `apps/web/app/(admin)/_components/AdminSidebar.tsx`
- Modify: `apps/web/app/(admin)/admin/orders/page.tsx`
- Modify: `apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx`
- Modify: `apps/web/app/(admin)/admin/customers/page.tsx`
- Modify: `apps/web/app/(admin)/admin/customers/[id]/page.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: 모든 어드민 텍스트가 `#1C1C1C`으로 통일된 파일들 (대시보드·상품 페이지는 이후 Task에서 수정)

- [ ] **Step 1: AdminSidebar.tsx — 색상 수정**

`apps/web/app/(admin)/_components/AdminSidebar.tsx` 를 아래로 교체:

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/goods', label: '상품 관리' },
  { href: '/admin/orders', label: '주문 관리' },
  { href: '/admin/customers', label: '고객 관리' },
  { href: '/admin/clubs', label: '독서클럽' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside
      className="w-52 shrink-0 border-r flex flex-col pt-8 px-4 min-h-screen"
      style={{ borderColor: '#E8E5E0', backgroundColor: '#EDEBE7' }}
    >
      <span
        className="text-xs tracking-widest uppercase mb-8 block"
        style={{ color: '#1C1C1C' }}
      >
        Cosmos Admin
      </span>
      <nav className="space-y-1">
        {NAV.map(({ href, label }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="block px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: active ? '#1C1C1C' : 'transparent',
                color: active ? 'white' : '#1C1C1C',
              }}
            >
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: orders/page.tsx — 색상 수정**

`apps/web/app/(admin)/admin/orders/page.tsx`:
- `style={{ color: '#A8A49C' }}` → `style={{ color: '#1C1C1C' }}` (thead tr)
- `style={{ color: '#6B6862' }}` → `style={{ color: '#1C1C1C' }}` (모든 td)
- `style={{ color: order.status === 'paid' ? '#1C1C1C' : '#A8A49C' }}` → `style={{ color: '#1C1C1C' }}`

전체 파일:
```tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import OrderStatusSelect from './_components/OrderStatusSelect'

export const metadata: Metadata = { title: '주문 관리 — Cosmos Admin' }

export default async function AdminOrdersPage() {
  const supabase = await createClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total_amount, created_at, profiles(display_name), order_items(title, quantity)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>주문 관리</h1>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#1C1C1C' }}>
            <th className="pb-2 font-normal">주문번호</th>
            <th className="pb-2 font-normal">회원</th>
            <th className="pb-2 font-normal">상품</th>
            <th className="pb-2 font-normal">금액</th>
            <th className="pb-2 font-normal">상태</th>
            <th className="pb-2 font-normal">일시</th>
          </tr>
        </thead>
        <tbody>
          {(orders ?? []).map((order) => {
            const items = (order.order_items as { title: string; quantity: number }[]) ?? []
            const itemLabel = items.map((i) => `${i.title} x${i.quantity}`).join(', ')
            return (
              <tr key={order.id} style={{ borderTop: '1px solid #E8E5E0' }}>
                <td className="py-3" style={{ color: '#1C1C1C' }}>{order.id.slice(0, 8).toUpperCase()}</td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {(order.profiles as any)?.display_name ?? '-'}
                </td>
                <td className="py-3 max-w-xs truncate" style={{ color: '#1C1C1C' }}>{itemLabel || '-'}</td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>{(order.total_amount ?? 0).toLocaleString()}원</td>
                <td className="py-3">
                  <OrderStatusSelect id={order.id} status={order.status} />
                </td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {new Date(order.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            )
          })}
          {(orders ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-sm" style={{ color: '#1C1C1C' }}>주문이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: customers/page.tsx — 색상 수정**

`apps/web/app/(admin)/admin/customers/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

export const metadata: Metadata = { title: '고객 관리 — Cosmos Admin' }

export default async function AdminCustomersPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [
    { data: profiles },
    { data: { users } },
    { data: orderRows },
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name, created_at').order('created_at', { ascending: false }),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('orders').select('user_id'),
  ])

  const emailMap = (users ?? []).reduce<Record<string, string>>((acc, u) => {
    acc[u.id] = u.email ?? ''
    return acc
  }, {})

  const countByUser = (orderRows ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.user_id] = (acc[o.user_id] ?? 0) + 1
    return acc
  }, {})

  const customers = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap[p.id] ?? '',
    orderCount: countByUser[p.id] ?? 0,
  }))

  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>고객 관리</h1>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#1C1C1C' }}>
            <th className="pb-2 font-normal">이름</th>
            <th className="pb-2 font-normal">이메일</th>
            <th className="pb-2 font-normal">가입일</th>
            <th className="pb-2 font-normal">주문 수</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} style={{ borderTop: '1px solid #E8E5E0' }}>
              <td className="py-3">
                <Link href={`/admin/customers/${c.id}`} className="hover:underline" style={{ color: '#1C1C1C' }}>
                  {c.display_name}
                </Link>
              </td>
              <td className="py-3" style={{ color: '#1C1C1C' }}>{c.email}</td>
              <td className="py-3" style={{ color: '#1C1C1C' }}>
                {new Date(c.created_at).toLocaleDateString('ko-KR')}
              </td>
              <td className="py-3" style={{ color: '#1C1C1C' }}>{c.orderCount}건</td>
            </tr>
          ))}
          {customers.length === 0 && (
            <tr>
              <td colSpan={4} className="py-12 text-center text-sm" style={{ color: '#1C1C1C' }}>회원이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: customers/[id]/page.tsx — 색상 수정**

`apps/web/app/(admin)/admin/customers/[id]/page.tsx`:
- 모든 `style={{ color: '#A8A49C' }}` → `style={{ color: '#1C1C1C' }}`
- 모든 `style={{ color: '#6B6862' }}` → `style={{ color: '#1C1C1C' }}`
- `style={{ color: order.status === 'paid' ? '#1C1C1C' : '#A8A49C' }}` → `style={{ color: '#1C1C1C' }}`

전체 파일:
```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

export const metadata: Metadata = { title: '고객 상세 — Cosmos Admin' }

interface Props { params: Promise<{ id: string }> }

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [
    { data: profile },
    { data: { user: authUser } },
    { data: orders },
    { data: wishlist },
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name, username, created_at').eq('id', id).single(),
    adminClient.auth.admin.getUserById(id),
    supabase
      .from('orders')
      .select('id, status, total_amount, created_at, order_items(title, quantity)')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('goods_wishlist')
      .select('goods:goods(id, title, price)')
      .eq('user_id', id),
  ])

  if (!profile) notFound()

  const wishlistGoods = (wishlist ?? [])
    .map((r) => (Array.isArray(r.goods) ? r.goods[0] : (r.goods as any)))
    .filter(Boolean)

  return (
    <div>
      <Link href="/admin/customers" className="text-xs mb-6 inline-block hover:opacity-70" style={{ color: '#1C1C1C' }}>
        ← 고객 목록
      </Link>

      <h1 className="text-2xl font-light mb-1" style={{ color: '#1C1C1C' }}>{profile.display_name}</h1>
      <p className="text-sm mb-8" style={{ color: '#1C1C1C' }}>
        {authUser?.email ?? ''} · 가입일 {new Date(profile.created_at).toLocaleDateString('ko-KR')}
      </p>

      <section className="mb-10">
        <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>
          주문 내역 ({orders?.length ?? 0}건)
        </h2>
        {(orders ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: '#1C1C1C' }}>주문 내역이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: '#1C1C1C' }}>
                <th className="pb-2 font-normal">주문번호</th>
                <th className="pb-2 font-normal">상품</th>
                <th className="pb-2 font-normal">금액</th>
                <th className="pb-2 font-normal">상태</th>
                <th className="pb-2 font-normal">일시</th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((order) => {
                const items = (order.order_items as { title: string; quantity: number }[]) ?? []
                return (
                  <tr key={order.id} style={{ borderTop: '1px solid #E8E5E0' }}>
                    <td className="py-2" style={{ color: '#1C1C1C' }}>{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="py-2 max-w-xs truncate" style={{ color: '#1C1C1C' }}>
                      {items.map((i) => `${i.title} x${i.quantity}`).join(', ') || '-'}
                    </td>
                    <td className="py-2" style={{ color: '#1C1C1C' }}>{(order.total_amount ?? 0).toLocaleString()}원</td>
                    <td className="py-2" style={{ color: '#1C1C1C' }}>
                      {{ paid: '결제 완료', cancelled: '취소됨' }[order.status as string] ?? order.status}
                    </td>
                    <td className="py-2" style={{ color: '#1C1C1C' }}>
                      {new Date(order.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>
          위시리스트 ({wishlistGoods.length}개)
        </h2>
        {wishlistGoods.length === 0 ? (
          <p className="text-sm" style={{ color: '#1C1C1C' }}>위시리스트가 비어있습니다.</p>
        ) : (
          <div className="space-y-2">
            {wishlistGoods.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl p-3"
                style={{ backgroundColor: '#E8E5E0' }}
              >
                <span className="text-sm" style={{ color: '#1C1C1C' }}>{item.title}</span>
                <span className="text-sm" style={{ color: '#1C1C1C' }}>{(item.price ?? 0).toLocaleString()}원</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 5: 커밋**

```bash
git add apps/web/app/(admin)/_components/AdminSidebar.tsx \
        apps/web/app/(admin)/admin/orders/page.tsx \
        apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx \
        apps/web/app/(admin)/admin/customers/page.tsx \
        apps/web/app/(admin)/admin/customers/[id]/page.tsx
git commit -m "style: unify admin text color to #1C1C1C, add clubs sidebar entry"
```

---

## Task 3: 이미지 슬라이더 컴포넌트

**Files:**
- Create: `apps/web/app/goods/_components/GoodsImageSlider.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `<GoodsImageSlider images={string[]} title={string} />` — Task 4에서 import

- [ ] **Step 1: GoodsImageSlider.tsx 생성**

```tsx
'use client'
import { useState } from 'react'
import Image from 'next/image'

interface Props {
  images: string[]
  title: string
}

export default function GoodsImageSlider({ images, title }: Props) {
  const [current, setCurrent] = useState(0)

  if (images.length === 0) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: '#E8E5E0', minHeight: '60vh' }}
      >
        <span className="text-xs" style={{ color: '#1C1C1C' }}>No Image</span>
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <div className="relative w-full" style={{ minHeight: '60vh' }}>
        <Image src={images[0]} alt={title} fill className="object-cover" priority />
      </div>
    )
  }

  return (
    <div className="relative w-full select-none" style={{ minHeight: '60vh' }}>
      <div className="relative w-full h-full" style={{ minHeight: '60vh' }}>
        <Image
          src={images[current]}
          alt={`${title} ${current + 1}`}
          fill
          className="object-cover"
          priority={current === 0}
        />
      </div>

      {/* 좌 화살표 */}
      <button
        onClick={() => setCurrent((p) => (p - 1 + images.length) % images.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
        aria-label="이전 이미지"
      >
        <span style={{ color: '#1C1C1C', fontSize: 16 }}>‹</span>
      </button>

      {/* 우 화살표 */}
      <button
        onClick={() => setCurrent((p) => (p + 1) % images.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
        aria-label="다음 이미지"
      >
        <span style={{ color: '#1C1C1C', fontSize: 16 }}>›</span>
      </button>

      {/* 하단 dot indicator */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="w-1.5 h-1.5 rounded-full transition-colors"
            style={{ backgroundColor: i === current ? '#1C1C1C' : 'rgba(28,28,28,0.3)' }}
            aria-label={`이미지 ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/app/goods/_components/GoodsImageSlider.tsx
git commit -m "feat: add GoodsImageSlider with dot indicator for goods detail page"
```

---

## Task 4: 고객 상품 페이지 — discount_rate 적용 + 노출 필터

**Files:**
- Modify: `apps/web/app/goods/_components/GoodsCard.tsx`
- Modify: `apps/web/app/goods/page.tsx`
- Modify: `apps/web/app/goods/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `goods.discount_rate`, `goods.published_at`, Task 3의 `GoodsImageSlider`
- Produces:
  - `GoodsItem.discount_rate: number` (original_price 제거)
  - goods 목록/상세: `published_at IS NULL OR published_at <= now()` 필터 적용
  - 할인 표시: `price * (1 - discount_rate/100)` 최종가, `discount_rate > 0` 이면 퍼센트 표시

- [ ] **Step 1: GoodsCard.tsx — discount_rate로 변경**

```tsx
import Link from 'next/link'
import Image from 'next/image'

export interface GoodsItem {
  id: string
  title: string
  description: string | null
  price: number
  discount_rate: number
  images: string[]
  status: 'active' | 'sold_out' | 'draft'
  categories: { name: string; slug: string } | null
}

interface Props {
  item: GoodsItem
}

export default function GoodsCard({ item }: Props) {
  const finalPrice = Math.round(item.price * (1 - item.discount_rate / 100))

  return (
    <Link href={`/goods/${item.id}`} className="group block">
      <div className="relative w-full aspect-[3/4] overflow-hidden mb-3" style={{ backgroundColor: '#E8E5E0' }}>
        {item.images[0] ? (
          <Image
            src={item.images[0]}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#1C1C1C' }}>
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

      <div>
        {item.categories && (
          <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#1C1C1C' }}>
            {item.categories.name}
          </p>
        )}
        <p className="text-sm font-light mb-1.5 line-clamp-2" style={{ color: '#1C1C1C' }}>
          {item.title}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium" style={{ color: '#1C1C1C' }}>
            ₩{finalPrice.toLocaleString()}
          </span>
          {item.discount_rate > 0 && (
            <>
              <span className="text-xs line-through" style={{ color: '#1C1C1C', opacity: 0.4 }}>
                ₩{item.price.toLocaleString()}
              </span>
              <span className="text-xs" style={{ color: '#1C1C1C' }}>
                {item.discount_rate}% OFF
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: goods/page.tsx — discount_rate 선택 + published_at 필터**

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

  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')
  const categories = categoriesData ?? []

  const now = new Date().toISOString()

  let query = supabase
    .from('goods')
    .select('id, title, description, price, discount_rate, images, status, categories(name, slug)')
    .or(`published_at.is.null,published_at.lte.${now}`)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })

  if (category) {
    const cat = categories.find((c) => c.slug === category)
    if (cat) query = query.eq('category_id', cat.id)
  }

  const { data: goodsData } = await query
  const goods = goodsData ?? []

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />

      <main className="pt-20 px-6 md:px-12 pb-20">
        <div className="py-12 border-b mb-10" style={{ borderColor: '#E8E5E0' }}>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#1C1C1C' }}>Cosmos</p>
          <h1 className="text-3xl font-light tracking-widest" style={{ color: '#1C1C1C' }}>
            GOODS & TICKETS
          </h1>
        </div>

        <CategoryFilter categories={categories} activeSlug={category ?? null} />

        {goods.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: '#1C1C1C' }}>상품이 없습니다.</p>
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

- [ ] **Step 3: goods/[id]/page.tsx — discount_rate + published_at 필터**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import LandingClient from '@/app/landing/LandingClient'
import { createClient } from '@/lib/supabase/server'
import AddToCartButton from '../_components/AddToCartButton'
import WishlistButton from '../_components/WishlistButton'
import GoodsCard from '../_components/GoodsCard'
import GoodsImageSlider from '../_components/GoodsImageSlider'

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
  const now = new Date().toISOString()

  const { data: item } = await supabase
    .from('goods')
    .select('*, categories(id, name, slug)')
    .eq('id', id)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .neq('status', 'draft')
    .single()

  if (!item) notFound()

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

  const { data: relatedData } = await supabase
    .from('goods')
    .select('id, title, description, price, discount_rate, images, status, categories(name, slug)')
    .eq('category_id', item.category_id)
    .neq('id', id)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .neq('status', 'draft')
    .limit(4)
  const related = relatedData ?? []

  const finalPrice = Math.round(item.price * (1 - (item.discount_rate ?? 0) / 100))
  const images: string[] = item.images ?? []

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />

      <main className="pt-14">
        <div className="px-6 md:px-12 py-4">
          <Link
            href="/goods"
            className="text-xs tracking-widest uppercase hover:underline underline-offset-4"
            style={{ color: '#1C1C1C' }}
          >
            ← Goods & Tickets
          </Link>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* 좌: 이미지 슬라이더 */}
          <div className="w-full md:w-3/5 relative" style={{ minHeight: '60vh' }}>
            <GoodsImageSlider images={images} title={item.title} />
          </div>

          {/* 우: 상품 정보 */}
          <div className="w-full md:w-2/5 px-6 md:px-12 py-10 flex flex-col gap-6">
            {item.categories && (
              <p className="text-xs tracking-widest uppercase" style={{ color: '#1C1C1C' }}>
                {item.categories.name}
              </p>
            )}

            <h1 className="text-2xl font-light leading-snug" style={{ color: '#1C1C1C' }}>
              {item.title}
            </h1>

            <div className="h-px" style={{ backgroundColor: '#E8E5E0' }} />

            <div className="flex items-baseline gap-3">
              <span className="text-xl font-medium" style={{ color: '#1C1C1C' }}>
                ₩{finalPrice.toLocaleString()}
              </span>
              {(item.discount_rate ?? 0) > 0 && (
                <>
                  <span className="text-sm line-through" style={{ color: '#1C1C1C', opacity: 0.4 }}>
                    ₩{item.price.toLocaleString()}
                  </span>
                  <span className="text-sm" style={{ color: '#1C1C1C' }}>
                    {item.discount_rate}% OFF
                  </span>
                </>
              )}
            </div>

            <div className="h-px" style={{ backgroundColor: '#E8E5E0' }} />

            {item.detail_content && (
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#1C1C1C' }}>
                {item.detail_content}
              </p>
            )}

            {item.status === 'active' ? (
              <div className="flex flex-col gap-3">
                <AddToCartButton
                  goodsId={item.id}
                  title={item.title}
                  price={finalPrice}
                  imageUrl={images[0] ?? null}
                />
                <WishlistButton goodsId={item.id} initialWished={isWished} />
              </div>
            ) : (
              <span className="text-sm tracking-widest uppercase" style={{ color: '#1C1C1C' }}>
                Sold Out
              </span>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="px-6 md:px-12 py-16 border-t" style={{ borderColor: '#E8E5E0' }}>
            <h2 className="text-xs tracking-widest uppercase mb-8" style={{ color: '#1C1C1C' }}>
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

- [ ] **Step 4: 커밋**

```bash
git add apps/web/app/goods/_components/GoodsCard.tsx \
        apps/web/app/goods/page.tsx \
        apps/web/app/goods/[id]/page.tsx
git commit -m "feat: switch goods to discount_rate, apply published_at exposure filter, add image slideshow"
```

---

## Task 5: GoodsForm — 할인율 + 노출 시간 + 이미지 업로드

**Files:**
- Modify: `apps/web/app/(admin)/admin/goods/_components/GoodsForm.tsx`
- Modify: `apps/web/app/(admin)/admin/goods/page.tsx`
- Modify: `apps/web/app/(admin)/admin/goods/new/page.tsx`
- Modify: `apps/web/app/(admin)/admin/goods/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `goods.discount_rate`, `goods.published_at`, Supabase Storage `goods-images` 버킷
- Produces: 수정된 GoodsForm — `original_price` 제거, `discount_rate` + `published_at` 추가, 파일 업로드 방식 이미지

- [ ] **Step 1: goods/page.tsx — 상품명 클릭 시 대시보드 이동 + 색상**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DeleteGoodsButton from './_components/DeleteGoodsButton'

export const metadata: Metadata = { title: '상품 관리 — Cosmos Admin' }

const STATUS_LABEL: Record<string, string> = {
  active: '판매중',
  sold_out: '품절',
  draft: '임시저장',
}

export default async function AdminGoodsPage() {
  const supabase = await createClient()
  const { data: goods } = await supabase
    .from('goods')
    .select('id, title, price, discount_rate, status, images, categories(name)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light" style={{ color: '#1C1C1C' }}>상품 관리</h1>
        <Link
          href="/admin/goods/new"
          className="px-4 py-2 rounded-xl text-sm text-white"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          + 상품 등록
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#1C1C1C' }}>
            <th className="pb-2 font-normal w-12">이미지</th>
            <th className="pb-2 font-normal">상품명</th>
            <th className="pb-2 font-normal">가격</th>
            <th className="pb-2 font-normal">할인</th>
            <th className="pb-2 font-normal">카테고리</th>
            <th className="pb-2 font-normal">상태</th>
            <th className="pb-2 font-normal w-20"></th>
          </tr>
        </thead>
        <tbody>
          {(goods ?? []).map((item) => {
            const finalPrice = Math.round(item.price * (1 - (item.discount_rate ?? 0) / 100))
            return (
              <tr key={item.id} style={{ borderTop: '1px solid #E8E5E0' }}>
                <td className="py-3">
                  {(item.images as string[])?.[0] ? (
                    <img
                      src={(item.images as string[])[0]}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: '#E8E5E0' }} />
                  )}
                </td>
                <td className="py-3">
                  <Link href={`/admin/goods/${item.id}`} className="hover:underline" style={{ color: '#1C1C1C' }}>
                    {item.title}
                  </Link>
                </td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {finalPrice.toLocaleString()}원
                  {(item.discount_rate ?? 0) > 0 && (
                    <span className="ml-1 text-xs" style={{ color: '#1C1C1C', opacity: 0.5 }}>
                      ({item.price.toLocaleString()}원)
                    </span>
                  )}
                </td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {(item.discount_rate ?? 0) > 0 ? `${item.discount_rate}%` : '-'}
                </td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {(item.categories as any)?.name ?? '-'}
                </td>
                <td className="py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: item.status === 'active' ? '#E8E5E0' : '#F2F1EE',
                      color: '#1C1C1C',
                    }}
                  >
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex gap-3">
                    <Link href={`/admin/goods/${item.id}/edit`} className="text-xs hover:opacity-70" style={{ color: '#1C1C1C' }}>
                      수정
                    </Link>
                    <DeleteGoodsButton id={item.id} />
                  </div>
                </td>
              </tr>
            )
          })}
          {(goods ?? []).length === 0 && (
            <tr>
              <td colSpan={7} className="py-12 text-center text-sm" style={{ color: '#1C1C1C' }}>
                등록된 상품이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: GoodsForm.tsx 전체 교체**

```tsx
'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface Category { id: string; name: string }

interface GoodsFormProps {
  categories: Category[]
  initial?: {
    id: string
    title: string
    description: string | null
    price: number
    discount_rate: number
    images: string[]
    status: 'active' | 'sold_out' | 'draft'
    category_id: string | null
    published_at: string | null
  }
}

export default function GoodsForm({ categories, initial }: GoodsFormProps) {
  const router = useRouter()
  const isEdit = !!initial?.id
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    price: initial?.price?.toString() ?? '',
    discount_rate: initial?.discount_rate?.toString() ?? '0',
    status: initial?.status ?? ('draft' as 'active' | 'sold_out' | 'draft'),
    category_id: initial?.category_id ?? '',
    published_at: initial?.published_at
      ? new Date(initial.published_at).toISOString().slice(0, 16)
      : '',
  })
  const [images, setImages] = useState<string[]>(initial?.images ?? [])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const price = Number(form.price) || 0
  const discountRate = Math.min(100, Math.max(0, Number(form.discount_rate) || 0))
  const finalPrice = Math.round(price * (1 - discountRate / 100))

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    setError('')
    const supabase = createClient()
    const uploaded: string[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('goods-images')
        .upload(path, file, { contentType: file.type })
      if (upErr) { setError(upErr.message); setUploading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('goods-images').getPublicUrl(path)
      uploaded.push(publicUrl)
    }

    setImages((prev) => [...prev, ...uploaded].slice(0, 10))
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function removeImage(url: string) {
    const supabase = createClient()
    const path = url.split('/goods-images/')[1]
    if (path) await supabase.storage.from('goods-images').remove([path])
    setImages((prev) => prev.filter((u) => u !== url))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const payload = {
      title: form.title,
      description: form.description || null,
      price: Number(form.price),
      discount_rate: discountRate,
      images,
      status: form.status,
      category_id: form.category_id || null,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
    }

    const { error: err } = isEdit
      ? await supabase.from('goods').update(payload).eq('id', initial!.id)
      : await supabase.from('goods').insert(payload)

    setLoading(false)
    if (err) { setError(err.message); return }
    router.push('/admin/goods')
    router.refresh()
  }

  const field = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 bg-white"
  const lbl = "block text-xs mb-1.5 font-medium"

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <label className={lbl} style={{ color: '#1C1C1C' }}>상품명 *</label>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className={field}
          style={{ color: '#1C1C1C' }}
          required
        />
      </div>

      <div>
        <label className={lbl} style={{ color: '#1C1C1C' }}>설명</label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className={field}
          style={{ color: '#1C1C1C' }}
          rows={3}
        />
      </div>

      {/* 가격 + 할인율 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl} style={{ color: '#1C1C1C' }}>정가 (원) *</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            className={field}
            style={{ color: '#1C1C1C' }}
            required
            min={0}
          />
        </div>
        <div>
          <label className={lbl} style={{ color: '#1C1C1C' }}>할인율 (%)</label>
          <input
            type="number"
            value={form.discount_rate}
            onChange={(e) => set('discount_rate', e.target.value)}
            className={field}
            style={{ color: '#1C1C1C' }}
            min={0}
            max={100}
          />
        </div>
      </div>
      {price > 0 && (
        <div className="text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: '#E8E5E0', color: '#1C1C1C' }}>
          고객 노출 최종가: <strong>₩{finalPrice.toLocaleString()}</strong>
          {discountRate > 0 && <span className="ml-2 text-xs">({discountRate}% 할인)</span>}
        </div>
      )}

      <div>
        <label className={lbl} style={{ color: '#1C1C1C' }}>카테고리</label>
        <select
          value={form.category_id}
          onChange={(e) => set('category_id', e.target.value)}
          className={field}
          style={{ color: '#1C1C1C' }}
        >
          <option value="">카테고리 없음</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* 이미지 업로드 */}
      <div>
        <label className={lbl} style={{ color: '#1C1C1C' }}>이미지 (최대 10장)</label>

        {/* 미리보기 썸네일 */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {images.map((url, i) => (
              <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden" style={{ backgroundColor: '#E8E5E0' }}>
                <Image src={url} alt={`이미지 ${i + 1}`} fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: 'rgba(28,28,28,0.7)' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className="flex items-center justify-center w-full py-4 border-2 border-dashed rounded-xl cursor-pointer text-sm transition-colors hover:border-gray-400"
          style={{
            borderColor: '#E8E5E0',
            color: '#1C1C1C',
            opacity: uploading || images.length >= 10 ? 0.5 : 1,
            pointerEvents: uploading || images.length >= 10 ? 'none' : 'auto',
          }}
        >
          {uploading ? '업로드 중...' : images.length >= 10 ? '최대 10장' : '+ 이미지 추가'}
        </label>
      </div>

      <div>
        <label className={lbl} style={{ color: '#1C1C1C' }}>노출 시작 시간 (비워두면 즉시 노출)</label>
        <input
          type="datetime-local"
          value={form.published_at}
          onChange={(e) => set('published_at', e.target.value)}
          className={field}
          style={{ color: '#1C1C1C' }}
        />
      </div>

      <div>
        <label className={lbl} style={{ color: '#1C1C1C' }}>상태</label>
        <select
          value={form.status}
          onChange={(e) => set('status', e.target.value as any)}
          className={field}
          style={{ color: '#1C1C1C' }}
        >
          <option value="draft">임시저장</option>
          <option value="active">판매중</option>
          <option value="sold_out">품절</option>
        </select>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/admin/goods')}
          className="flex-1 py-3 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
          style={{ color: '#1C1C1C' }}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading || uploading}
          className="flex-1 py-3 rounded-xl text-sm text-white disabled:opacity-50"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          {loading ? '저장 중...' : isEdit ? '수정 완료' : '등록하기'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: new/page.tsx 확인 — initial prop 없으므로 변경 불필요**

`apps/web/app/(admin)/admin/goods/new/page.tsx`를 열어 `GoodsForm`에 `initial` prop이 전달되지 않는 것을 확인. 변경 없음.

- [ ] **Step 4: [id]/edit/page.tsx — discount_rate, published_at 추가**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GoodsForm from '../../_components/GoodsForm'

export const metadata: Metadata = { title: '상품 수정 — Cosmos Admin' }

interface Props { params: Promise<{ id: string }> }

export default async function EditGoodsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: item }, { data: categories }] = await Promise.all([
    supabase
      .from('goods')
      .select('id, title, description, price, discount_rate, images, status, category_id, published_at')
      .eq('id', id)
      .single(),
    supabase.from('categories').select('id, name').order('name'),
  ])

  if (!item) notFound()

  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>상품 수정</h1>
      <GoodsForm
        categories={categories ?? []}
        initial={{
          id: item.id,
          title: item.title,
          description: item.description,
          price: item.price,
          discount_rate: item.discount_rate ?? 0,
          images: item.images ?? [],
          status: item.status,
          category_id: item.category_id,
          published_at: item.published_at ?? null,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 5: 커밋**

```bash
git add apps/web/app/(admin)/admin/goods/page.tsx \
        apps/web/app/(admin)/admin/goods/_components/GoodsForm.tsx \
        apps/web/app/(admin)/admin/goods/[id]/edit/page.tsx
git commit -m "feat: goods form — discount_rate, image upload via Supabase Storage, published_at scheduling"
```

---

## Task 6: 상품별 어드민 대시보드

**Files:**
- Create: `apps/web/app/(admin)/admin/goods/[id]/page.tsx`

**Interfaces:**
- Consumes: `goods`, `order_items`, `orders`, `goods_wishlist` 테이블
- Produces: `/admin/goods/{id}` — 상품 판매 지표 + 주문 목록 대시보드

- [ ] **Step 1: /admin/goods/[id]/page.tsx 생성**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: '상품 상세 — Cosmos Admin' }

interface Props { params: Promise<{ id: string }> }

export default async function AdminGoodsDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: item },
    { count: wishlistCount },
    { data: orderItems },
  ] = await Promise.all([
    supabase
      .from('goods')
      .select('id, title, price, discount_rate, status, images, published_at, categories(name)')
      .eq('id', id)
      .single(),
    supabase
      .from('goods_wishlist')
      .select('*', { count: 'exact', head: true })
      .eq('goods_id', id),
    supabase
      .from('order_items')
      .select('quantity, unit_price, orders(id, status, created_at, profiles(display_name))')
      .eq('goods_id', id)
      .order('created_at', { referencedTable: 'orders', ascending: false }),
  ])

  if (!item) notFound()

  const totalQty = (orderItems ?? []).reduce((s, i) => s + (i.quantity ?? 0), 0)
  const totalRevenue = (orderItems ?? []).reduce((s, i) => s + (i.quantity ?? 0) * (i.unit_price ?? 0), 0)
  const finalPrice = Math.round(item.price * (1 - (item.discount_rate ?? 0) / 100))

  const STATUS_LABEL: Record<string, string> = {
    active: '판매중', sold_out: '품절', draft: '임시저장',
  }
  const ORDER_STATUS: Record<string, string> = {
    paid: '결제 완료', cancelled: '취소됨',
  }

  return (
    <div>
      <Link href="/admin/goods" className="text-xs mb-6 inline-block hover:opacity-70" style={{ color: '#1C1C1C' }}>
        ← 상품 목록
      </Link>

      {/* 헤더 */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          {(item.images as string[])?.[0] && (
            <img
              src={(item.images as string[])[0]}
              alt=""
              className="w-16 h-16 rounded-xl object-cover"
            />
          )}
          <div>
            <h1 className="text-2xl font-light" style={{ color: '#1C1C1C' }}>{item.title}</h1>
            <p className="text-sm mt-1" style={{ color: '#1C1C1C' }}>
              ₩{finalPrice.toLocaleString()}
              {(item.discount_rate ?? 0) > 0 && (
                <span className="ml-1">({item.discount_rate}% 할인)</span>
              )}
              {' · '}
              <span>{STATUS_LABEL[item.status] ?? item.status}</span>
              {item.published_at && (
                <span className="ml-1">
                  · {new Date(item.published_at) > new Date() ? '예약 노출: ' : '노출 시작: '}
                  {new Date(item.published_at).toLocaleString('ko-KR')}
                </span>
              )}
            </p>
          </div>
        </div>
        <Link
          href={`/admin/goods/${id}/edit`}
          className="px-4 py-2 rounded-xl text-sm text-white"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          수정
        </Link>
      </div>

      {/* 지표 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: '총 판매 수량', value: `${totalQty}개` },
          { label: '총 판매 금액', value: `₩${totalRevenue.toLocaleString()}` },
          { label: '찜 수', value: `${wishlistCount ?? 0}명` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
            <p className="text-xs mb-1" style={{ color: '#1C1C1C' }}>{label}</p>
            <p className="text-2xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* 주문 목록 */}
      <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>
        주문 내역 ({orderItems?.length ?? 0}건)
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#1C1C1C' }}>
            <th className="pb-2 font-normal">주문번호</th>
            <th className="pb-2 font-normal">고객</th>
            <th className="pb-2 font-normal">수량</th>
            <th className="pb-2 font-normal">금액</th>
            <th className="pb-2 font-normal">상태</th>
            <th className="pb-2 font-normal">일시</th>
          </tr>
        </thead>
        <tbody>
          {(orderItems ?? []).map((oi) => {
            const order = oi.orders as any
            return (
              <tr key={order?.id} style={{ borderTop: '1px solid #E8E5E0' }}>
                <td className="py-2" style={{ color: '#1C1C1C' }}>{order?.id?.slice(0, 8).toUpperCase() ?? '-'}</td>
                <td className="py-2" style={{ color: '#1C1C1C' }}>{order?.profiles?.display_name ?? '-'}</td>
                <td className="py-2" style={{ color: '#1C1C1C' }}>{oi.quantity}</td>
                <td className="py-2" style={{ color: '#1C1C1C' }}>{((oi.quantity ?? 0) * (oi.unit_price ?? 0)).toLocaleString()}원</td>
                <td className="py-2" style={{ color: '#1C1C1C' }}>
                  {ORDER_STATUS[order?.status as string] ?? order?.status ?? '-'}
                </td>
                <td className="py-2" style={{ color: '#1C1C1C' }}>
                  {order?.created_at ? new Date(order.created_at).toLocaleDateString('ko-KR') : '-'}
                </td>
              </tr>
            )
          })}
          {(orderItems ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-sm" style={{ color: '#1C1C1C' }}>주문이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add "apps/web/app/(admin)/admin/goods/[id]/page.tsx"
git commit -m "feat: add admin goods detail dashboard with sales metrics and order list"
```

---

## Task 7: 대시보드 — 방문자 지표 + 시간대별 차트

**Files:**
- Create: `apps/web/app/components/TrackPageView.tsx`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/(admin)/admin/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `page_views` 테이블
- Produces:
  - `TrackPageView` — 루트 레이아웃에서 pathname 기록
  - 대시보드 — 오늘 방문자 수, 신규 회원 7일, 시간대별 바 차트

- [ ] **Step 1: TrackPageView 컴포넌트 생성**

```tsx
// apps/web/app/components/TrackPageView.tsx
'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TrackPageView() {
  const pathname = usePathname()

  useEffect(() => {
    // 어드민 페이지 트래킹 제외
    if (pathname.startsWith('/admin')) return

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase.from('page_views').insert({
        path: pathname,
        user_id: user?.id ?? null,
      })
    })
  }, [pathname])

  return null
}
```

- [ ] **Step 2: 루트 layout.tsx에 TrackPageView 추가**

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import TrackPageView from './components/TrackPageView'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = { title: 'Cosmos — 독서 커뮤니티' }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <TrackPageView />
      </body>
    </html>
  )
}
```

- [ ] **Step 3: 대시보드 page.tsx 업데이트**

```tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: '대시보드 — Cosmos Admin' }

export default async function AdminDashboard() {
  const supabase = await createClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    { count: goodsCount },
    { count: paidCount },
    { count: cancelledCount },
    { count: customerCount },
    { count: todayVisitors },
    { count: newMembers7d },
    { data: recentOrders },
    { data: hourlyRaw },
  ] = await Promise.all([
    supabase.from('goods').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString()),
    supabase
      .from('orders')
      .select('id, status, total_amount, created_at, profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('page_views')
      .select('created_at')
      .gte('created_at', todayStart.toISOString()),
  ])

  // 시간대별 집계 (0~23시)
  const hourlyCounts = Array(24).fill(0)
  ;(hourlyRaw ?? []).forEach((row) => {
    const h = new Date(row.created_at).getHours()
    hourlyCounts[h]++
  })
  const maxCount = Math.max(...hourlyCounts, 1)

  const stats = [
    { label: '전체 상품', value: goodsCount ?? 0 },
    { label: '완료 주문', value: paidCount ?? 0, sub: `취소: ${cancelledCount ?? 0}건` },
    { label: '전체 회원', value: customerCount ?? 0 },
    { label: '오늘 방문자', value: todayVisitors ?? 0 },
    { label: '신규 회원 (7일)', value: newMembers7d ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl font-light mb-8" style={{ color: '#1C1C1C' }}>대시보드</h1>

      {/* 지표 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {stats.map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
            <p className="text-xs mb-1" style={{ color: '#1C1C1C' }}>{label}</p>
            <p className="text-3xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
            {sub && <p className="text-xs mt-1" style={{ color: '#1C1C1C', opacity: 0.6 }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* 시간대별 방문 차트 */}
      <h2 className="text-sm font-medium mb-4" style={{ color: '#1C1C1C' }}>오늘 시간대별 방문</h2>
      <div className="rounded-2xl p-5 mb-10" style={{ backgroundColor: '#E8E5E0' }}>
        <div className="flex items-end gap-1" style={{ height: 80 }}>
          {hourlyCounts.map((count, h) => (
            <div key={h} className="flex flex-col items-center flex-1">
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${Math.round((count / maxCount) * 100)}%`,
                  minHeight: count > 0 ? 4 : 0,
                  backgroundColor: '#1C1C1C',
                  opacity: count > 0 ? 0.8 : 0.1,
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex mt-1" style={{ gap: 'calc(100% / 24 - 1px)' }}>
          {[0, 6, 12, 18, 23].map((h) => (
            <span
              key={h}
              className="text-xs"
              style={{
                color: '#1C1C1C',
                opacity: 0.5,
                flex: h === 0 ? '0 0 auto' : '1',
                textAlign: h === 23 ? 'right' : 'left',
              }}
            >
              {h}시
            </span>
          ))}
        </div>
      </div>

      {/* 최근 주문 */}
      <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>최근 주문</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#1C1C1C' }}>
            <th className="pb-2 font-normal">주문번호</th>
            <th className="pb-2 font-normal">회원</th>
            <th className="pb-2 font-normal">금액</th>
            <th className="pb-2 font-normal">상태</th>
            <th className="pb-2 font-normal">일시</th>
          </tr>
        </thead>
        <tbody>
          {(recentOrders ?? []).map((order) => (
            <tr key={order.id} style={{ borderTop: '1px solid #E8E5E0' }}>
              <td className="py-2" style={{ color: '#1C1C1C' }}>{order.id.slice(0, 8).toUpperCase()}</td>
              <td className="py-2" style={{ color: '#1C1C1C' }}>
                {(order.profiles as any)?.display_name ?? '-'}
              </td>
              <td className="py-2" style={{ color: '#1C1C1C' }}>{(order.total_amount ?? 0).toLocaleString()}원</td>
              <td className="py-2" style={{ color: '#1C1C1C' }}>
                {{ paid: '결제 완료', cancelled: '취소됨' }[order.status as string] ?? order.status}
              </td>
              <td className="py-2" style={{ color: '#1C1C1C' }}>
                {new Date(order.created_at).toLocaleDateString('ko-KR')}
              </td>
            </tr>
          ))}
          {(recentOrders ?? []).length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm" style={{ color: '#1C1C1C' }}>주문이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: 커밋**

```bash
git add apps/web/app/components/TrackPageView.tsx \
        apps/web/app/layout.tsx \
        "apps/web/app/(admin)/admin/page.tsx"
git commit -m "feat: add page_views tracking and dashboard visitor stats with hourly chart"
```

---

## Task 8: 독서클럽 관리 플레이스홀더

**Files:**
- Create: `apps/web/app/(admin)/admin/clubs/page.tsx`

**Interfaces:**
- Consumes: AdminSidebar의 `/admin/clubs` 링크 (Task 2에서 추가됨)
- Produces: "준비 중" 페이지

- [ ] **Step 1: /admin/clubs/page.tsx 생성**

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '독서클럽 관리 — Cosmos Admin' }

export default function AdminClubsPage() {
  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>독서클럽 관리</h1>
      <div
        className="rounded-2xl p-12 text-center"
        style={{ backgroundColor: '#E8E5E0' }}
      >
        <p className="text-sm" style={{ color: '#1C1C1C' }}>준비 중입니다.</p>
        <p className="text-xs mt-2" style={{ color: '#1C1C1C', opacity: 0.6 }}>
          클럽장 / 일반 멤버 권한 관리 기능이 추가될 예정입니다.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add "apps/web/app/(admin)/admin/clubs/page.tsx"
git commit -m "feat: add clubs admin placeholder page"
```

---

## Task 9: 빌드 확인 및 최종 점검

**Files:**
- 변경 없음 (확인만)

- [ ] **Step 1: 타입스크립트 빌드 확인**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: 에러 없음. 에러 발생 시 메시지 읽고 수정.

- [ ] **Step 2: Next.js 빌드 확인**

```bash
cd /Users/cosmos/Desktop/Cosmos && pnpm build
```

Expected: 빌드 성공.

- [ ] **Step 3: 개발 서버 실행 후 수동 확인 항목**

```bash
pnpm dev
```

확인:
- `/admin` — 대시보드 카드 5개 표시, 시간대별 차트 렌더링
- `/admin/goods` — 상품명 클릭 시 `/admin/goods/{id}` 이동
- `/admin/goods/new` — 파일 업로드 UI, 정가+할인율+최종가 미리보기, 노출 시간 입력
- `/admin/clubs` — "준비 중" 페이지
- `/goods` — draft 상품 미노출, 미래 published_at 상품 미노출
- `/goods/{id}` — 이미지 2장 이상이면 슬라이드쇼 + dot indicator

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "chore: final build verification for admin enhancement"
```
