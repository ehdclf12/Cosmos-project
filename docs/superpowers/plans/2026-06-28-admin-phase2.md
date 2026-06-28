# 관리자 페이지 고도화 2차 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 사이드바를 아코디언형으로 개편하고, 대시보드에 7일 매출 차트를 추가하며, 상품/주문/고객 관리 페이지에 검색·필터·페이지네이션을 구현한다.

**Architecture:** URL searchParams 기반 서버사이드 필터링 — 검색/필터/페이지 상태를 모두 URL에 반영해 새로고침 시 상태 유지. 공통 Pagination 컴포넌트를 만들어 세 페이지에서 재사용. DB 마이그레이션으로 재고(stock_quantity)와 주문 배송 상태(preparing/shipping/delivered)를 추가.

**Tech Stack:** Next.js 15 (App Router, async params/searchParams), Supabase JS v2 (서버·클라이언트 SSR), TypeScript, Tailwind CSS

## Global Constraints

- 색상: `#1C1C1C` (텍스트/액션), `#E8E5E0` (배경 카드), `#EDEBE7` (사이드바)
- 외부 차트 라이브러리 금지 — CSS flex 바 차트만 사용
- Next.js 15 async params 패턴 사용: `params: Promise<{...}>`, `searchParams: Promise<{...}>`
- 페이지 사이즈: 20개/페이지 (`PAGE_SIZE = 20`)
- Supabase 서버 클라이언트: `@/lib/supabase/server`의 `createClient()` (서버 컴포넌트)
- Supabase 브라우저 클라이언트: `@/lib/supabase/client`의 `createClient()` (클라이언트 컴포넌트)
- 관리자 클라이언트: `@/lib/supabase/admin-client`의 `createAdminClient()` (service role)

---

## File Map

| 파일 | 작업 |
|------|------|
| `supabase/migrations/004_admin_phase2.sql` | 신규 — stock_quantity, 주문 상태 확장 |
| `apps/web/app/components/Pagination.tsx` | 신규 — 공통 페이지네이션 컴포넌트 |
| `apps/web/app/(admin)/_components/AdminSidebar.tsx` | 수정 — 아코디언 서브메뉴 |
| `apps/web/app/(admin)/admin/page.tsx` | 수정 — 대시보드 재구성 + 7일 매출 차트 |
| `apps/web/app/(admin)/admin/goods/_components/GoodsForm.tsx` | 수정 — stock_quantity 필드, 업로드 버그 수정 |
| `apps/web/app/(admin)/admin/goods/[id]/edit/page.tsx` | 수정 — stock_quantity 전달 |
| `apps/web/app/(admin)/admin/goods/page.tsx` | 수정 — 미니 대시보드, 검색/필터/페이지네이션 |
| `apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx` | 수정 — 4단계 상태 |
| `apps/web/app/(admin)/admin/orders/page.tsx` | 수정 — 검색/필터/페이지네이션 |
| `apps/web/app/(admin)/admin/orders/[id]/page.tsx` | 신규 — 주문 상세 |
| `apps/web/app/(admin)/admin/customers/page.tsx` | 수정 — 검색/필터/페이지네이션 |

---

## Task 1: DB 마이그레이션

**Files:**
- Create: `supabase/migrations/004_admin_phase2.sql`

**Interfaces:**
- Produces: `goods.stock_quantity integer`, `orders.status`에 `preparing | shipping | delivered` 추가

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/004_admin_phase2.sql

-- 1. goods: 재고 수량 컬럼 추가
alter table public.goods
  add column if not exists stock_quantity integer not null default 0
    check (stock_quantity >= 0);

-- 2. 재고 0 → sold_out 자동 전환 트리거
create or replace function public.auto_sold_out_on_stock()
returns trigger as $$
begin
  if new.stock_quantity = 0 and new.status = 'active' then
    new.status := 'sold_out';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists goods_auto_sold_out on public.goods;
create trigger goods_auto_sold_out
  before update of stock_quantity on public.goods
  for each row execute function public.auto_sold_out_on_stock();

-- 3. orders: status check constraint 확장
--    기존 제약 이름은 Supabase 대시보드에서 확인 후 동일하게 처리
alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
    check (status in ('paid', 'preparing', 'shipping', 'delivered', 'cancelled'));
```

- [ ] **Step 2: Supabase 대시보드에서 마이그레이션 실행**

Supabase 프로젝트 대시보드 → SQL Editor → 위 SQL 붙여넣기 → Run

실행 후 확인:
- `goods` 테이블에 `stock_quantity` 컬럼 존재 여부
- `orders` 테이블에서 `status = 'preparing'`으로 UPDATE 가능한지 테스트

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/004_admin_phase2.sql
git commit -m "feat: add stock_quantity to goods and expand order status"
```

---

## Task 2: 공통 Pagination 컴포넌트

**Files:**
- Create: `apps/web/app/components/Pagination.tsx`

