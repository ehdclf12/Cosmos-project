# Order System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Goods 상세 페이지에서 장바구니에 담고, Checkout 페이지에서 주문을 완료하며, 마이페이지 주문 내역 탭에서 조회할 수 있게 한다.

**Architecture:** Zustand + localStorage 장바구니(클라이언트 전용), Supabase `orders` / `order_items` 테이블에 주문 저장(Mock 결제), 서버 컴포넌트에서 인증·데이터 조회 후 클라이언트 컴포넌트에 위임하는 기존 패턴을 따른다.

**Tech Stack:** Next.js 16 (App Router), Supabase (SSR + browser client), Zustand v5, TypeScript, Tailwind CSS

---

## File Map

| 상태 | 경로 | 역할 |
|------|------|------|
| 수동 SQL | Supabase 대시보드 | orders + order_items 테이블 + RLS |
| 생성 | `apps/web/lib/cart-store.ts` | Zustand 장바구니 스토어 (persist) |
| 생성 | `apps/web/app/goods/_components/AddToCartButton.tsx` | 상품 담기 버튼 (클라이언트) |
| 수정 | `apps/web/app/goods/[id]/page.tsx` | AddToCartButton 추가 |
| 수정 | `apps/web/app/landing/LandingHeader.tsx` | 장바구니 아이콘 + 뱃지 |
| 생성 | `apps/web/app/checkout/page.tsx` | Checkout 서버 래퍼 (인증 체크) |
| 생성 | `apps/web/app/checkout/_components/CheckoutForm.tsx` | 주문 폼 클라이언트 컴포넌트 |
| 생성 | `apps/web/app/orders/[id]/page.tsx` | 주문 완료 확인 페이지 |
| 생성 | `apps/web/app/mypage/orders/page.tsx` | 마이페이지 주문 내역 탭 |
| 수정 | `apps/web/app/mypage/_components/MypageSidebar.tsx` | "주문 내역" 탭 추가 |

---

## Task 1: Supabase SQL 마이그레이션 (수동)

**Files:**
- 없음 (Supabase 대시보드에서 직접 실행)

- [ ] **Step 1: Supabase SQL 에디터에서 아래 SQL 실행**

```sql
-- orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'paid'
    check (status in ('paid', 'cancelled')),
  total_amount integer not null,
  recipient_name text not null,
  recipient_phone text not null,
  shipping_address text not null,
  memo text,
  created_at timestamptz default now()
);

-- order_items
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  goods_id uuid references goods(id) on delete set null,
  title text not null,
  price integer not null,
  image_url text,
  quantity integer not null default 1,
  created_at timestamptz default now()
);

-- RLS
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "orders_select_own" on orders
  for select using (auth.uid() = user_id);
create policy "orders_insert_own" on orders
  for insert with check (auth.uid() = user_id);

create policy "order_items_select_own" on order_items
  for select using (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );
create policy "order_items_insert_own" on order_items
  for insert with check (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );
```

- [ ] **Step 2: 확인**

Supabase 대시보드 → Table Editor에서 `orders`, `order_items` 테이블이 생성됐는지 확인한다.

---

## Task 2: Zustand 설치

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: zustand 설치**

```bash
cd /Users/cosmos/Desktop/Cosmos && pnpm add zustand --filter web
```

Expected: `apps/web/package.json`의 dependencies에 `"zustand": "^5.x.x"` 추가됨

- [ ] **Step 2: 커밋**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add zustand dependency"
```

---

## Task 3: Cart Store 생성

**Files:**
- Create: `apps/web/lib/cart-store.ts`

- [ ] **Step 1: 파일 생성**

`apps/web/lib/cart-store.ts`:

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartItem {
  goodsId: string
  title: string
  price: number
  imageUrl: string | null
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (goodsId: string) => void
  updateQuantity: (goodsId: string, quantity: number) => void
  clear: () => void
  totalAmount: () => number
  totalCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.goodsId === item.goodsId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.goodsId === item.goodsId ? { ...i, quantity: i.quantity + 1 } : i
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity: 1 }] }
        }),

      removeItem: (goodsId) =>
        set((state) => ({ items: state.items.filter((i) => i.goodsId !== goodsId) })),

      updateQuantity: (goodsId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.goodsId !== goodsId)
              : state.items.map((i) => (i.goodsId === goodsId ? { ...i, quantity } : i)),
        })),

      clear: () => set({ items: [] }),

      totalAmount: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'cosmos-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/lib/cart-store.ts
git commit -m "feat: add zustand cart store with localStorage persistence"
```

