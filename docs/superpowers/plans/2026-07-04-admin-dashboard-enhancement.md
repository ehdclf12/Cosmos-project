# 관리자 대시보드 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin` 대시보드를 기간 토글(오늘/7일/30일)로 재계산되는 커머스 KPI + 추세/랭킹/상태분포 + 운영 신호(재고·대기주문) 대시보드로 강화한다.

**Architecture:** 순수 계산 로직(기간 경계·증감%·일별 버킷·Top-N)은 `@cosmos/shared`에 두고 jest로 TDD. `apps/web/lib/admin-dashboard.ts`가 순수 함수 + Supabase 쿼리를 조합해 `getDashboardData(range)`를 제공. 프레젠테이션은 순수 CSS/SVG 컴포넌트로 분리하고 서버 컴포넌트 `page.tsx`가 `?range=` 쿼리로 조립한다.

**Tech Stack:** Next.js 16 (App Router, Server Components), React 19, Supabase(untyped), `@cosmos/shared`(ts-jest), TypeScript. 차트 라이브러리 없음.

## Global Constraints

- node/pnpm 경로: `/Users/cosmos/.local/node/bin` — 명령 전 `export PATH="/Users/cosmos/.local/node/bin:$PATH"`.
- 이 repo는 **auto-commit hook**이 편집 시 자동 커밋. `git commit`이 "nothing to commit"이어도 정상 — `git log`에서 SHA 기록.
- **매출 기준**: `orders.status != 'cancelled'` 인 주문의 `total_amount` 합 (기존 `paid+delivered` 필터를 대체).
- **per-상품 매출 컬럼은 `order_items.price`** (checkout insert가 쓰는 검증된 컬럼). `unit_price`는 코드상 불일치가 있어 사용 금지.
- **취소 제외 아이템**: Top-5는 `order_items.status != 'cancelled'` + 부모 주문 `status != 'cancelled'` 만 집계.
- ESLint `no-explicit-any` = 0. untyped Supabase 결과는 `as unknown as T` 로컬 타입 캐스트(인라인 `as any` 금지).
- 시각 계산은 **서버 TZ 기준**(기존 대시보드와 동일). `now`/`Date`는 순수 함수에 **인자 주입**(하드코딩 금지 → 테스트 가능).
- 스타일 토큰: 텍스트/보더 `#1C1C1C`, 카드 `#E8E5E0`, 서브텍스트 `#6B6862`/`#A8A49C`, 증감 양수 `#16a34a`/음수 `#dc2626`.
- `?range` 기본값 `7d`. 값: `today` | `7d` | `30d`.

---

## File Structure

| 파일 | 책임 |
|------|------|
| `packages/shared/src/dashboard.ts` | 순수 계산: `resolveRange`/`pctChange`/`bucketByDay`/`topProducts` + 타입 |
| `packages/shared/src/__tests__/dashboard.test.ts` | 순수 함수 유닛 테스트 |
| `packages/shared/src/index.ts` | `./dashboard` 재export (수정) |
| `apps/web/lib/admin-dashboard.ts` | `getDashboardData(range)` + `DashboardData` 타입 (DB 집계) |
| `apps/web/app/(admin)/admin/_components/RangeToggle.tsx` | 기간 토글 (Link) |
| `apps/web/app/(admin)/admin/_components/KpiCard.tsx` | KPI 카드 + 증감% |
| `apps/web/app/(admin)/admin/_components/TrendChart.tsx` | 일별 매출 CSS 막대 |
| `apps/web/app/(admin)/admin/_components/StatusDonut.tsx` | 주문상태 SVG 도넛 |
| `apps/web/app/(admin)/admin/_components/TopProducts.tsx` | 인기상품 Top5 (링크) |
| `apps/web/app/(admin)/admin/_components/OpsSignals.tsx` | 재고부족 + 대기주문 |
| `apps/web/app/(admin)/admin/_components/VisitCharts.tsx` | 기존 방문자·시간대별(추출) |
| `apps/web/app/(admin)/admin/page.tsx` | 서버 조립 (수정) |

---

## Task 1: 순수 계산 함수 (shared, TDD)

**Files:**
- Create: `packages/shared/src/dashboard.ts`
- Create: `packages/shared/src/__tests__/dashboard.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: `RangeKey`, `RangeBounds`, `PctResult`, `DayBucket`, `TopProduct`, `resolveRange(range, now)`, `pctChange(current, previous)`, `bucketByDay(rows, start, days)`, `topProducts(items, n)`.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/__tests__/dashboard.test.ts`:

```ts
import { resolveRange, pctChange, bucketByDay, topProducts } from '../dashboard'

describe('resolveRange', () => {
  it('7d: 오늘 포함 7일 + 직전 7일', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0) // 2026-01-15 12:00 local
    const r = resolveRange('7d', now)
    expect(r.days).toBe(7)
    expect(r.start).toEqual(new Date(2026, 0, 9, 0, 0, 0))
    expect(r.end).toEqual(now)
    expect(r.prevEnd).toEqual(new Date(2026, 0, 9, 0, 0, 0))
    expect(r.prevStart).toEqual(new Date(2026, 0, 2, 0, 0, 0))
  })

  it('30d: days=30, start=29일 전 00:00', () => {
    const now = new Date(2026, 5, 30, 8, 0, 0)
    const r = resolveRange('30d', now)
    expect(r.days).toBe(30)
    expect(r.start).toEqual(new Date(2026, 5, 1, 0, 0, 0))
    expect(r.prevStart).toEqual(new Date(2026, 4, 2, 0, 0, 0))
  })

  it('today: 오늘 00:00~현재 + 어제 같은 구간', () => {
    const now = new Date(2026, 0, 15, 10, 0, 0)
    const r = resolveRange('today', now)
    expect(r.days).toBe(1)
    expect(r.start).toEqual(new Date(2026, 0, 15, 0, 0, 0))
    expect(r.end).toEqual(now)
    expect(r.prevStart).toEqual(new Date(2026, 0, 14, 0, 0, 0))
    expect(r.prevEnd).toEqual(new Date(2026, 0, 14, 10, 0, 0)) // 어제 같은 경과시간
  })
})

describe('pctChange', () => {
  it('증가', () => expect(pctChange(120, 100)).toEqual({ pct: 20, isNew: false }))
  it('감소', () => expect(pctChange(80, 100)).toEqual({ pct: -20, isNew: false }))
  it('이전 0 + 현재 >0 → isNew', () => expect(pctChange(5, 0)).toEqual({ pct: 0, isNew: true }))
  it('둘 다 0', () => expect(pctChange(0, 0)).toEqual({ pct: 0, isNew: false }))
})

describe('bucketByDay', () => {
  it('일별 합산 + 빈 날 0 + 기간 밖 제외', () => {
    const start = new Date(2026, 0, 9, 0, 0, 0)
    const rows = [
      { created_at: new Date(2026, 0, 9, 10).toISOString(), amount: 100 },
      { created_at: new Date(2026, 0, 10, 3).toISOString(), amount: 50 },
      { created_at: new Date(2026, 0, 10, 20).toISOString(), amount: 30 },
      { created_at: new Date(2026, 0, 12, 1).toISOString(), amount: 999 }, // 범위 밖
    ]
    expect(bucketByDay(rows, start, 3)).toEqual([
      { date: '2026-01-09', total: 100 },
      { date: '2026-01-10', total: 80 },
      { date: '2026-01-11', total: 0 },
    ])
  })
})

describe('topProducts', () => {
  it('goods_id 그룹 합산 + 매출순 정렬(동률 시 수량순) + N 컷', () => {
    const items = [
      { goods_id: 'a', title: 'A', quantity: 2, price: 1000 }, // 2000
      { goods_id: 'b', title: 'B', quantity: 1, price: 5000 }, // 5000
      { goods_id: 'a', title: 'A', quantity: 3, price: 1000 }, // +3000 => a: qty 5, revenue 5000
      { goods_id: 'c', title: 'C', quantity: 1, price: 100 },  // 100 (N=2 컷으로 제외)
    ]
    // revenue 동률(a·b 모두 5000) → 2차 기준 qty 내림차순 → a(5) 먼저, b(1) 다음. c는 컷.
    expect(topProducts(items, 2)).toEqual([
      { goods_id: 'a', title: 'A', qty: 5, revenue: 5000 },
      { goods_id: 'b', title: 'B', qty: 1, revenue: 5000 },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd packages/shared && node_modules/.bin/jest dashboard
```
Expected: FAIL — `Cannot find module '../dashboard'`.

- [ ] **Step 3: Write the implementation**

Create `packages/shared/src/dashboard.ts`:

```ts
export type RangeKey = 'today' | '7d' | '30d'

export interface RangeBounds {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
  days: number
}

export interface PctResult {
  pct: number
  isNew: boolean
}

export interface DayBucket {
  date: string // 'YYYY-MM-DD' (서버 로컬 기준)
  total: number
}

export interface TopProduct {
  goods_id: string
  title: string
  qty: number
  revenue: number
}

const DAY_MS = 86_400_000

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function resolveRange(range: RangeKey, now: Date): RangeBounds {
  if (range === 'today') {
    const start = startOfDay(now)
    const elapsed = now.getTime() - start.getTime()
    const prevStart = new Date(start.getTime() - DAY_MS)
    const prevEnd = new Date(prevStart.getTime() + elapsed)
    return { start, end: now, prevStart, prevEnd, days: 1 }
  }
  const days = range === '7d' ? 7 : 30
  const start = startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS))
  const prevEnd = start
  const prevStart = new Date(start.getTime() - days * DAY_MS)
  return { start, end: now, prevStart, prevEnd, days }
}

export function pctChange(current: number, previous: number): PctResult {
  if (previous === 0) return { pct: 0, isNew: current > 0 }
  return { pct: ((current - previous) / Math.abs(previous)) * 100, isNew: false }
}

export function bucketByDay(
  rows: { created_at: string; amount: number }[],
  start: Date,
  days: number
): DayBucket[] {
  const startDay = startOfDay(start)
  const buckets: DayBucket[] = Array.from({ length: days }, (_, i) => ({
    date: toISODate(new Date(startDay.getTime() + i * DAY_MS)),
    total: 0,
  }))
  const indexByDate = new Map(buckets.map((b, i) => [b.date, i]))
  for (const r of rows) {
    const i = indexByDate.get(toISODate(new Date(r.created_at)))
    if (i !== undefined) buckets[i].total += r.amount
  }
  return buckets
}

export function topProducts(
  items: { goods_id: string; title: string; quantity: number; price: number }[],
  n: number
): TopProduct[] {
  const map = new Map<string, TopProduct>()
  for (const it of items) {
    const cur = map.get(it.goods_id) ?? {
      goods_id: it.goods_id,
      title: it.title,
      qty: 0,
      revenue: 0,
    }
    cur.qty += it.quantity
    cur.revenue += it.quantity * it.price
    cur.title = it.title
    map.set(it.goods_id, cur)
  }
  return [...map.values()]
    .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty)
    .slice(0, n)
}
```

Modify `packages/shared/src/index.ts` — append:

```ts
export * from './dashboard'
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd packages/shared && node_modules/.bin/jest dashboard && node_modules/.bin/tsc --noEmit
```
Expected: all dashboard tests PASS; tsc 0 errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/dashboard.ts packages/shared/src/__tests__/dashboard.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): dashboard pure calc helpers (range/pct/bucket/topN)"
```

---

## Task 2: DB 집계 레이어 (getDashboardData)

**Files:**
- Create: `apps/web/lib/admin-dashboard.ts`

**Interfaces:**
- Consumes: `RangeKey`, `PctResult`, `DayBucket`, `TopProduct`, `resolveRange`, `pctChange`, `bucketByDay`, `topProducts` from `@cosmos/shared`; `createClient` from `@/lib/supabase/server`.
- Produces: `DashboardData` interface, `getDashboardData(range: RangeKey): Promise<DashboardData>`.

- [ ] **Step 1: Write the implementation**

Create `apps/web/lib/admin-dashboard.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import {
  resolveRange,
  pctChange,
  bucketByDay,
  topProducts,
  type RangeKey,
  type PctResult,
  type DayBucket,
  type TopProduct,
} from '@cosmos/shared'

export interface DashboardData {
  range: RangeKey
  kpis: {
    revenue: { value: number; change: PctResult }
    orders: { value: number; change: PctResult }
    aov: { value: number; change: PctResult }
    cancelRate: { value: number; change: PctResult } // value = 0~100(%)
  }
  trend: DayBucket[]
  statusDist: { status: string; count: number }[]
  topProducts: TopProduct[]
  ops: {
    lowStock: { id: string; title: string; stock: number }[]
    pendingOrders: number
  }
  traffic: {
    todayVisitors: number
    newMembers7d: number
    hourly: number[] // 길이 24
  }
}