**Interfaces:**
- Produces: `<Pagination page totalCount pageSize searchParams />` — 나머지 Task에서 import

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// apps/web/app/components/Pagination.tsx
import Link from 'next/link'

interface Props {
  page: number
  totalCount: number
  pageSize?: number
  searchParams: Record<string, string>
}

export default function Pagination({ page, totalCount, pageSize = 20, searchParams }: Props) {
  const totalPages = Math.ceil(totalCount / pageSize)
  if (totalPages <= 1) return null

  function pageHref(p: number) {
    const params = new URLSearchParams({ ...searchParams, page: String(p) })
    return `?${params.toString()}`
  }

  const pages: (number | '...')[] = []
  const delta = 2
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6 text-sm">
      {page > 1 && (
        <Link
          href={pageHref(page - 1)}
          className="px-3 py-1.5 rounded-lg hover:opacity-70"
          style={{ color: '#1C1C1C' }}
        >
          ← 이전
        </Link>
      )}
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-2" style={{ color: '#1C1C1C', opacity: 0.4 }}>
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={pageHref(p as number)}
            className="px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: p === page ? '#1C1C1C' : 'transparent',
              color: p === page ? 'white' : '#1C1C1C',
            }}
          >
            {p}
          </Link>
        )
      )}
      {page < totalPages && (
        <Link
          href={pageHref(page + 1)}
          className="px-3 py-1.5 rounded-lg hover:opacity-70"
          style={{ color: '#1C1C1C' }}
        >
          다음 →
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/web/app/components/Pagination.tsx
git commit -m "feat: add shared Pagination component"
```

---

## Task 3: AdminSidebar 아코디언

**Files:**
- Modify: `apps/web/app/(admin)/_components/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `usePathname()` (Next.js navigation)
- Produces: 아코디언형 사이드바 — 상품관리 하위에 `상품 목록 / 상품 등록` 서브메뉴

- [ ] **Step 1: AdminSidebar.tsx 전체 교체**

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const GOODS_SUB = [
  { href: '/admin/goods', label: '상품 목록' },
  { href: '/admin/goods/new', label: '상품 등록' },
]

const NAV_ITEMS = [
  { href: '/admin/orders', label: '주문관리' },
  { href: '/admin/customers', label: '고객관리' },
  { href: '/admin/clubs', label: '독서클럽' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const goodsActive = pathname.startsWith('/admin/goods')
  const [open, setOpen] = useState(goodsActive)
  const dashActive = pathname === '/admin'

  return (
    <aside
      className="w-52 shrink-0 border-r flex flex-col pt-8 px-4 min-h-screen"
      style={{ borderColor: '#E8E5E0', backgroundColor: '#EDEBE7' }}
    >
      <span className="text-xs tracking-widest uppercase mb-8 block" style={{ color: '#1C1C1C' }}>
        Cosmos Admin
      </span>
      <nav className="space-y-1">
        {/* 대시보드 */}
        <Link
          href="/admin"
          className="block px-3 py-2 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: dashActive ? '#1C1C1C' : 'transparent',
            color: dashActive ? 'white' : '#1C1C1C',
          }}
        >
          대시보드
        </Link>

        {/* 상품관리 아코디언 */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left"
          style={{
            backgroundColor: goodsActive ? 'rgba(28,28,28,0.08)' : 'transparent',
            color: '#1C1C1C',
          }}
        >
          <span>상품관리</span>
          <span style={{ opacity: 0.45, fontSize: 10 }}>{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <div className="ml-3 space-y-0.5 pb-1">
            {GOODS_SUB.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className="block px-3 py-1.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: active ? '#1C1C1C' : 'transparent',
                    color: active ? 'white' : '#1C1C1C',
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        )}

        {/* 나머지 메뉴 */}
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href)
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

- [ ] **Step 2: 브라우저에서 확인**

`/admin` 진입 → 상품관리 클릭 → 서브메뉴 펼쳐짐 확인  
`/admin/goods` 진입 → 서브메뉴 자동 펼쳐짐 확인  
`/admin/goods/new` 진입 → "상품 등록" 항목 active 확인

- [ ] **Step 3: 커밋**

```bash
git add "apps/web/app/(admin)/_components/AdminSidebar.tsx"
git commit -m "feat: accordion submenu for goods management in admin sidebar"
```

---

## Task 4: 대시보드 재구성 + 7일 매출 차트

**Files:**
- Modify: `apps/web/app/(admin)/admin/page.tsx`

**Interfaces:**
- Consumes: `supabase.from('orders').select('total_amount, created_at').in('status', ['paid','delivered'])`
- Produces: 방문/회원 지표 + 시간대별 방문 + 7일 매출 차트

- [ ] **Step 1: admin/page.tsx 전체 교체**

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
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const sixDaysAgo = new Date()
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
  sixDaysAgo.setHours(0, 0, 0, 0)

  const [
    { count: todayVisitors },
    { count: newMembers7d },
    { data: hourlyRaw },
    { data: salesRaw },
  ] = await Promise.all([
    supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString()),
    supabase
      .from('page_views')
      .select('created_at')
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('orders')
      .select('total_amount, created_at')
      .in('status', ['paid', 'delivered'])
      .gte('created_at', sixDaysAgo.toISOString()),
  ])

  // 시간대별 방문 집계
  const hourlyCounts = Array(24).fill(0)
  ;(hourlyRaw ?? []).forEach((row) => {
    hourlyCounts[new Date(row.created_at).getHours()]++
  })
  const maxHourly = Math.max(...hourlyCounts, 1)

  // 7일 매출 집계 (index 0 = 6일 전, index 6 = 오늘)
  const dailySales = Array(7).fill(0)
  ;(salesRaw ?? []).forEach((row) => {
    const rowDate = new Date(row.created_at)
    rowDate.setHours(0, 0, 0, 0)
    const diff = Math.round((rowDate.getTime() - sixDaysAgo.getTime()) / 86400000)
    if (diff >= 0 && diff < 7) dailySales[diff] += row.total_amount ?? 0
  })
  const totalSales7d = dailySales.reduce((s, v) => s + v, 0)
  const maxSales = Math.max(...dailySales, 1)

  const stats = [
    { label: '오늘 방문자', value: todayVisitors ?? 0 },
    { label: '신규 회원 (7일)', value: newMembers7d ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl font-light mb-8" style={{ color: '#1C1C1C' }}>대시보드</h1>

      {/* 지표 카드 */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
            <p className="text-xs mb-1" style={{ color: '#1C1C1C' }}>{label}</p>
            <p className="text-3xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
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
                  height: `${Math.round((count / maxHourly) * 100)}%`,
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

      {/* 7일 매출 차트 */}
      <h2 className="text-sm font-medium mb-4" style={{ color: '#1C1C1C' }}>최근 7일 매출</h2>
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
        <div className="flex items-end gap-2" style={{ height: 80 }}>
          {dailySales.map((amount, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${Math.round((amount / maxSales) * 100)}%`,
                  minHeight: amount > 0 ? 4 : 0,
                  backgroundColor: '#1C1C1C',
                  opacity: amount > 0 ? 0.8 : 0.1,
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex mt-2">
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(sixDaysAgo)
            d.setDate(d.getDate() + i)
            return (
              <span key={i} className="flex-1 text-xs text-center" style={{ color: '#1C1C1C', opacity: 0.5 }}>
                {d.getMonth() + 1}/{d.getDate()}
              </span>
            )
          })}
        </div>
        <p className="text-xs mt-3 text-right" style={{ color: '#1C1C1C', opacity: 0.7 }}>
          7일 총 매출: <strong>₩{totalSales7d.toLocaleString()}</strong>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

`/admin` 진입 → 지표 카드 2개, 시간대별 차트, 7일 매출 차트 렌더링 확인  
기존 전체상품/완료주문/최근주문 테이블이 사라졌는지 확인

- [ ] **Step 3: 커밋**

```bash
git add "apps/web/app/(admin)/admin/page.tsx"
git commit -m "feat: dashboard redesign with 7-day sales chart"
```

---

## Task 5: GoodsForm — stock_quantity 추가 + 업로드 버그 수정

**Files:**
- Modify: `apps/web/app/(admin)/admin/goods/_components/GoodsForm.tsx`
- Modify: `apps/web/app/(admin)/admin/goods/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: Task 1에서 추가된 `goods.stock_quantity`
- Produces: `GoodsFormProps.initial.stock_quantity`, payload에 `stock_quantity` 포함

**버그 조사:** GoodsForm은 `createClient()` (browser anon client)를 사용한다. RLS `goods_admin_all` 정책은 `is_admin()`을 요구한다. 에러 원인을 파악하려면 브라우저 콘솔에서 Supabase 에러 메시지를 확인해야 한다. 가장 가능성 높은 원인: 현재 세션의 JWT에 `app_metadata.role = 'admin'`이 없음 → 해결 방법은 아래 Step에 기술.

- [ ] **Step 1: 버그 원인 확인**

브라우저에서 `/admin/goods/new` 접속 → 상품명/가격 입력 → status를 'active'로 설정 → 등록하기 클릭 → 브라우저 콘솔 열기 → Supabase 에러 메시지 확인

에러가 `"new row violates row-level security policy"` 이면 → Step 2-A 진행  
에러가 없는데 저장이 안 되면 → Step 2-B 진행

- [ ] **Step 2-A: RLS 우회 — 서버 액션으로 변환**

GoodsForm의 submit을 서버 액션으로 변경하여 서버에서 `createClient()` (서버 클라이언트, 쿠키 기반 세션)를 사용. 서버의 세션은 `is_admin()` 평가 시 올바른 JWT를 전달함.

`apps/web/app/(admin)/admin/goods/actions.ts` 파일 신규 생성:

```ts
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface GoodsPayload {
  title: string
  description: string | null
  price: number
  discount_rate: number
  stock_quantity: number
  images: string[]
  status: 'active' | 'sold_out' | 'draft'
  category_id: string | null
  published_at: string | null
}

export async function saveGoods(id: string | null, payload: GoodsPayload) {
  const supabase = await createClient()
  const { error } = id
    ? await supabase.from('goods').update(payload).eq('id', id)
    : await supabase.from('goods').insert(payload)
  if (error) return { error: error.message }
  redirect('/admin/goods')
}
```

그런 다음 GoodsForm의 `handleSubmit` 내부에서:
```ts
// 기존: await supabase.from('goods').update(payload)...
// 변경: await saveGoods(isEdit ? initial!.id : null, payload)
```

- [ ] **Step 2-B: 에러 없는데 저장 안 될 경우**

`handleSubmit` 안에서 `console.log('err:', err)` 추가 후 재테스트하여 실제 에러 확인. 에러 내용에 따라 대응.

- [ ] **Step 3: GoodsForm에 stock_quantity 필드 추가**

`GoodsFormProps` 인터페이스에 `stock_quantity: number` 추가:

```tsx
interface GoodsFormProps {
  categories: Category[]
  initial?: {
    id: string
    title: string
    description: string | null
    price: number
    discount_rate: number
    stock_quantity: number  // 추가
    images: string[]
    status: 'active' | 'sold_out' | 'draft'
    category_id: string | null
    published_at: string | null
  }
}
```

`useState` 초기값에 추가:
```tsx
const [form, setForm] = useState({
  title: initial?.title ?? '',
  description: initial?.description ?? '',
  price: initial?.price?.toString() ?? '',
  discount_rate: initial?.discount_rate?.toString() ?? '0',
  stock_quantity: initial?.stock_quantity?.toString() ?? '0',  // 추가
  status: initial?.status ?? ('draft' as 'active' | 'sold_out' | 'draft'),
  category_id: initial?.category_id ?? '',
  published_at: initial?.published_at
    ? new Date(initial.published_at).toISOString().slice(0, 16)
    : '',
})
```

payload에 추가:
```tsx
const payload = {
  title: form.title,
  description: form.description || null,
  price: Number(form.price),
  discount_rate: discountRate,
  stock_quantity: Math.max(0, Number(form.stock_quantity) || 0),  // 추가
  images,
  status: form.status,
  category_id: form.category_id || null,
  published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
}
```

폼에 재고 수량 input 추가 (정가/할인율 grid 아래에 삽입):
```tsx
<div>
  <label className={lbl} style={{ color: '#1C1C1C' }}>재고 수량 (개)</label>
  <input
    type="number"
    value={form.stock_quantity}
    onChange={(e) => set('stock_quantity', e.target.value)}
    className={field}
    style={{ color: '#1C1C1C' }}
    min={0}
  />
</div>
```

- [ ] **Step 4: edit/page.tsx에 stock_quantity 전달**

`apps/web/app/(admin)/admin/goods/[id]/edit/page.tsx`에서:

```tsx
// select에 stock_quantity 추가
supabase
  .from('goods')
  .select('id, title, description, price, discount_rate, stock_quantity, images, status, category_id, published_at')
  ...

// GoodsForm initial에 추가
<GoodsForm
  categories={categories ?? []}
  initial={{
    id: item.id,
    title: item.title,
    description: item.description,
    price: item.price,
    discount_rate: item.discount_rate ?? 0,
    stock_quantity: item.stock_quantity ?? 0,  // 추가
    images: item.images ?? [],
    status: item.status,
    category_id: item.category_id,
    published_at: item.published_at ?? null,
  }}
/>
```

- [ ] **Step 5: 동작 확인**

`/admin/goods/new` 에서 status='active'로 상품 등록 → 성공 확인  
`/admin/goods/[id]/edit` 에서 재고 수량 변경 후 저장 → 성공 확인

- [ ] **Step 6: 커밋**

```bash
git add "apps/web/app/(admin)/admin/goods/_components/GoodsForm.tsx"
git add "apps/web/app/(admin)/admin/goods/[id]/edit/page.tsx"
# 서버 액션 파일이 생성된 경우:
git add "apps/web/app/(admin)/admin/goods/actions.ts"
git commit -m "feat: add stock_quantity to goods form, fix goods upload bug"
```

---

## Task 6: 상품 목록 페이지 — 미니 대시보드 + 검색/필터/페이지네이션

**Files:**
- Modify: `apps/web/app/(admin)/admin/goods/page.tsx`

**Interfaces:**
- Consumes: `Pagination` (Task 2), `goods.stock_quantity` (Task 1)
- URL searchParams: `q`, `status`, `from`, `to`, `page`

- [ ] **Step 1: goods/page.tsx 전체 교체**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DeleteGoodsButton from './_components/DeleteGoodsButton'
import Pagination from '@/app/components/Pagination'

export const metadata: Metadata = { title: '상품 관리 — Cosmos Admin' }

const PAGE_SIZE = 20

const STATUS_LABEL: Record<string, string> = {
  active: '판매중',
  sold_out: '품절',
  draft: '임시저장',
}

interface Props {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string; page?: string }>
}

export default async function AdminGoodsPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = sp.q ?? ''
  const statusFilter = sp.status ?? ''
  const dateFrom = sp.from ?? ''
  const dateTo = sp.to ?? ''
  const page = Math.max(1, Number(sp.page) || 1)
  const supabase = await createClient()

  // 미니 대시보드 데이터
  const [
    { count: totalGoods },
    { count: activeGoods },
    { count: paidOrders },
  ] = await Promise.all([
    supabase.from('goods').select('*', { count: 'exact', head: true }),
    supabase.from('goods').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
  ])

  // 필터링된 상품 목록
  let query = supabase
    .from('goods')
    .select('id, title, price, discount_rate, stock_quantity, status, images, categories(name)', { count: 'exact' })

  if (q) query = query.ilike('title', `%${q}%`)
  if (statusFilter) query = query.eq('status', statusFilter)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')

  const from = (page - 1) * PAGE_SIZE
  const { data: goods, count: totalCount } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  const spRecord: Record<string, string> = {}
  if (q) spRecord.q = q
  if (statusFilter) spRecord.status = statusFilter
  if (dateFrom) spRecord.from = dateFrom
  if (dateTo) spRecord.to = dateTo

  return (
    <div>
      {/* 미니 대시보드 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: '전체 상품', value: totalGoods ?? 0 },
          { label: '판매중', value: activeGoods ?? 0 },
          { label: '완료 주문', value: paidOrders ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-4" style={{ backgroundColor: '#E8E5E0' }}>
            <p className="text-xs mb-1" style={{ color: '#1C1C1C' }}>{label}</p>
            <p className="text-2xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-light" style={{ color: '#1C1C1C' }}>상품 관리</h1>
      </div>

      {/* 검색/필터 폼 */}
      <form method="get" className="flex flex-wrap gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="상품명 검색"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white"
          style={{ color: '#1C1C1C', minWidth: 180 }}
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none"
          style={{ color: '#1C1C1C' }}
        >
          <option value="">전체 상태</option>
          <option value="active">판매중</option>
          <option value="sold_out">품절</option>
          <option value="draft">임시저장</option>
        </select>
        <input
          type="date"
          name="from"
          defaultValue={dateFrom}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none"
          style={{ color: '#1C1C1C' }}
        />
        <span className="self-center text-sm" style={{ color: '#1C1C1C' }}>~</span>
        <input
          type="date"
          name="to"
          defaultValue={dateTo}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none"
          style={{ color: '#1C1C1C' }}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl text-sm text-white"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          검색
        </button>
        {(q || statusFilter || dateFrom || dateTo) && (
          <a
            href="/admin/goods"
            className="px-4 py-2 rounded-xl text-sm border border-gray-200"
            style={{ color: '#1C1C1C' }}
          >
            초기화
          </a>
        )}
        <Link
          href="/admin/goods/new"
          className="ml-auto px-4 py-2 rounded-xl text-sm text-white"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          + 상품 등록
        </Link>
      </form>

      {/* 상품 목록 테이블 */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#1C1C1C' }}>
            <th className="pb-2 font-normal w-12">이미지</th>
            <th className="pb-2 font-normal">상품명</th>
            <th className="pb-2 font-normal">가격</th>
            <th className="pb-2 font-normal">할인</th>
            <th className="pb-2 font-normal">재고</th>
            <th className="pb-2 font-normal">카테고리</th>
            <th className="pb-2 font-normal">상태</th>
            <th className="pb-2 font-normal w-20"></th>
          </tr>
        </thead>
        <tbody>
          {(goods ?? []).map((item) => {
            const finalPrice = Math.round(item.price * (1 - (item.discount_rate ?? 0) / 100))
            const stockQty = (item as any).stock_quantity ?? 0
            return (
              <tr key={item.id} style={{ borderTop: '1px solid #E8E5E0' }}>
                <td className="py-3">
                  {(item.images as string[])?.[0] ? (
                    <img src={(item.images as string[])[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
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
                <td className="py-3" style={{ color: stockQty === 0 ? '#ef4444' : '#1C1C1C' }}>
                  {stockQty}
                </td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {(item.categories as any)?.name ?? '-'}
                </td>
                <td className="py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#E8E5E0', color: '#1C1C1C' }}
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
              <td colSpan={8} className="py-12 text-center text-sm" style={{ color: '#1C1C1C' }}>
                {q || statusFilter || dateFrom || dateTo ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination page={page} totalCount={totalCount ?? 0} pageSize={PAGE_SIZE} searchParams={spRecord} />
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

`/admin/goods` → 미니 대시보드 3개 카드 확인  
상품명 검색 → 결과 필터링 확인  
상태 필터 → active/sold_out/draft 필터링 확인  
날짜 범위 → 해당 기간 상품만 노출 확인  
초기화 버튼 → 필터 리셋 확인

- [ ] **Step 3: 커밋**

```bash
git add "apps/web/app/(admin)/admin/goods/page.tsx"
git commit -m "feat: goods admin with mini-dashboard, search/filter/pagination"
```

---

## Task 7: OrderStatusSelect — 4단계 배송 상태

**Files:**
- Modify: `apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx`

**Interfaces:**
- Produces: `status` 옵션 `paid | preparing | shipping | delivered | cancelled`

- [ ] **Step 1: OrderStatusSelect.tsx 교체**

```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const STATUS_OPTIONS = [
  { value: 'paid', label: '결제완료' },
  { value: 'preparing', label: '상품준비중' },
  { value: 'shipping', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
  { value: 'cancelled', label: '취소됨' },
]

export default function OrderStatusSelect({ id, status }: { id: string; status: string }) {
  const [value, setValue] = useState(status)
  const [saving, setSaving] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    const prev = value
    setValue(next)
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', id)
    setSaving(false)
    if (error) setValue(prev)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={saving}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none cursor-pointer disabled:opacity-50"
      style={{ color: '#1C1C1C' }}
    >
      {STATUS_OPTIONS.map(({ value: v, label }) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </select>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

`/admin/orders` → 주문 상태 드롭다운에 5개 옵션 확인  
상태 변경 → DB 반영 확인 (페이지 새로고침 후 유지)

- [ ] **Step 3: 커밋**

```bash
git add "apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx"
git commit -m "feat: expand order status to 4-step delivery flow"
```

---

## Task 8: 주문 목록 페이지 — 검색/필터/페이지네이션

**Files:**
- Modify: `apps/web/app/(admin)/admin/orders/page.tsx`

**Interfaces:**
- Consumes: `Pagination` (Task 2), `OrderStatusSelect` (Task 7)
- URL searchParams: `q`, `status`, `from`, `to`, `page`

- [ ] **Step 1: orders/page.tsx 전체 교체**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import OrderStatusSelect from './_components/OrderStatusSelect'
import Pagination from '@/app/components/Pagination'

export const metadata: Metadata = { title: '주문 관리 — Cosmos Admin' }

const PAGE_SIZE = 20

const STATUS_LABEL: Record<string, string> = {
  paid: '결제완료',
  preparing: '상품준비중',
  shipping: '배송중',
  delivered: '배송완료',
  cancelled: '취소됨',
}

interface Props {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string; page?: string }>
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = sp.q ?? ''
  const statusFilter = sp.status ?? ''
  const dateFrom = sp.from ?? ''
  const dateTo = sp.to ?? ''
  const page = Math.max(1, Number(sp.page) || 1)
  const supabase = await createClient()

  // 고객명 검색 시 profile IDs 선조회
  let profileIds: string[] = []
  if (q) {
    const { data: matched } = await supabase
      .from('profiles')
      .select('id')
      .ilike('display_name', `%${q}%`)
    profileIds = (matched ?? []).map((p) => p.id)
  }

  let query = supabase
    .from('orders')
    .select(
      'id, status, total_amount, created_at, profiles(display_name), order_items(title, quantity)',
      { count: 'exact' }
    )

  if (q) {
    const idFilter = `id.ilike.%${q}%`
    const nameFilter = profileIds.length > 0 ? `,user_id.in.(${profileIds.join(',')})` : ''
    query = query.or(idFilter + nameFilter)
  }
  if (statusFilter) query = query.eq('status', statusFilter)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')

  const from = (page - 1) * PAGE_SIZE
  const { data: orders, count: totalCount } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  const spRecord: Record<string, string> = {}
  if (q) spRecord.q = q
  if (statusFilter) spRecord.status = statusFilter
  if (dateFrom) spRecord.from = dateFrom
  if (dateTo) spRecord.to = dateTo

  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>주문 관리</h1>

      {/* 검색/필터 폼 */}
      <form method="get" className="flex flex-wrap gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="주문번호 / 고객명 검색"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white"
          style={{ color: '#1C1C1C', minWidth: 200 }}
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none"
          style={{ color: '#1C1C1C' }}
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={dateFrom}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none" style={{ color: '#1C1C1C' }} />
        <span className="self-center text-sm" style={{ color: '#1C1C1C' }}>~</span>
        <input type="date" name="to" defaultValue={dateTo}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none" style={{ color: '#1C1C1C' }} />
        <button type="submit" className="px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>
          검색
        </button>
        {(q || statusFilter || dateFrom || dateTo) && (
          <a href="/admin/orders" className="px-4 py-2 rounded-xl text-sm border border-gray-200" style={{ color: '#1C1C1C' }}>
            초기화
          </a>
        )}
      </form>

      {/* 주문 목록 테이블 */}
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
                <td className="py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="hover:underline font-mono"
                    style={{ color: '#1C1C1C' }}
                  >
                    {order.id.slice(0, 8).toUpperCase()}
                  </Link>
                </td>
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
              <td colSpan={6} className="py-12 text-center text-sm" style={{ color: '#1C1C1C' }}>
                {q || statusFilter || dateFrom || dateTo ? '검색 결과가 없습니다.' : '주문이 없습니다.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination page={page} totalCount={totalCount ?? 0} pageSize={PAGE_SIZE} searchParams={spRecord} />
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

`/admin/orders` → 주문번호 클릭 시 `/admin/orders/[id]`로 이동 (Task 9 이후 완성)  
고객명 검색 → 해당 회원 주문 필터링 확인  
상태 필터 → 배송중 등 새 상태 필터링 확인

- [ ] **Step 3: 커밋**

```bash
git add "apps/web/app/(admin)/admin/orders/page.tsx"
git commit -m "feat: orders admin with search/filter/pagination"
```

---

## Task 9: 주문 상세 페이지

**Files:**
- Create: `apps/web/app/(admin)/admin/orders/[id]/page.tsx`

**Interfaces:**
- Consumes: `OrderStatusSelect` (Task 7), `createAdminClient()`, `order_items.unit_price`

- [ ] **Step 1: 디렉토리 생성 확인**

```bash
ls "apps/web/app/(admin)/admin/orders/"
```

`[id]` 폴더가 없으면 생성:
```bash
mkdir -p "apps/web/app/(admin)/admin/orders/[id]"
```

- [ ] **Step 2: 주문 상세 페이지 작성**

```tsx
// apps/web/app/(admin)/admin/orders/[id]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import OrderStatusSelect from '../_components/OrderStatusSelect'

export const metadata: Metadata = { title: '주문 상세 — Cosmos Admin' }

interface Props { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, status, total_amount, created_at, user_id,
      profiles(id, display_name),
      order_items(id, title, quantity, unit_price)
    `)
    .eq('id', id)
    .single()

  if (!order) notFound()

  const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(order.user_id)

  const profile = order.profiles as any
  const items = (order.order_items as { id: string; title: string; quantity: number; unit_price: number }[]) ?? []

  const STATUS_LABEL: Record<string, string> = {
    paid: '결제완료',
    preparing: '상품준비중',
    shipping: '배송중',
    delivered: '배송완료',
    cancelled: '취소됨',
  }

  return (
    <div>
      <Link href="/admin/orders" className="text-xs mb-6 inline-block hover:opacity-70" style={{ color: '#1C1C1C' }}>
        ← 주문 목록
      </Link>

      {/* 헤더 */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light font-mono" style={{ color: '#1C1C1C' }}>
            {order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#1C1C1C', opacity: 0.6 }}>
            {new Date(order.created_at).toLocaleString('ko-KR')}
          </p>
        </div>
        <OrderStatusSelect id={order.id} status={order.status} />
      </div>

      {/* 주문 상품 */}
      <section className="mb-8">
        <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>주문 상품</h2>
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#E8E5E0' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: '#1C1C1C' }}>
                <th className="px-4 py-3 font-normal">상품명</th>
                <th className="px-4 py-3 font-normal text-right">수량</th>
                <th className="px-4 py-3 font-normal text-right">단가</th>
                <th className="px-4 py-3 font-normal text-right">소계</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid rgba(28,28,28,0.1)' }}>
                  <td className="px-4 py-3" style={{ color: '#1C1C1C' }}>{item.title}</td>
                  <td className="px-4 py-3 text-right" style={{ color: '#1C1C1C' }}>{item.quantity}</td>
                  <td className="px-4 py-3 text-right" style={{ color: '#1C1C1C' }}>
                    {(item.unit_price ?? 0).toLocaleString()}원
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: '#1C1C1C' }}>
                    {((item.quantity ?? 0) * (item.unit_price ?? 0)).toLocaleString()}원
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid rgba(28,28,28,0.15)' }}>
                <td colSpan={3} className="px-4 py-3 text-right font-medium" style={{ color: '#1C1C1C' }}>합계</td>
                <td className="px-4 py-3 text-right font-medium" style={{ color: '#1C1C1C' }}>
                  {(order.total_amount ?? 0).toLocaleString()}원
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 주문자 정보 */}
      <section>
        <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>주문자 정보</h2>
        <div className="rounded-2xl p-5 space-y-2" style={{ backgroundColor: '#E8E5E0' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#1C1C1C', opacity: 0.6 }}>이름</span>
            <Link
              href={`/admin/customers/${profile?.id}`}
              className="text-sm hover:underline"
              style={{ color: '#1C1C1C' }}
            >
              {profile?.display_name ?? '-'}
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#1C1C1C', opacity: 0.6 }}>이메일</span>
            <span className="text-sm" style={{ color: '#1C1C1C' }}>{authUser?.email ?? '-'}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: 브라우저에서 확인**

`/admin/orders` → 주문번호 클릭 → 상세 페이지 렌더링 확인  
상품 목록 / 단가 / 소계 / 합계 확인  
주문자 이름 클릭 → `/admin/customers/[id]` 이동 확인  
상태 드롭다운 변경 → DB 반영 확인

- [ ] **Step 4: 커밋**

```bash
git add "apps/web/app/(admin)/admin/orders/[id]/page.tsx"
git commit -m "feat: order detail page with items, total, and customer info"
```

---

## Task 10: 고객 목록 페이지 — 검색/필터/페이지네이션

**Files:**
- Modify: `apps/web/app/(admin)/admin/customers/page.tsx`

**Interfaces:**
- Consumes: `Pagination` (Task 2), `createAdminClient()`
- URL searchParams: `q`, `from`, `to`, `page`

- [ ] **Step 1: customers/page.tsx 전체 교체**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import Pagination from '@/app/components/Pagination'

export const metadata: Metadata = { title: '고객 관리 — Cosmos Admin' }

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = sp.q ?? ''
  const dateFrom = sp.from ?? ''
  const dateTo = sp.to ?? ''
  const page = Math.max(1, Number(sp.page) || 1)
  const supabase = await createClient()
  const adminClient = createAdminClient()

  let profileQuery = supabase
    .from('profiles')
    .select('id, display_name, created_at', { count: 'exact' })

  if (q) profileQuery = profileQuery.ilike('display_name', `%${q}%`)
  if (dateFrom) profileQuery = profileQuery.gte('created_at', dateFrom)
  if (dateTo) profileQuery = profileQuery.lte('created_at', dateTo + 'T23:59:59')

  const from = (page - 1) * PAGE_SIZE
  const [
    { data: profiles, count: totalCount },
    { data: { users } },
    { data: orderRows },
  ] = await Promise.all([
    profileQuery.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('orders').select('user_id'),
  ])

  const profileIds = (profiles ?? []).map((p) => p.id)

  // 이메일 검색 적용 (auth users에서 필터)
  const emailMap = (users ?? []).reduce<Record<string, string>>((acc, u) => {
    acc[u.id] = u.email ?? ''
    return acc
  }, {})

  const countByUser = (orderRows ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.user_id] = (acc[o.user_id] ?? 0) + 1
    return acc
  }, {})

  // 이메일로도 검색 (q가 '@' 포함 시)
  let customers = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap[p.id] ?? '',
    orderCount: countByUser[p.id] ?? 0,
  }))

  if (q && q.includes('@')) {
    customers = customers.filter((c) => c.email.toLowerCase().includes(q.toLowerCase()))
  }

  const spRecord: Record<string, string> = {}
  if (q) spRecord.q = q
  if (dateFrom) spRecord.from = dateFrom
  if (dateTo) spRecord.to = dateTo

  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>고객 관리</h1>

      {/* 검색/필터 폼 */}
      <form method="get" className="flex flex-wrap gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="이름 / 이메일 검색"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white"
          style={{ color: '#1C1C1C', minWidth: 200 }}
        />
        <input type="date" name="from" defaultValue={dateFrom}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none" style={{ color: '#1C1C1C' }} />
        <span className="self-center text-sm" style={{ color: '#1C1C1C' }}>~</span>
        <input type="date" name="to" defaultValue={dateTo}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none" style={{ color: '#1C1C1C' }} />
        <button type="submit" className="px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>
          검색
        </button>
        {(q || dateFrom || dateTo) && (
          <a href="/admin/customers" className="px-4 py-2 rounded-xl text-sm border border-gray-200" style={{ color: '#1C1C1C' }}>
            초기화
          </a>
        )}
      </form>

      {/* 고객 목록 테이블 */}
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
              <td colSpan={4} className="py-12 text-center text-sm" style={{ color: '#1C1C1C' }}>
                {q || dateFrom || dateTo ? '검색 결과가 없습니다.' : '회원이 없습니다.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination page={page} totalCount={totalCount ?? 0} pageSize={PAGE_SIZE} searchParams={spRecord} />
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

`/admin/customers` → 이름 검색 확인  
이메일(`@` 포함) 검색 → 필터링 확인  
가입일 날짜 범위 필터 확인  
페이지네이션 확인 (회원 20명 이상일 때)

- [ ] **Step 3: 타입 체크 + 커밋**

```bash
cd apps/web && npx tsc --noEmit
git add "apps/web/app/(admin)/admin/customers/page.tsx"
git commit -m "feat: customers admin with search/filter/pagination"
```