---

## Task 4: AddToCartButton 컴포넌트

**Files:**
- Create: `apps/web/app/goods/_components/AddToCartButton.tsx`

- [ ] **Step 1: 파일 생성**

`apps/web/app/goods/_components/AddToCartButton.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/cart-store'

interface Props {
  goodsId: string
  title: string
  price: number
  imageUrl: string | null
}

export default function AddToCartButton({ goodsId, title, price, imageUrl }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)
  const router = useRouter()

  function handleAdd() {
    addItem({ goodsId, title, price, imageUrl })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleAdd}
        className="w-full py-3 text-sm tracking-wide text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#1C1C1C' }}
      >
        {added ? '담겼습니다 ✓' : '장바구니 담기'}
      </button>
      {added && (
        <button
          onClick={() => router.push('/checkout')}
          className="w-full py-3 text-sm tracking-wide border transition-colors hover:bg-black hover:text-white"
          style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
        >
          바로 결제하기 →
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/app/goods/_components/AddToCartButton.tsx
git commit -m "feat: add AddToCartButton component"
```

---

## Task 5: Goods 상세 페이지에 AddToCartButton 추가

**Files:**
- Modify: `apps/web/app/goods/[id]/page.tsx`

- [ ] **Step 1: import 추가 및 버튼 삽입**

파일 상단 import 목록에 추가:

```tsx
import AddToCartButton from '../_components/AddToCartButton'
```

`WishlistButton` 렌더링 블록을 아래로 교체 (기존 `item.status === 'available'` 분기 부분):

```tsx
{item.status === 'available' ? (
  <div className="flex flex-col gap-3">
    <AddToCartButton
      goodsId={item.id}
      title={item.title}
      price={item.price}
      imageUrl={item.images[0] ?? null}
    />
    <WishlistButton goodsId={item.id} initialWished={isWished} />
  </div>
) : (
  <span className="text-sm tracking-widest uppercase" style={{ color: '#A8A49C' }}>
    Sold Out
  </span>
)}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/app/goods/\[id\]/page.tsx
git commit -m "feat: add AddToCartButton to goods detail page"
```

---

## Task 6: LandingHeader 장바구니 아이콘 추가

**Files:**
- Modify: `apps/web/app/landing/LandingHeader.tsx`

- [ ] **Step 1: 파일 전체를 아래로 교체**

`apps/web/app/landing/LandingHeader.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCartStore } from '@/lib/cart-store'

interface Props {
  onMenuClick: () => void
  nickname: string | null
  onLogout: () => void
}

export default function LandingHeader({ onMenuClick, nickname, onLogout }: Props) {
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    setCartCount(useCartStore.getState().totalCount())
    return useCartStore.subscribe((state) => setCartCount(state.totalCount()))
  }, [])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14"
      style={{ backgroundColor: '#F2F1EE' }}
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex flex-col gap-1.5 p-1"
          style={{ color: '#1C1C1C' }}
        >
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
        </button>
        <Link href="/" className="text-sm font-light tracking-widest" style={{ color: '#1C1C1C' }}>
          COSMOS
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* 장바구니 아이콘 */}
        <Link
          href="/checkout"
          className="relative flex items-center justify-center w-8 h-8 transition-opacity hover:opacity-60"
          aria-label="장바구니"
          style={{ color: '#1C1C1C' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {cartCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center"
              style={{ backgroundColor: '#1C1C1C', fontSize: '9px' }}
            >
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </Link>

        {nickname ? (
          <>
            <Link
              href="/mypage"
              className="text-xs tracking-widest uppercase px-4 py-2 border transition-colors hover:bg-black hover:text-white"
              style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
            >
              {nickname}
            </Link>
            <button
              onClick={onLogout}
              className="text-xs tracking-widest uppercase px-4 py-2 text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#1C1C1C' }}
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-xs tracking-widest uppercase px-4 py-2 border transition-colors hover:bg-black hover:text-white"
              style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="text-xs tracking-widest uppercase px-4 py-2 text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#1C1C1C' }}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/app/landing/LandingHeader.tsx
git commit -m "feat: add cart icon with badge to landing header"
```