type OrderRow = { total_amount: number | null; status: string; created_at: string }
type ItemRow = {
  goods_id: string
  title: string
  quantity: number
  price: number
  status: string
  orders: { status: string; created_at: string } | null
}
type LowStockRow = { id: string; title: string; stock_quantity: number | null }

const ACTIVE = ['paid', 'preparing', 'shipping', 'delivered'] // 취소 제외

function summarize(rows: OrderRow[]) {
  const active = rows.filter((r) => r.status !== 'cancelled')
  const revenue = active.reduce((s, r) => s + (r.total_amount ?? 0), 0)
  const orders = active.length
  const cancelled = rows.filter((r) => r.status === 'cancelled').length
  const total = rows.length
  return {
    revenue,
    orders,
    aov: orders > 0 ? Math.round(revenue / orders) : 0,
    cancelRate: total > 0 ? (cancelled / total) * 100 : 0,
  }
}

export async function getDashboardData(range: RangeKey): Promise<DashboardData> {
  const supabase = await createClient()
  const { start, end, prevStart, prevEnd, days } = resolveRange(range, new Date())

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const [
    curRes,
    prevRes,
    itemsRes,
    lowStockRes,
    pendingRes,
    visitorsRes,
    membersRes,
    hourlyRes,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('total_amount, status, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
    supabase
      .from('orders')
      .select('total_amount, status, created_at')
      .gte('created_at', prevStart.toISOString())
      .lte('created_at', prevEnd.toISOString()),
    supabase
      .from('order_items')
      .select('goods_id, title, quantity, price, status, orders!inner(status, created_at)')
      .gte('orders.created_at', start.toISOString())
      .lte('orders.created_at', end.toISOString()),
    supabase
      .from('goods')
      .select('id, title, stock_quantity')
      .eq('status', 'active')
      .lte('stock_quantity', 5)
      .order('stock_quantity', { ascending: true })
      .limit(10),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['paid', 'preparing']),
    supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString()),
    supabase.from('page_views').select('created_at').gte('created_at', todayStart.toISOString()),
  ])

  const curRows = (curRes.data ?? []) as unknown as OrderRow[]
  const prevRows = (prevRes.data ?? []) as unknown as OrderRow[]
  const cur = summarize(curRows)
  const prev = summarize(prevRows)

  const trend = bucketByDay(
    curRows
      .filter((r) => r.status !== 'cancelled')
      .map((r) => ({ created_at: r.created_at, amount: r.total_amount ?? 0 })),
    start,
    days
  )

  const statusOrder = ['paid', 'preparing', 'shipping', 'delivered', 'cancelled']
  const statusCounts = new Map<string, number>()
  for (const r of curRows) statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1)
  const statusDist = statusOrder
    .map((status) => ({ status, count: statusCounts.get(status) ?? 0 }))
    .filter((s) => s.count > 0)

  const items = ((itemsRes.data ?? []) as unknown as ItemRow[]).filter(
    (it) => it.status !== 'cancelled' && it.orders?.status !== 'cancelled'
  )
  const top = topProducts(
    items.map((it) => ({
      goods_id: it.goods_id,
      title: it.title,
      quantity: it.quantity,
      price: it.price,
    })),
    5
  )

  const lowStock = ((lowStockRes.data ?? []) as unknown as LowStockRow[]).map((g) => ({
    id: g.id,
    title: g.title,
    stock: g.stock_quantity ?? 0,
  }))

  const hourly = Array<number>(24).fill(0)
  for (const row of (hourlyRes.data ?? []) as unknown as { created_at: string }[]) {
    hourly[new Date(row.created_at).getHours()]++
  }

  return {
    range,
    kpis: {
      revenue: { value: cur.revenue, change: pctChange(cur.revenue, prev.revenue) },
      orders: { value: cur.orders, change: pctChange(cur.orders, prev.orders) },
      aov: { value: cur.aov, change: pctChange(cur.aov, prev.aov) },
      cancelRate: { value: cur.cancelRate, change: pctChange(cur.cancelRate, prev.cancelRate) },
    },
    trend,
    statusDist,
    topProducts: top,
    ops: { lowStock, pendingOrders: pendingRes.count ?? 0 },
    traffic: {
      todayVisitors: visitorsRes.count ?? 0,
      newMembers7d: membersRes.count ?? 0,
      hourly,
    },
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit
```
Expected: 0 errors. (If the `orders!inner(...)` embedded type infers as an array and breaks the `it.orders?.status` access, keep the `as unknown as ItemRow[]` cast — it overrides inference; do not switch to `as any`.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/admin-dashboard.ts
git commit -m "feat(admin): getDashboardData aggregation layer"
```

---

## Task 3: KPI 컴포넌트 (RangeToggle + KpiCard)

**Files:**
- Create: `apps/web/app/(admin)/admin/_components/RangeToggle.tsx`
- Create: `apps/web/app/(admin)/admin/_components/KpiCard.tsx`

**Interfaces:**
- Consumes: `RangeKey`, `PctResult` from `@cosmos/shared`.
- Produces: `RangeToggle({ range })`, `KpiCard({ label, value, change })`.

- [ ] **Step 1: RangeToggle**

Create `apps/web/app/(admin)/admin/_components/RangeToggle.tsx`:

```tsx
import Link from 'next/link'
import type { RangeKey } from '@cosmos/shared'

const OPTIONS: { k: RangeKey; label: string }[] = [
  { k: 'today', label: '오늘' },
  { k: '7d', label: '7일' },
  { k: '30d', label: '30일' },
]

export default function RangeToggle({ range }: { range: RangeKey }) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden border" style={{ borderColor: '#E8E5E0' }}>
      {OPTIONS.map((o) => {
        const active = o.k === range
        return (
          <Link
            key={o.k}
            href={`/admin?range=${o.k}`}
            className="px-4 py-1.5 text-sm transition-colors"
            style={{ backgroundColor: active ? '#1C1C1C' : 'transparent', color: active ? '#fff' : '#1C1C1C' }}
          >
            {o.label}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: KpiCard**

Create `apps/web/app/(admin)/admin/_components/KpiCard.tsx`:

```tsx
import type { PctResult } from '@cosmos/shared'

export default function KpiCard({
  label,
  value,
  change,
}: {
  label: string
  value: string
  change: PctResult
}) {
  const up = change.pct >= 0
  const color = change.isNew ? '#6B6862' : up ? '#16a34a' : '#dc2626'
  const text = change.isNew ? '신규' : `${up ? '▲' : '▼'} ${Math.abs(change.pct).toFixed(1)}%`
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
      <p className="text-xs mb-1" style={{ color: '#1C1C1C' }}>{label}</p>
      <p className="text-2xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color }}>
        {text} <span style={{ color: '#A8A49C' }}>vs 직전</span>
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck + lint**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint "app/(admin)/admin/_components"
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(admin)/admin/_components/RangeToggle.tsx" "apps/web/app/(admin)/admin/_components/KpiCard.tsx"
git commit -m "feat(admin): dashboard RangeToggle + KpiCard"
```

---

## Task 4: 차트 컴포넌트 (TrendChart + StatusDonut)

**Files:**
- Create: `apps/web/app/(admin)/admin/_components/TrendChart.tsx`
- Create: `apps/web/app/(admin)/admin/_components/StatusDonut.tsx`

**Interfaces:**
- Consumes: `DayBucket` from `@cosmos/shared`.
- Produces: `TrendChart({ data })`, `StatusDonut({ data })`.

- [ ] **Step 1: TrendChart (CSS 막대)**

Create `apps/web/app/(admin)/admin/_components/TrendChart.tsx`:

```tsx
import type { DayBucket } from '@cosmos/shared'

export default function TrendChart({ data }: { data: DayBucket[] }) {
  const max = Math.max(...data.map((d) => d.total), 1)
  const total = data.reduce((s, d) => s + d.total, 0)
  const labelEvery = data.length > 10 ? Math.ceil(data.length / 10) : 1

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
      <div className="flex items-end gap-1" style={{ height: 96 }}>
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end" title={`${d.date}: ₩${d.total.toLocaleString()}`}>
            <div
              className="w-full rounded-sm"
              style={{
                height: `${Math.round((d.total / max) * 100)}%`,
                minHeight: d.total > 0 ? 4 : 0,
                backgroundColor: '#1C1C1C',
                opacity: d.total > 0 ? 0.8 : 0.1,
              }}
            />
            {i % labelEvery === 0 && (
              <span className="mt-1 text-[10px]" style={{ color: '#1C1C1C', opacity: 0.5 }}>
                {d.date.slice(5)}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs mt-3 text-right" style={{ color: '#1C1C1C', opacity: 0.7 }}>
        기간 총 매출: <strong>₩{total.toLocaleString()}</strong>
      </p>
    </div>
  )
}
```

- [ ] **Step 2: StatusDonut (SVG)**

Create `apps/web/app/(admin)/admin/_components/StatusDonut.tsx`:

```tsx
const LABELS: Record<string, string> = {
  paid: '결제완료',
  preparing: '준비중',
  shipping: '배송중',
  delivered: '배송완료',
  cancelled: '취소',
}
const COLORS: Record<string, string> = {
  paid: '#1C1C1C',
  preparing: '#6B6862',
  shipping: '#A8A49C',
  delivered: '#16a34a',
  cancelled: '#dc2626',
}

export default function StatusDonut({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const R = 42
  const C = 2 * Math.PI * R
  let offset = 0

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
      <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>주문 상태 분포</h2>
      {total === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: '#A8A49C' }}>데이터 없음</p>
      ) : (
        <div className="flex items-center gap-5">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <g transform="rotate(-90 55 55)">
              {data.map((d) => {
                const frac = d.count / total
                const dash = frac * C
                const seg = (
                  <circle
                    key={d.status}
                    cx="55"
                    cy="55"
                    r={R}
                    fill="none"
                    stroke={COLORS[d.status] ?? '#C8C5BC'}
                    strokeWidth="14"
                    strokeDasharray={`${dash} ${C - dash}`}
                    strokeDashoffset={-offset}
                  />
                )
                offset += dash
                return seg
              })}
            </g>
            <text x="55" y="59" textAnchor="middle" style={{ fontSize: 16, fill: '#1C1C1C' }}>{total}</text>
          </svg>
          <div className="space-y-1">
            {data.map((d) => (
              <div key={d.status} className="flex items-center gap-2 text-xs" style={{ color: '#1C1C1C' }}>
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[d.status] ?? '#C8C5BC' }} />
                {LABELS[d.status] ?? d.status} · {d.count}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck + lint**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint "app/(admin)/admin/_components"
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(admin)/admin/_components/TrendChart.tsx" "apps/web/app/(admin)/admin/_components/StatusDonut.tsx"
git commit -m "feat(admin): dashboard TrendChart + StatusDonut"
```

---

## Task 5: 랭킹·운영·방문 컴포넌트 (TopProducts + OpsSignals + VisitCharts)

**Files:**
- Create: `apps/web/app/(admin)/admin/_components/TopProducts.tsx`
- Create: `apps/web/app/(admin)/admin/_components/OpsSignals.tsx`
- Create: `apps/web/app/(admin)/admin/_components/VisitCharts.tsx`

**Interfaces:**
- Consumes: `TopProduct` from `@cosmos/shared`; `DashboardData['ops']` and `DashboardData['traffic']` shapes from Task 2.
- Produces: `TopProducts({ items })`, `OpsSignals({ lowStock, pendingOrders })`, `VisitCharts({ todayVisitors, newMembers7d, hourly })`.

- [ ] **Step 1: TopProducts**

Create `apps/web/app/(admin)/admin/_components/TopProducts.tsx`:

```tsx
import Link from 'next/link'
import type { TopProduct } from '@cosmos/shared'

export default function TopProducts({ items }: { items: TopProduct[] }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
      <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>인기 상품 Top 5</h2>
      {items.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: '#A8A49C' }}>데이터 없음</p>
      ) : (
        <ol className="space-y-2">
          {items.map((p, i) => (
            <li key={p.goods_id} className="flex items-center justify-between text-sm">
              <Link href={`/admin/goods/${p.goods_id}`} className="hover:underline truncate" style={{ color: '#1C1C1C' }}>
                {i + 1}. {p.title}
              </Link>
              <span className="shrink-0 ml-3" style={{ color: '#6B6862' }}>
                {p.qty}개 · ₩{p.revenue.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
```

- [ ] **Step 2: OpsSignals**

Create `apps/web/app/(admin)/admin/_components/OpsSignals.tsx`:

```tsx
import Link from 'next/link'

interface Props {
  lowStock: { id: string; title: string; stock: number }[]
  pendingOrders: number
}

export default function OpsSignals({ lowStock, pendingOrders }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 처리 대기 주문 */}
      <Link
        href="/admin/orders?status=paid"
        className="rounded-2xl p-5 block hover:opacity-90 transition-opacity"
        style={{ backgroundColor: '#1C1C1C' }}
      >
        <p className="text-xs mb-1" style={{ color: '#A8A49C' }}>처리 대기 주문</p>
        <p className="text-3xl font-light text-white">{pendingOrders}건</p>
        <p className="text-xs mt-1" style={{ color: '#A8A49C' }}>결제완료·준비중 → 주문 관리로</p>
      </Link>

      {/* 재고 부족 */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
        <p className="text-xs mb-2" style={{ color: '#1C1C1C' }}>재고 부족 (≤5)</p>
        {lowStock.length === 0 ? (
          <p className="text-sm" style={{ color: '#A8A49C' }}>없음</p>
        ) : (
          <ul className="space-y-1">
            {lowStock.map((g) => (
              <li key={g.id} className="flex items-center justify-between text-sm">
                <Link href={`/admin/goods/${g.id}`} className="hover:underline truncate" style={{ color: '#1C1C1C' }}>
                  {g.title}
                </Link>
                <span className="shrink-0 ml-3 font-medium" style={{ color: g.stock === 0 ? '#dc2626' : '#1C1C1C' }}>
                  {g.stock}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: VisitCharts (기존 방문 지표 추출)**

Create `apps/web/app/(admin)/admin/_components/VisitCharts.tsx`:

```tsx
interface Props {
  todayVisitors: number
  newMembers7d: number
  hourly: number[] // 길이 24
}

export default function VisitCharts({ todayVisitors, newMembers7d, hourly }: Props) {
  const maxHourly = Math.max(...hourly, 1)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: '오늘 방문자', value: todayVisitors },
          { label: '신규 회원 (7일)', value: newMembers7d },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
            <p className="text-xs mb-1" style={{ color: '#1C1C1C' }}>{label}</p>
            <p className="text-3xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-medium mb-4" style={{ color: '#1C1C1C' }}>오늘 시간대별 방문</h2>
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
          <div className="flex items-end gap-1" style={{ height: 80 }}>
            {hourly.map((count, h) => (
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
                style={{ color: '#1C1C1C', opacity: 0.5, flex: h === 0 ? '0 0 auto' : '1', textAlign: h === 23 ? 'right' : 'left' }}
              >
                {h}시
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck + lint**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint "app/(admin)/admin/_components"
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(admin)/admin/_components/TopProducts.tsx" "apps/web/app/(admin)/admin/_components/OpsSignals.tsx" "apps/web/app/(admin)/admin/_components/VisitCharts.tsx"
git commit -m "feat(admin): dashboard TopProducts + OpsSignals + VisitCharts"
```

---

## Task 6: page.tsx 조립 + 검증

**Files:**
- Modify (replace): `apps/web/app/(admin)/admin/page.tsx`

**Interfaces:**
- Consumes: `getDashboardData` (Task 2); all components (Tasks 3–5); `RangeKey` from `@cosmos/shared`.

- [ ] **Step 1: page.tsx 재작성**

Replace `apps/web/app/(admin)/admin/page.tsx` entirely:

```tsx
import type { Metadata } from 'next'
import type { RangeKey } from '@cosmos/shared'
import { getDashboardData } from '@/lib/admin-dashboard'
import RangeToggle from './_components/RangeToggle'
import KpiCard from './_components/KpiCard'
import TrendChart from './_components/TrendChart'
import StatusDonut from './_components/StatusDonut'
import TopProducts from './_components/TopProducts'
import OpsSignals from './_components/OpsSignals'
import VisitCharts from './_components/VisitCharts'

export const metadata: Metadata = { title: '대시보드 — Cosmos Admin' }
export const dynamic = 'force-dynamic'

function parseRange(v: string | undefined): RangeKey {
  return v === 'today' || v === '30d' ? v : '7d'
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range: rangeParam } = await searchParams
  const range = parseRange(rangeParam)
  const d = await getDashboardData(range)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light" style={{ color: '#1C1C1C' }}>대시보드</h1>
        <RangeToggle range={range} />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="총 매출" value={`₩${d.kpis.revenue.value.toLocaleString()}`} change={d.kpis.revenue.change} />
        <KpiCard label="주문수" value={`${d.kpis.orders.value.toLocaleString()}건`} change={d.kpis.orders.change} />
        <KpiCard label="평균 주문가" value={`₩${d.kpis.aov.value.toLocaleString()}`} change={d.kpis.aov.change} />
        <KpiCard label="취소율" value={`${d.kpis.cancelRate.value.toFixed(1)}%`} change={d.kpis.cancelRate.change} />
      </div>

      {/* 매출 추세 */}
      <section>
        <h2 className="text-sm font-medium mb-4" style={{ color: '#1C1C1C' }}>매출 추세</h2>
        <TrendChart data={d.trend} />
      </section>

      {/* 랭킹 + 상태분포 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopProducts items={d.topProducts} />
        <StatusDonut data={d.statusDist} />
      </div>

      {/* 운영 신호 */}
      <section>
        <h2 className="text-sm font-medium mb-4" style={{ color: '#1C1C1C' }}>운영 신호</h2>
        <OpsSignals lowStock={d.ops.lowStock} pendingOrders={d.ops.pendingOrders} />
      </section>

      {/* 트래픽 (기존) */}
      <section>
        <h2 className="text-sm font-medium mb-4" style={{ color: '#1C1C1C' }}>트래픽</h2>
        <VisitCharts todayVisitors={d.traffic.todayVisitors} newMembers7d={d.traffic.newMembers7d} hourly={d.traffic.hourly} />
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint app lib
```
Expected: tsc 0 errors; eslint 0 errors (기존 warning 외 신규 없음).

- [ ] **Step 3: 동작 검증 (/verify — 수동)**

`pnpm dev` 후 관리자로 `/admin` 접속:
1. 기본 7일 뷰: KPI 4개, 매출 추세(7 막대), Top5, 상태 도넛, 운영 신호, 트래픽 표시.
2. 토글 `오늘`/`30일` 클릭 → URL `?range=` 바뀌고 KPI·추세(막대 수)·도넛 재계산.
3. KPI 증감%: 색상(초록/빨강)·`신규`/`vs 직전` 정상.
4. Top5·재고부족·대기주문 링크 이동 정상.
5. 빈 상태(해당 기간 주문 0): 카드 0, 추세 빈 막대, 도넛·Top5 "데이터 없음" — 안 깨짐.

- [ ] **Step 4: 최종 테스트 + 커밋**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd packages/shared && node_modules/.bin/jest dashboard
cd ../../apps/web && node_modules/.bin/tsc --noEmit
git add "apps/web/app/(admin)/admin/page.tsx"
git commit -m "feat(admin): assemble enhanced dashboard with range toggle"
```

---

## Self-Review 결과

**Spec coverage:**
- R1 기간 토글 `?range=` → Task 3 RangeToggle + Task 6 parseRange ✓
- R2 KPI 4 + 증감% → Task 1 pctChange, Task 3 KpiCard, Task 2 kpis, Task 6 ✓
- R3 매출 추세 → Task 1 bucketByDay, Task 4 TrendChart ✓
- R4 인기상품 Top5 링크 → Task 1 topProducts, Task 5 TopProducts ✓
- R5 상태 분포 도넛 → Task 4 StatusDonut, Task 2 statusDist ✓
- R6 운영 신호 → Task 2 ops, Task 5 OpsSignals ✓
- R7 트래픽 유지·재배치 → Task 2 traffic, Task 5 VisitCharts, Task 6 하단 배치 ✓
- R8 순수 CSS/SVG → TrendChart(CSS)/StatusDonut(SVG), 라이브러리 없음 ✓
- §3.1 매출 기준(취소 제외) → Task 2 summarize ✓
- price 컬럼 사용 → Task 2 order_items.price ✓

**Placeholder scan:** 모든 스텝에 실제 코드/명령. Task 1 topProducts 기대값은 "2차 정렬 qty desc 반영" 버전(`[a,b]`)으로 작성하도록 명시.

**Type consistency:** `RangeKey`/`PctResult`/`DayBucket`/`TopProduct`/`DashboardData`/`getDashboardData` 시그니처가 Task 간 일치. 컴포넌트 props가 `DashboardData` 슬라이스와 일치(kpis/trend/statusDist/topProducts/ops/traffic).

**알려진 리스크(구현 시 확인):** `order_items` 스키마가 repo 마이그레이션에 없음(수동 생성). `price` 컬럼은 checkout insert가 사용하므로 존재 확정. `orders!inner` 임베드 필터가 postgrest에서 예상대로 동작하는지 Task 2 tsc + /verify에서 확인.
