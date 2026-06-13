# Admin Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully protected admin area at `/admin` with goods CRUD, order status management, and customer info viewing.

**Architecture:** Route group `(admin)` inside `apps/web/app/` with its own layout. `middleware.ts` protects all `/admin/*` routes by checking `app_metadata.role === 'admin'` from the JWT. Login page redirects admin users to `/admin` after sign-in. Server components handle read-only pages; client components handle mutations. Supabase admin client (service role) fetches auth user emails for customer management.

**Tech Stack:** Next.js 15 App Router, Supabase SSR (`@supabase/ssr`), Supabase JS (`@supabase/supabase-js`), Tailwind CSS

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/002_admin_rls.sql` | `is_admin()` helper + admin RLS policies |
| Create | `apps/web/lib/supabase/admin-client.ts` | Service-role Supabase client for `auth.admin.*` |
| Create | `apps/web/middleware.ts` | Protect `/admin/*` routes |
| Modify | `apps/web/app/(auth)/login/page.tsx` | Redirect admin users to `/admin` after login |
| Create | `apps/web/app/(admin)/layout.tsx` | Admin root layout |
| Create | `apps/web/app/(admin)/_components/AdminSidebar.tsx` | Sidebar nav (client) |
| Create | `apps/web/app/(admin)/admin/page.tsx` | Dashboard: stats + recent orders |
| Create | `apps/web/app/(admin)/admin/goods/page.tsx` | Goods list table |
| Create | `apps/web/app/(admin)/admin/goods/_components/DeleteGoodsButton.tsx` | Inline delete button (client) |
| Create | `apps/web/app/(admin)/admin/goods/_components/GoodsForm.tsx` | Shared create/edit form (client) |
| Create | `apps/web/app/(admin)/admin/goods/new/page.tsx` | Goods create page |
| Create | `apps/web/app/(admin)/admin/goods/[id]/edit/page.tsx` | Goods edit page |
| Create | `apps/web/app/(admin)/admin/orders/page.tsx` | Orders table |
| Create | `apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx` | Inline status dropdown (client) |
| Create | `apps/web/app/(admin)/admin/customers/page.tsx` | Customer list |
| Create | `apps/web/app/(admin)/admin/customers/[id]/page.tsx` | Customer detail: orders + wishlist |

---

## Setup: Supabase Admin Account

Before any code, set the admin account role in Supabase:

- [ ] Supabase Dashboard → Authentication → Users → 관리자 계정 선택
- [ ] Edit → `app_metadata` 필드에 `{"role": "admin"}` 입력 → Save
- [ ] `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 추가 (Supabase Dashboard → Settings → API → service_role key)

---

## Task 1: DB Migration — is_admin() + RLS Policies

**Files:**
- Create: `supabase/migrations/002_admin_rls.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/002_admin_rls.sql

-- 관리자 role 확인 헬퍼 함수
create or replace function public.is_admin()
returns boolean as $$
  select (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
$$ language sql stable;

-- goods: 관리자 전체 접근 (insert, update, delete)
create policy "goods_admin_all" on public.goods
  using (public.is_admin()) with check (public.is_admin());

-- orders: 관리자 전체 조회
create policy "orders_admin_select" on public.orders
  for select using (public.is_admin());

-- orders: 관리자 상태 수정
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin());

-- profiles: 관리자 전체 조회
create policy "profiles_admin_select" on public.profiles
  for select using (public.is_admin());

-- goods_wishlist: 관리자 조회
create policy "goods_wishlist_admin_select" on public.goods_wishlist
  for select using (public.is_admin());
```

- [ ] **Step 2: Apply migration to Supabase**

Supabase Dashboard → SQL Editor에서 위 SQL을 실행하거나:
```bash
# Supabase CLI가 설정된 경우
npx supabase db push
```

- [ ] **Step 3: Verify**

Supabase Dashboard → Table Editor → goods 테이블에서 관리자 계정으로 로그인된 상태에서 Row 추가 시도 → 성공해야 함

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_admin_rls.sql
git commit -m "feat: add admin RLS policies and is_admin helper"
```

---

## Task 2: Supabase Admin Client

**Files:**
- Create: `apps/web/lib/supabase/admin-client.ts`

- [ ] **Step 1: Create admin client**

```typescript
// apps/web/lib/supabase/admin-client.ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}
```

> `SUPABASE_SERVICE_ROLE_KEY`는 서버 컴포넌트와 서버 사이드에서만 사용. 클라이언트 컴포넌트에서 절대 import 금지.

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/supabase/admin-client.ts
git commit -m "feat: add supabase admin client with service role"
```

---

## Task 3: Middleware — Protect /admin Routes

**Files:**
- Create: `apps/web/middleware.ts`

- [ ] **Step 1: Create middleware**

```typescript
// apps/web/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user.app_metadata?.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] **Step 2: Verify — 비로그인 상태로 /admin 접근**

브라우저에서 `/admin` 접근 → `/login`으로 리다이렉트 되어야 함

- [ ] **Step 3: Verify — 일반 유저로 /admin 접근**

일반 유저 계정으로 로그인 후 `/admin` 접근 → `/`으로 리다이렉트 되어야 함

- [ ] **Step 4: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat: add middleware to protect /admin routes"
```

---

## Task 4: Login Page — Admin Redirect

**Files:**
- Modify: `apps/web/app/(auth)/login/page.tsx:23`

- [ ] **Step 1: Update handleLogin to check role**

현재 코드:
```typescript
const { error } = await supabase.auth.signInWithPassword({ email, password })
setLoading(false)
if (error) {
  setError(error.message)
  return
}
router.push('/')
router.refresh()
```

변경 후:
```typescript
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
setLoading(false)
if (error) {
  setError(error.message)
  return
}
const isAdmin = data.user?.app_metadata?.role === 'admin'
router.push(isAdmin ? '/admin' : '/')
router.refresh()
```

- [ ] **Step 2: Verify — 관리자 로그인**

관리자 계정으로 로그인 → `/admin`으로 이동해야 함

- [ ] **Step 3: Verify — 일반 유저 로그인**

일반 유저로 로그인 → `/`으로 이동해야 함

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(auth)/login/page.tsx"
git commit -m "feat: redirect admin users to /admin after login"
```

---

## Task 5: Admin Layout + Sidebar

**Files:**
- Create: `apps/web/app/(admin)/layout.tsx`
- Create: `apps/web/app/(admin)/_components/AdminSidebar.tsx`

- [ ] **Step 1: Create AdminSidebar client component**

```tsx
// apps/web/app/(admin)/_components/AdminSidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/goods', label: '상품 관리' },
  { href: '/admin/orders', label: '주문 관리' },
  { href: '/admin/customers', label: '고객 관리' },
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
        style={{ color: '#A8A49C' }}
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
                color: active ? 'white' : '#6B6862',
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

- [ ] **Step 2: Create admin layout**

```tsx
// apps/web/app/(admin)/layout.tsx
import AdminSidebar from './_components/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F2F1EE' }}>
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(admin)"
git commit -m "feat: add admin layout and sidebar"
```

---

## Task 6: Dashboard Page

**Files:**
- Create: `apps/web/app/(admin)/admin/page.tsx`

- [ ] **Step 1: Create dashboard page**

```tsx
// apps/web/app/(admin)/admin/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: '대시보드 — Cosmos Admin' }

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: goodsCount },
    { count: paidCount },
    { count: cancelledCount },
    { count: customerCount },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('goods').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('orders')
      .select('id, status, total_amount, created_at, profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { label: '전체 상품', value: goodsCount ?? 0 },
    { label: '완료 주문', value: paidCount ?? 0, sub: `취소: ${cancelledCount ?? 0}건` },
    { label: '전체 회원', value: customerCount ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl font-light mb-8" style={{ color: '#1C1C1C' }}>대시보드</h1>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {stats.map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
            <p className="text-xs mb-1" style={{ color: '#A8A49C' }}>{label}</p>
            <p className="text-3xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
            {sub && <p className="text-xs mt-1" style={{ color: '#A8A49C' }}>{sub}</p>}
          </div>
        ))}
      </div>

      <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>최근 주문</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#A8A49C' }}>
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
              <td className="py-2" style={{ color: '#6B6862' }}>{order.id.slice(0, 8).toUpperCase()}</td>
              <td className="py-2" style={{ color: '#1C1C1C' }}>
                {(order.profiles as any)?.display_name ?? '-'}
              </td>
              <td className="py-2" style={{ color: '#1C1C1C' }}>{order.total_amount.toLocaleString()}원</td>
              <td className="py-2" style={{ color: order.status === 'paid' ? '#1C1C1C' : '#A8A49C' }}>
                {order.status === 'paid' ? '결제 완료' : '취소됨'}
              </td>
              <td className="py-2" style={{ color: '#6B6862' }}>
                {new Date(order.created_at).toLocaleDateString('ko-KR')}
              </td>
            </tr>
          ))}
          {(recentOrders ?? []).length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm" style={{ color: '#A8A49C' }}>주문이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

`/admin`에서 카드 3개와 최근 주문 테이블이 보여야 함

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(admin)/admin/page.tsx"
git commit -m "feat: add admin dashboard page"
```

---

## Task 7: Goods List Page

**Files:**
- Create: `apps/web/app/(admin)/admin/goods/page.tsx`
- Create: `apps/web/app/(admin)/admin/goods/_components/DeleteGoodsButton.tsx`

- [ ] **Step 1: Create DeleteGoodsButton client component**

```tsx
// apps/web/app/(admin)/admin/goods/_components/DeleteGoodsButton.tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DeleteGoodsButton({ id }: { id: string }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('goods').delete().eq('id', id)
    router.refresh()
  }

  return (
    <button onClick={handleDelete} className="text-xs hover:opacity-70" style={{ color: '#A8A49C' }}>
      삭제
    </button>
  )
}
```

- [ ] **Step 2: Create goods list page**

```tsx
// apps/web/app/(admin)/admin/goods/page.tsx
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
    .select('id, title, price, status, images, categories(name)')
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
          <tr className="text-left" style={{ color: '#A8A49C' }}>
            <th className="pb-2 font-normal w-12">이미지</th>
            <th className="pb-2 font-normal">상품명</th>
            <th className="pb-2 font-normal">가격</th>
            <th className="pb-2 font-normal">카테고리</th>
            <th className="pb-2 font-normal">상태</th>
            <th className="pb-2 font-normal w-20"></th>
          </tr>
        </thead>
        <tbody>
          {(goods ?? []).map((item) => (
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
              <td className="py-3" style={{ color: '#1C1C1C' }}>{item.title}</td>
              <td className="py-3" style={{ color: '#6B6862' }}>{item.price.toLocaleString()}원</td>
              <td className="py-3" style={{ color: '#6B6862' }}>
                {(item.categories as any)?.name ?? '-'}
              </td>
              <td className="py-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: item.status === 'active' ? '#E8E5E0' : '#F2F1EE',
                    color: item.status === 'active' ? '#1C1C1C' : '#A8A49C',
                  }}
                >
                  {STATUS_LABEL[item.status] ?? item.status}
                </span>
              </td>
              <td className="py-3">
                <div className="flex gap-3">
                  <Link href={`/admin/goods/${item.id}/edit`} className="text-xs hover:opacity-70" style={{ color: '#6B6862' }}>
                    수정
                  </Link>
                  <DeleteGoodsButton id={item.id} />
                </div>
              </td>
            </tr>
          ))}
          {(goods ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-sm" style={{ color: '#A8A49C' }}>
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

- [ ] **Step 3: Verify**

`/admin/goods`에서 상품 목록 테이블이 보이고 삭제 버튼 클릭 시 행이 사라져야 함

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(admin)/admin/goods"
git commit -m "feat: add admin goods list with delete"
```

---

## Task 8: Goods Form — Shared Component

**Files:**
- Create: `apps/web/app/(admin)/admin/goods/_components/GoodsForm.tsx`

- [ ] **Step 1: Create shared GoodsForm component**

```tsx
// apps/web/app/(admin)/admin/goods/_components/GoodsForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Category { id: string; name: string }

interface GoodsFormProps {
  categories: Category[]
  initial?: {
    id: string
    title: string
    description: string | null
    price: number
    original_price: number | null
    images: string[]
    status: 'active' | 'sold_out' | 'draft'
    category_id: string | null
  }
}

export default function GoodsForm({ categories, initial }: GoodsFormProps) {
  const router = useRouter()
  const isEdit = !!initial?.id
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    price: initial?.price?.toString() ?? '',
    original_price: initial?.original_price?.toString() ?? '',
    images: (initial?.images ?? []).join('\n'),
    status: initial?.status ?? 'draft' as 'active' | 'sold_out' | 'draft',
    category_id: initial?.category_id ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
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
      original_price: form.original_price ? Number(form.original_price) : null,
      images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
      status: form.status,
      category_id: form.category_id || null,
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
  const lbl = "block text-xs mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <label className={lbl} style={{ color: '#A8A49C' }}>상품명 *</label>
        <input value={form.title} onChange={(e) => set('title', e.target.value)} className={field} required />
      </div>

      <div>
        <label className={lbl} style={{ color: '#A8A49C' }}>설명</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} className={field} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>가격 *</label>
          <input
            type="number" value={form.price}
            onChange={(e) => set('price', e.target.value)}
            className={field} required min={0}
          />
        </div>
        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>원가</label>
          <input
            type="number" value={form.original_price}
            onChange={(e) => set('original_price', e.target.value)}
            className={field} min={0}
          />
        </div>
      </div>

      <div>
        <label className={lbl} style={{ color: '#A8A49C' }}>카테고리</label>
        <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} className={field}>
          <option value="">카테고리 없음</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className={lbl} style={{ color: '#A8A49C' }}>이미지 URL (줄바꿈으로 구분)</label>
        <textarea
          value={form.images}
          onChange={(e) => set('images', e.target.value)}
          className={field} rows={3}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div>
        <label className={lbl} style={{ color: '#A8A49C' }}>상태</label>
        <select value={form.status} onChange={(e) => set('status', e.target.value)} className={field}>
          <option value="draft">임시저장</option>
          <option value="active">판매중</option>
          <option value="sold_out">품절</option>
        </select>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button" onClick={() => router.push('/admin/goods')}
          className="flex-1 py-3 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
          style={{ color: '#6B6862' }}
        >
          취소
        </button>
        <button
          type="submit" disabled={loading}
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

- [ ] **Step 2: Commit**

```bash
git add "apps/web/app/(admin)/admin/goods/_components/GoodsForm.tsx"
git commit -m "feat: add shared GoodsForm component"
```

---

## Task 9: Goods New + Edit Pages

**Files:**
- Create: `apps/web/app/(admin)/admin/goods/new/page.tsx`
- Create: `apps/web/app/(admin)/admin/goods/[id]/edit/page.tsx`

- [ ] **Step 1: Create goods new page**

```tsx
// apps/web/app/(admin)/admin/goods/new/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import GoodsForm from '../_components/GoodsForm'

export const metadata: Metadata = { title: '상품 등록 — Cosmos Admin' }

export default async function AdminGoodsNewPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>상품 등록</h1>
      <GoodsForm categories={categories ?? []} />
    </div>
  )
}
```

- [ ] **Step 2: Create goods edit page**

```tsx
// apps/web/app/(admin)/admin/goods/[id]/edit/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GoodsForm from '../../_components/GoodsForm'

export const metadata: Metadata = { title: '상품 수정 — Cosmos Admin' }

interface Props { params: Promise<{ id: string }> }

export default async function AdminGoodsEditPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: item }, { data: categories }] = await Promise.all([
    supabase
      .from('goods')
      .select('id, title, description, price, original_price, images, status, category_id')
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
          original_price: item.original_price,
          images: (item.images as string[]) ?? [],
          status: item.status as 'active' | 'sold_out' | 'draft',
          category_id: item.category_id,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verify**

`/admin/goods/new` → 폼 작성 후 등록 → `/admin/goods`로 이동하고 목록에 새 상품이 보여야 함
`/admin/goods/{id}/edit` → 기존 값이 채워진 폼 확인 → 수정 후 저장 → 목록에서 변경 확인

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(admin)/admin/goods/new" "apps/web/app/(admin)/admin/goods/[id]"
git commit -m "feat: add goods create and edit pages"
```

---

## Task 10: Orders Management Page

**Files:**
- Create: `apps/web/app/(admin)/admin/orders/page.tsx`
- Create: `apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx`

- [ ] **Step 1: Create OrderStatusSelect client component**

```tsx
// apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function OrderStatusSelect({ id, status }: { id: string; status: string }) {
  const [value, setValue] = useState(status)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    setValue(next)
    const supabase = createClient()
    await supabase.from('orders').update({ status: next }).eq('id', id)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none cursor-pointer"
      style={{ color: '#1C1C1C' }}
    >
      <option value="paid">결제 완료</option>
      <option value="cancelled">취소됨</option>
    </select>
  )
}
```

- [ ] **Step 2: Create orders page**

```tsx
// apps/web/app/(admin)/admin/orders/page.tsx
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
          <tr className="text-left" style={{ color: '#A8A49C' }}>
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
                <td className="py-3" style={{ color: '#6B6862' }}>{order.id.slice(0, 8).toUpperCase()}</td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {(order.profiles as any)?.display_name ?? '-'}
                </td>
                <td className="py-3 max-w-xs truncate" style={{ color: '#6B6862' }}>{itemLabel || '-'}</td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>{order.total_amount.toLocaleString()}원</td>
                <td className="py-3">
                  <OrderStatusSelect id={order.id} status={order.status} />
                </td>
                <td className="py-3" style={{ color: '#6B6862' }}>
                  {new Date(order.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            )
          })}
          {(orders ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-sm" style={{ color: '#A8A49C' }}>주문이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Verify**

`/admin/orders`에서 주문 목록이 보이고 상태 드롭다운 변경 시 DB에 반영되어야 함 (페이지 새로고침 후 값 유지 확인)

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(admin)/admin/orders"
git commit -m "feat: add admin orders page with inline status update"
```

---

## Task 11: Customer List Page

**Files:**
- Create: `apps/web/app/(admin)/admin/customers/page.tsx`

> `createAdminClient()`는 서버 컴포넌트에서만 사용. `SUPABASE_SERVICE_ROLE_KEY`가 `.env.local`에 있어야 함.

- [ ] **Step 1: Create customers list page**

```tsx
// apps/web/app/(admin)/admin/customers/page.tsx
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
          <tr className="text-left" style={{ color: '#A8A49C' }}>
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
              <td className="py-3" style={{ color: '#6B6862' }}>{c.email}</td>
              <td className="py-3" style={{ color: '#6B6862' }}>
                {new Date(c.created_at).toLocaleDateString('ko-KR')}
              </td>
              <td className="py-3" style={{ color: '#6B6862' }}>{c.orderCount}건</td>
            </tr>
          ))}
          {customers.length === 0 && (
            <tr>
              <td colSpan={4} className="py-12 text-center text-sm" style={{ color: '#A8A49C' }}>회원이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

`/admin/customers`에서 회원 목록과 이메일이 표시되어야 함. 이름 클릭 시 상세 페이지로 이동.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(admin)/admin/customers/page.tsx"
git commit -m "feat: add admin customer list page"
```

---

## Task 12: Customer Detail Page

**Files:**
- Create: `apps/web/app/(admin)/admin/customers/[id]/page.tsx`

- [ ] **Step 1: Create customer detail page**

```tsx
// apps/web/app/(admin)/admin/customers/[id]/page.tsx
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
      <Link href="/admin/customers" className="text-xs mb-6 inline-block hover:opacity-70" style={{ color: '#A8A49C' }}>
        ← 고객 목록
      </Link>

      <h1 className="text-2xl font-light mb-1" style={{ color: '#1C1C1C' }}>{profile.display_name}</h1>
      <p className="text-sm mb-8" style={{ color: '#6B6862' }}>
        {authUser?.email ?? ''} · 가입일 {new Date(profile.created_at).toLocaleDateString('ko-KR')}
      </p>

      <section className="mb-10">
        <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>
          주문 내역 ({orders?.length ?? 0}건)
        </h2>
        {(orders ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: '#A8A49C' }}>주문 내역이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: '#A8A49C' }}>
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
                    <td className="py-2" style={{ color: '#6B6862' }}>{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="py-2 max-w-xs truncate" style={{ color: '#6B6862' }}>
                      {items.map((i) => `${i.title} x${i.quantity}`).join(', ') || '-'}
                    </td>
                    <td className="py-2" style={{ color: '#1C1C1C' }}>{order.total_amount.toLocaleString()}원</td>
                    <td className="py-2" style={{ color: order.status === 'paid' ? '#1C1C1C' : '#A8A49C' }}>
                      {order.status === 'paid' ? '결제 완료' : '취소됨'}
                    </td>
                    <td className="py-2" style={{ color: '#6B6862' }}>
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
          <p className="text-sm" style={{ color: '#A8A49C' }}>위시리스트가 비어있습니다.</p>
        ) : (
          <div className="space-y-2">
            {wishlistGoods.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl p-3"
                style={{ backgroundColor: '#E8E5E0' }}
              >
                <span className="text-sm" style={{ color: '#1C1C1C' }}>{item.title}</span>
                <span className="text-sm" style={{ color: '#6B6862' }}>{item.price.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

`/admin/customers/{id}` 에서 회원 이름, 이메일, 주문 내역, 위시리스트가 보여야 함

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(admin)/admin/customers/[id]"
git commit -m "feat: add customer detail page with orders and wishlist"
```

---

## Final Verification

- [ ] 관리자 로그인 → `/admin` 대시보드 진입 확인
- [ ] 일반 유저 로그인 → `/admin` 접근 시 `/`로 리다이렉트 확인
- [ ] 비로그인 상태 `/admin` 접근 시 `/login` 리다이렉트 확인
- [ ] 상품 등록 → 목록에 표시 확인
- [ ] 상품 수정 → 기존 값 채워진 폼 확인
- [ ] 상품 삭제 → 목록에서 사라짐 확인
- [ ] 주문 상태 변경 → 새로고침 후 값 유지 확인
- [ ] 고객 목록 → 이메일 표시 확인
- [ ] 고객 상세 → 주문 내역 + 위시리스트 확인