---

## Task 7: Checkout 페이지

**Files:**
- Create: `apps/web/app/checkout/page.tsx`
- Create: `apps/web/app/checkout/_components/CheckoutForm.tsx`

- [ ] **Step 1: CheckoutForm.tsx 생성**

`apps/web/app/checkout/_components/CheckoutForm.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCartStore, CartItem } from '@/lib/cart-store'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
}

export default function CheckoutForm({ userId }: Props) {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const totalAmount = useCartStore((s) => s.totalAmount())
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)

  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (items.length === 0) router.replace('/goods')
  }, [items.length, router])

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-black outline-none focus:border-gray-400 transition-colors'

  async function handleOrder() {
    setError('')
    if (!recipientName.trim()) { setError('수령인명을 입력해주세요.'); return }
    if (!recipientPhone.trim()) { setError('연락처를 입력해주세요.'); return }
    if (!shippingAddress.trim()) { setError('배송지를 입력해주세요.'); return }
    if (items.length === 0) { setError('장바구니가 비어있습니다.'); return }

    setLoading(true)
    const supabase = createClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status: 'paid',
        total_amount: totalAmount,
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        shipping_address: shippingAddress.trim(),
        memo: memo.trim() || null,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      setError('주문 처리 중 오류가 발생했습니다.')
      setLoading(false)
      return
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      items.map((item: CartItem) => ({
        order_id: order.id,
        goods_id: item.goodsId,
        title: item.title,
        price: item.price,
        image_url: item.imageUrl,
        quantity: item.quantity,
      }))
    )

    if (itemsError) {
      setError('주문 항목 저장 중 오류가 발생했습니다.')
      setLoading(false)
      return
    }

    clear()
    router.push(`/orders/${order.id}`)
  }

  if (items.length === 0) return null

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <main className="pt-20 px-6 md:px-12 pb-20 max-w-4xl mx-auto">
        <div className="py-10 border-b mb-10" style={{ borderColor: '#E8E5E0' }}>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#A8A49C' }}>Cosmos</p>
          <h1 className="text-2xl font-light tracking-widest" style={{ color: '#1C1C1C' }}>CHECKOUT</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-12">
          {/* 좌: 주문 폼 */}
          <div className="flex-1">
            <h2 className="text-sm tracking-widest uppercase mb-6" style={{ color: '#6B6862' }}>
              배송 정보
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>수령인명</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className={inputClass}
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>연락처</label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className={inputClass}
                  placeholder="010-0000-0000"
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>배송지</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className={inputClass}
                  placeholder="서울특별시 마포구 ..."
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>메모 (선택)</label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className={inputClass}
                  placeholder="배송 메모를 입력해주세요"
                />
              </div>
            </div>

            {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

            <button
              onClick={handleOrder}
              disabled={loading}
              className="w-full mt-8 py-4 text-sm tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#1C1C1C' }}
            >
              {loading ? '처리 중...' : `₩${totalAmount.toLocaleString()} 주문하기`}
            </button>
          </div>

          {/* 우: 장바구니 요약 */}
          <div className="w-full md:w-80">
            <h2 className="text-sm tracking-widest uppercase mb-6" style={{ color: '#6B6862' }}>
              주문 상품 ({items.length})
            </h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.goodsId} className="flex gap-3">
                  <div
                    className="relative w-16 h-20 shrink-0 overflow-hidden"
                    style={{ backgroundColor: '#E8E5E0' }}
                  >
                    {item.imageUrl && (
                      <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2 mb-1" style={{ color: '#1C1C1C' }}>{item.title}</p>
                    <p className="text-xs mb-2" style={{ color: '#6B6862' }}>
                      ₩{item.price.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.goodsId, item.quantity - 1)}
                        className="w-6 h-6 border flex items-center justify-center text-xs transition-colors hover:bg-black hover:text-white"
                        style={{ borderColor: '#E8E5E0', color: '#1C1C1C' }}
                      >
                        −
                      </button>
                      <span className="text-xs w-4 text-center" style={{ color: '#1C1C1C' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.goodsId, item.quantity + 1)}
                        className="w-6 h-6 border flex items-center justify-center text-xs transition-colors hover:bg-black hover:text-white"
                        style={{ borderColor: '#E8E5E0', color: '#1C1C1C' }}
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.goodsId)}
                        className="ml-2 text-xs transition-opacity hover:opacity-60"
                        style={{ color: '#A8A49C' }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t" style={{ borderColor: '#E8E5E0' }}>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#6B6862' }}>합계</span>
                <span className="text-base font-medium" style={{ color: '#1C1C1C' }}>
                  ₩{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: checkout/page.tsx 생성**

`apps/web/app/checkout/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingClient from '@/app/landing/LandingClient'
import CheckoutForm from './_components/CheckoutForm'

export default async function CheckoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <LandingClient />
      <CheckoutForm userId={user.id} />
    </>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/web/app/checkout/
git commit -m "feat: add checkout page with order form"
```

---

## Task 8: 주문 완료 확인 페이지

**Files:**
- Create: `apps/web/app/orders/[id]/page.tsx`

- [ ] **Step 1: 파일 생성**

`apps/web/app/orders/[id]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import LandingClient from '@/app/landing/LandingClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const shortId = order.id.slice(0, 8).toUpperCase()
  const orderDate = new Date(order.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />

      <main className="pt-20 px-6 md:px-12 pb-20 max-w-2xl mx-auto">
        {/* 완료 헤더 */}
        <div className="py-10 text-center border-b mb-10" style={{ borderColor: '#E8E5E0' }}>
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#A8A49C' }}>
            Order Confirmed
          </p>
          <h1 className="text-2xl font-light tracking-widest mb-2" style={{ color: '#1C1C1C' }}>
            주문이 완료되었습니다
          </h1>
          <p className="text-sm" style={{ color: '#6B6862' }}>
            주문번호: {shortId} · {orderDate}
          </p>
        </div>

        {/* 주문 상품 */}
        <section className="mb-10">
          <h2 className="text-xs tracking-widest uppercase mb-6" style={{ color: '#A8A49C' }}>
            주문 상품
          </h2>
          <div className="space-y-4">
            {order.order_items.map((item: { id: string; title: string; price: number; quantity: number; image_url: string | null }) => (
              <div key={item.id} className="flex gap-4 items-center">
                <div
                  className="relative w-14 h-18 shrink-0 overflow-hidden"
                  style={{ backgroundColor: '#E8E5E0', height: '72px' }}
                >
                  {item.image_url && (
                    <Image src={item.image_url} alt={item.title} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm mb-1" style={{ color: '#1C1C1C' }}>{item.title}</p>
                  <p className="text-xs" style={{ color: '#6B6862' }}>
                    ₩{item.price.toLocaleString()} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-medium" style={{ color: '#1C1C1C' }}>
                  ₩{(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 합계 */}
        <div className="border-t pt-4 mb-10" style={{ borderColor: '#E8E5E0' }}>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: '#6B6862' }}>총 결제금액</span>
            <span className="text-base font-medium" style={{ color: '#1C1C1C' }}>
              ₩{order.total_amount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 배송지 */}
        <section className="mb-10 p-5 rounded-xl" style={{ backgroundColor: '#E8E5E0' }}>
          <h2 className="text-xs tracking-widest uppercase mb-3" style={{ color: '#A8A49C' }}>
            배송 정보
          </h2>
          <p className="text-sm mb-1" style={{ color: '#1C1C1C' }}>{order.recipient_name}</p>
          <p className="text-sm mb-1" style={{ color: '#6B6862' }}>{order.recipient_phone}</p>
          <p className="text-sm" style={{ color: '#6B6862' }}>{order.shipping_address}</p>
          {order.memo && (
            <p className="text-xs mt-2" style={{ color: '#A8A49C' }}>{order.memo}</p>
          )}
        </section>

        {/* 액션 버튼 */}
        <div className="flex gap-4">
          <Link
            href="/goods"
            className="flex-1 py-3 text-center text-sm border transition-colors hover:bg-black hover:text-white"
            style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
          >
            계속 쇼핑하기
          </Link>
          <Link
            href="/mypage/orders"
            className="flex-1 py-3 text-center text-sm text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1C1C1C' }}
          >
            주문 내역 보기
          </Link>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/app/orders/
git commit -m "feat: add order confirmation page"
```

---

## Task 9: Mypage 주문 내역 탭

**Files:**
- Create: `apps/web/app/mypage/orders/page.tsx`

- [ ] **Step 1: 파일 생성**

`apps/web/app/mypage/orders/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function MyOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total_amount, created_at, order_items(id, title, quantity)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const rows = orders ?? []

  const STATUS_LABEL: Record<string, string> = {
    paid: '결제 완료',
    cancelled: '취소됨',
  }

  return (
    <div>
      <h2 className="text-xl font-light mb-8" style={{ color: '#1C1C1C' }}>주문 내역</h2>

      {rows.length === 0 ? (
        <div>
          <p className="text-sm mb-4" style={{ color: '#A8A49C' }}>주문 내역이 없습니다.</p>
          <Link
            href="/goods"
            className="text-xs tracking-widest uppercase underline underline-offset-4"
            style={{ color: '#1C1C1C' }}
          >
            쇼핑하러 가기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((order) => {
            const items = order.order_items ?? []
            const firstTitle = items[0]?.title ?? '상품'
            const extraCount = items.length - 1
            const label = extraCount > 0 ? `${firstTitle} 외 ${extraCount}건` : firstTitle
            const orderDate = new Date(order.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block p-5 rounded-xl transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#E8E5E0' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#A8A49C' }}>
                      {orderDate} · {order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-sm font-light" style={{ color: '#1C1C1C' }}>{label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium mb-1" style={{ color: '#1C1C1C' }}>
                      ₩{order.total_amount.toLocaleString()}
                    </p>
                    <p className="text-xs" style={{ color: '#6B6862' }}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/app/mypage/orders/page.tsx
git commit -m "feat: add orders list page to mypage"
```

---

## Task 10: MypageSidebar에 주문 내역 탭 추가

**Files:**
- Modify: `apps/web/app/mypage/_components/MypageSidebar.tsx`

- [ ] **Step 1: NAV 배열에 주문 내역 항목 추가**

`apps/web/app/mypage/_components/MypageSidebar.tsx`에서 `NAV` 배열을 아래로 교체:

```tsx
const NAV = [
  { href: '/mypage', label: '프로필 수정', group: '내 정보' },
  { href: '/mypage/orders', label: '주문 내역', group: '쇼핑' },
  { href: '/mypage/wishlist', label: '찜한 상품', group: null },
  { href: '/mypage/clubs', label: '가입한 클럽', group: '활동' },
  { href: '/mypage/books', label: '읽은 책', group: null },
]
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/app/mypage/_components/MypageSidebar.tsx
git commit -m "feat: add orders tab to mypage sidebar"
```

---

## Task 11: 빌드 확인 및 동작 검증

- [ ] **Step 1: 빌드 실행**

```bash
cd /Users/cosmos/Desktop/Cosmos/apps/web && export PATH="$HOME/.local/node/bin:$PATH" && npx next build
```

Expected: 타입 에러 없음, 빌드 성공

- [ ] **Step 2: 개발 서버 실행 후 확인 항목**

```bash
cd /Users/cosmos/Desktop/Cosmos && pnpm dev
```

| 항목 | 확인 방법 |
|------|-----------|
| 헤더 장바구니 아이콘 표시 | 메인 페이지 접속 |
| Goods 상세에 "장바구니 담기" 버튼 표시 | `/goods/[id]` 접속 |
| 담기 클릭 후 헤더 뱃지 +1 | 버튼 클릭 |
| "바로 결제하기" 버튼 클릭 시 `/checkout` 이동 | 버튼 클릭 |
| 비로그인 `/checkout` 접근 시 `/login` 리다이렉트 | 로그아웃 후 접속 |
| 로그인 후 체크아웃 폼 + 장바구니 요약 표시 | 로그인 후 `/checkout` |
| 수량 +/- 버튼 동작 | 체크아웃 페이지 |
| 주문하기 클릭 후 `/orders/[id]` 이동 | 폼 작성 후 클릭 |
| 주문 완료 페이지에 상품·배송지·금액 표시 | 주문 완료 후 |
| 장바구니 비워짐 (헤더 뱃지 0) | 주문 완료 후 |
| `/mypage/orders`에 주문 목록 표시 | 마이페이지 → 주문 내역 |

- [ ] **Step 3: 최종 푸시**

```bash
git push origin main
```
