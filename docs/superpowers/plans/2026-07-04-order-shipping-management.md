# 주문관리 고도화 — 배송/송장 관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 주문을 '배송중'으로 전환할 때 택배사·송장번호를 입력하고, 고객은 배송조회를, 관리자는 송장용 정보(수령인 기준)와 주문자↔수령인 관계 분류를 확인할 수 있게 한다.

**Architecture:** 순수 유틸(택배사 목록·배송조회 URL·주소 파싱·수령인 분류)을 `@cosmos/shared`에 두고 jest로 TDD. `orders`에 `courier`/`tracking_number` 컬럼 추가. 관리자 주문 상세에 "배송 처리" 폼(발송 처리/송장 수정)과 "송장용 정보" 복사 블록, 수령 유형 뱃지를 추가하고, 고객 주문 상세에 배송조회를 붙인다.

**Tech Stack:** Next.js 16 (App Router, Server Components/Actions), React 19, Supabase(untyped), `@cosmos/shared`(ts-jest), TypeScript. 외부 차트/UI 라이브러리 없음.

## Global Constraints

- node/pnpm 경로: `/Users/cosmos/.local/node/bin` — 명령 전 `export PATH="/Users/cosmos/.local/node/bin:$PATH"`.
- auto-commit hook이 편집 시 자동 커밋. `git commit`이 "nothing to commit"이어도 정상 — `git log`에서 SHA 기록.
- **마이그레이션 순서**: 앱이 `courier`/`tracking_number` 컬럼을 참조(graceful fallback 없음) → **마이그레이션 022를 Supabase에 적용한 뒤 main 병합**. feature 브랜치라 병합 전 프로덕션 영향 없음.
- ESLint `no-explicit-any` = 0. untyped Supabase 결과는 로컬 타입 캐스트(`as unknown as T`), 인라인 `as any` 금지.
- 스타일 토큰: 텍스트/보더 `#1C1C1C`, 카드 `#E8E5E0`, 서브텍스트 `#6B6862`/`#A8A49C`. 강조 파랑 `#2563eb`/`#dbeafe`, 주의 주황 `#854D0E`/`#FEF9C3`, 중립 회색.
- 택배사 코드/라벨: cjlogistics=CJ대한통운, epost=우체국택배, hanjin=한진택배, lotte=롯데택배, logen=로젠택배.
- 배송조회 URL: `https://tracker.delivery/#/kr.{courier}/{tracking_number}`.
- 순수 유틸은 `@cosmos/shared`(jest)에 두고 앱은 `@cosmos/shared`에서 import.

---

## File Structure

| 파일 | 책임 |
|------|------|
| `packages/shared/src/couriers.ts` | COURIERS, courierLabel, trackingUrl, parseShippingAddress, classifyRecipient (순수) |
| `packages/shared/src/__tests__/couriers.test.ts` | 위 순수 함수 유닛 테스트 |
| `packages/shared/src/index.ts` | `./couriers` 재export (수정) |
| `supabase/migrations/022_orders_shipping.sql` | orders.courier + orders.tracking_number |
| `apps/web/app/(admin)/admin/orders/[id]/actions.ts` | shipOrder / updateTracking 추가 (수정) |
| `apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx` | '배송중' 선택 비활성화 (수정) |
| `apps/web/app/(admin)/admin/orders/[id]/_components/ShipmentForm.tsx` | 배송 처리/송장 수정 폼 (신규) |
| `apps/web/app/(admin)/admin/orders/[id]/_components/WaybillInfo.tsx` | 송장용 정보 + 복사 (신규) |
| `apps/web/app/(admin)/admin/orders/[id]/page.tsx` | 배송/송장 카드 + 수령 유형 뱃지 (수정) |
| `apps/web/app/orders/[id]/page.tsx` | 고객 배송조회 (수정) |

**mypage/orders 미포함 결정**: `app/mypage/orders/page.tsx`의 주문 카드는 전체가 `<Link>`라 배송조회 `<a>`를 중첩하면 유효하지 않은 HTML이 된다. 배송조회는 `/orders/[id]` 상세에만 두고, 목록은 상세로 링크(상태 라벨 '배송중' 유지)한다. 스펙 R5의 mypage 목록 부분은 이 제약으로 상세 페이지로 귀속.

---

## Task 1: 순수 유틸 (couriers, TDD)

**Files:**
- Create: `packages/shared/src/couriers.ts`
- Create: `packages/shared/src/__tests__/couriers.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: `Courier`, `COURIERS`, `courierLabel(code)`, `trackingUrl(courier, tn)`, `parseShippingAddress(shipping)`, `RecipientRelation`, `classifyRecipient(args)`.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/__tests__/couriers.test.ts`:

```ts
import { courierLabel, trackingUrl, parseShippingAddress, classifyRecipient, COURIERS } from '../couriers'

describe('COURIERS', () => {
  it('5개 택배사, 코드/라벨 존재', () => {
    expect(COURIERS.map((c) => c.code)).toEqual(['cjlogistics', 'epost', 'hanjin', 'lotte', 'logen'])
  })
})

describe('courierLabel', () => {
  it('코드 → 라벨', () => expect(courierLabel('cjlogistics')).toBe('CJ대한통운'))
  it('미지 코드 → 코드 그대로', () => expect(courierLabel('unknown')).toBe('unknown'))
  it('null → 빈 문자열', () => expect(courierLabel(null)).toBe(''))
})

describe('trackingUrl', () => {
  it('정상 → tracker.delivery URL', () =>
    expect(trackingUrl('cjlogistics', '1234567890')).toBe('https://tracker.delivery/#/kr.cjlogistics/1234567890'))
  it('courier 없으면 null', () => expect(trackingUrl(null, '123')).toBeNull())
  it('송장번호 없으면 null', () => expect(trackingUrl('cjlogistics', null)).toBeNull())
})

describe('parseShippingAddress', () => {
  it('(우편번호) 주소 분리', () =>
    expect(parseShippingAddress('(12345) 서울시 강남구 101동 202호')).toEqual({ zonecode: '12345', address: '서울시 강남구 101동 202호' }))
  it('형식 불일치 → zonecode 빈값 + 원문', () =>
    expect(parseShippingAddress('서울시 강남구')).toEqual({ zonecode: '', address: '서울시 강남구' }))
  it('null → 빈값', () => expect(parseShippingAddress(null)).toEqual({ zonecode: '', address: '' }))
})

describe('classifyRecipient', () => {
  const base = { ordererName: '홍길동', ordererPhone: '010-1111-2222', recipientName: '홍길동', recipientPhone: '010-1111-2222' }
  it('완전 일치 → self', () => expect(classifyRecipient(base)).toBe('self'))
  it('이름만 다름 → other', () => expect(classifyRecipient({ ...base, recipientName: '김철수' })).toBe('other'))
  it('연락처만 다름 → other', () => expect(classifyRecipient({ ...base, recipientPhone: '010-9999-8888' })).toBe('other'))
  it('둘 다 다름 → other', () => expect(classifyRecipient({ ...base, recipientName: '김철수', recipientPhone: '010-9999-8888' })).toBe('other'))
  it('하이픈만 다른 동일번호 → self', () =>
    expect(classifyRecipient({ ...base, recipientPhone: '01011112222' })).toBe('self'))
  it('주문자 정보 없음 → unknown', () =>
    expect(classifyRecipient({ ordererName: null, ordererPhone: null, recipientName: '홍길동', recipientPhone: '010-1111-2222' })).toBe('unknown'))
  it('수령인 정보 없음 → unknown', () =>
    expect(classifyRecipient({ ...base, recipientName: null, recipientPhone: null })).toBe('unknown'))
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd packages/shared && node_modules/.bin/jest couriers
```
Expected: FAIL — `Cannot find module '../couriers'`.

- [ ] **Step 3: Write the implementation**

Create `packages/shared/src/couriers.ts`:

```ts
export interface Courier {
  code: string
  label: string
}

export const COURIERS: Courier[] = [
  { code: 'cjlogistics', label: 'CJ대한통운' },
  { code: 'epost', label: '우체국택배' },
  { code: 'hanjin', label: '한진택배' },
  { code: 'lotte', label: '롯데택배' },
  { code: 'logen', label: '로젠택배' },
]

const LABEL_BY_CODE = new Map(COURIERS.map((c) => [c.code, c.label]))

export function courierLabel(code: string | null): string {
  if (!code) return ''
  return LABEL_BY_CODE.get(code) ?? code
}

export function trackingUrl(courier: string | null, trackingNumber: string | null): string | null {
  if (!courier || !trackingNumber) return null
  return `https://tracker.delivery/#/kr.${courier}/${trackingNumber}`
}

export function parseShippingAddress(shipping: string | null): { zonecode: string; address: string } {
  const s = (shipping ?? '').trim()
  const m = s.match(/^\((\d+)\)\s*(.*)$/)
  if (m) return { zonecode: m[1], address: m[2].trim() }
  return { zonecode: '', address: s }
}

export type RecipientRelation = 'self' | 'other' | 'unknown'

function normName(v: string | null): string {
  return (v ?? '').trim().replace(/\s+/g, ' ')
}
function normPhone(v: string | null): string {
  return (v ?? '').replace(/\D/g, '')
}

export function classifyRecipient(args: {
  ordererName: string | null
  ordererPhone: string | null
  recipientName: string | null
  recipientPhone: string | null
}): RecipientRelation {
  const oName = normName(args.ordererName)
  const oPhone = normPhone(args.ordererPhone)
  const rName = normName(args.recipientName)
  const rPhone = normPhone(args.recipientPhone)

  const canName = oName !== '' && rName !== ''
  const canPhone = oPhone !== '' && rPhone !== ''
  if (!canName && !canPhone) return 'unknown'

  if (canName && oName !== rName) return 'other'
  if (canPhone && oPhone !== rPhone) return 'other'
  return 'self'
}
```

Modify `packages/shared/src/index.ts` — append:

```ts
export * from './couriers'
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd packages/shared && node_modules/.bin/jest couriers && node_modules/.bin/tsc --noEmit
```
Expected: all couriers tests PASS; tsc 0 errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/couriers.ts packages/shared/src/__tests__/couriers.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): courier/tracking/recipient utils"
```

---

## Task 2: 마이그레이션 022 (orders.courier + tracking_number)

**Files:**
- Create: `supabase/migrations/022_orders_shipping.sql`

**Interfaces:**
- Produces: `orders.courier text`, `orders.tracking_number text` (both nullable). Task 3·6·7이 소비.

- [ ] **Step 1: 마이그레이션 작성**

Create `supabase/migrations/022_orders_shipping.sql`:

```sql
-- 022_orders_shipping.sql
-- 배송/송장 관리: 택배사 코드 + 송장번호. 둘 다 nullable(기존 주문은 null → 배송정보 미표시).

alter table public.orders
  add column if not exists courier text,
  add column if not exists tracking_number text;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/022_orders_shipping.sql
git commit -m "feat(db): orders courier + tracking_number"
```

- [ ] **Step 3: 수동 적용 안내 (사용자 액션 — 병합 전 필수)**

Supabase SQL Editor에 위 파일 실행. 검증:
```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='orders' and column_name in ('courier','tracking_number');
-- 기대: courier, tracking_number 두 행
```

---

## Task 3: 관리자 배송 액션 + 상태셀렉트

**Files:**
- Modify: `apps/web/app/(admin)/admin/orders/[id]/actions.ts`
- Modify: `apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx`

**Interfaces:**
- Consumes: `createAdminClient`, `revalidatePath`, `orders.courier`/`tracking_number` (Task 2).
- Produces: `shipOrder(orderId, courier, trackingNumber): Promise<{error?: string}>`, `updateTracking(orderId, courier, trackingNumber): Promise<{error?: string}>`.

- [ ] **Step 1: 액션 추가**

In `apps/web/app/(admin)/admin/orders/[id]/actions.ts`, append these two functions (the file already has `'use server'`, imports `revalidatePath` from `next/cache` and `createAdminClient` from `@/lib/supabase/admin-client`, and exports `adminCancelOrderItem` — keep all that; just add):

```ts
export async function shipOrder(
  orderId: string,
  courier: string,
  trackingNumber: string
): Promise<{ error?: string }> {
  if (!courier.trim() || !trackingNumber.trim()) {
    return { error: '택배사와 송장번호를 입력해주세요.' }
  }
  const admin = createAdminClient()
  const { error } = await admin
    .from('orders')
    .update({ status: 'shipping', courier: courier.trim(), tracking_number: trackingNumber.trim() })
    .eq('id', orderId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
  return {}
}

export async function updateTracking(
  orderId: string,
  courier: string,
  trackingNumber: string
): Promise<{ error?: string }> {
  if (!courier.trim() || !trackingNumber.trim()) {
    return { error: '택배사와 송장번호를 입력해주세요.' }
  }
  const admin = createAdminClient()
  const { error } = await admin
    .from('orders')
    .update({ courier: courier.trim(), tracking_number: trackingNumber.trim() })
    .eq('id', orderId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/orders/${orderId}`)
  return {}
}
```

- [ ] **Step 2: 상태셀렉트 — '배송중' 선택 비활성화**

In `apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx`, mark the shipping option `disabled` so 배송중은 표시되지만 드롭다운에서 직접 선택 불가(발송 처리로만 전환):

```tsx
// 변경 전
const STATUS_OPTIONS = [
  { value: 'paid', label: '결제완료' },
  { value: 'preparing', label: '상품준비중' },
  { value: 'shipping', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
  { value: 'cancelled', label: '취소됨' },
]
// 변경 후 (shipping에 disabled 추가)
const STATUS_OPTIONS = [
  { value: 'paid', label: '결제완료', disabled: false },
  { value: 'preparing', label: '상품준비중', disabled: false },
  { value: 'shipping', label: '배송중 (발송 처리로만)', disabled: true },
  { value: 'delivered', label: '배송완료', disabled: false },
  { value: 'cancelled', label: '취소됨', disabled: false },
]
```

And render the `disabled` on each option:

```tsx
// 변경 전
      {STATUS_OPTIONS.map(({ value: v, label }) => (
        <option key={v} value={v}>{label}</option>
      ))}
// 변경 후
      {STATUS_OPTIONS.map(({ value: v, label, disabled }) => (
        <option key={v} value={v} disabled={disabled}>{label}</option>
      ))}
```

- [ ] **Step 3: 타입체크 + 린트**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint "app/(admin)/admin/orders"
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(admin)/admin/orders/[id]/actions.ts" "apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx"
git commit -m "feat(admin): shipOrder/updateTracking actions + lock 배송중 to shipment flow"
```

---

## Task 4: 배송 처리 폼 (ShipmentForm)

**Files:**
- Create: `apps/web/app/(admin)/admin/orders/[id]/_components/ShipmentForm.tsx`

**Interfaces:**
- Consumes: `COURIERS` from `@cosmos/shared`; `shipOrder`/`updateTracking` from `../actions` (Task 3).
- Produces: `ShipmentForm({ orderId, mode, initialCourier?, initialTracking? })` where `mode: 'ship' | 'edit'`.

- [ ] **Step 1: 컴포넌트 작성**

Create `apps/web/app/(admin)/admin/orders/[id]/_components/ShipmentForm.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COURIERS } from '@cosmos/shared'
import { shipOrder, updateTracking } from '../actions'

interface Props {
  orderId: string
  mode: 'ship' | 'edit'
  initialCourier?: string | null
  initialTracking?: string | null
}

export default function ShipmentForm({ orderId, mode, initialCourier, initialTracking }: Props) {
  const router = useRouter()
  const [courier, setCourier] = useState(initialCourier || COURIERS[0].code)
  const [tracking, setTracking] = useState(initialTracking ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!tracking.trim()) {
      setError('송장번호를 입력해주세요.')
      return
    }
    setBusy(true)
    setError('')
    const run = mode === 'ship' ? shipOrder : updateTracking
    const r = await run(orderId, courier, tracking.trim())
    setBusy(false)
    if (r.error) {
      setError(r.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={courier}
          onChange={(e) => setCourier(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
          style={{ color: '#1C1C1C' }}
        >
          {COURIERS.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="송장번호"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
          style={{ color: '#1C1C1C' }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          {busy ? '처리 중...' : mode === 'ship' ? '발송 처리' : '송장 수정'}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: 타입체크 + 린트**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint "app/(admin)/admin/orders/[id]/_components/ShipmentForm.tsx"
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(admin)/admin/orders/[id]/_components/ShipmentForm.tsx"
git commit -m "feat(admin): shipment form (ship/edit tracking)"
```

---

## Task 5: 송장용 정보 블록 (WaybillInfo)

**Files:**
- Create: `apps/web/app/(admin)/admin/orders/[id]/_components/WaybillInfo.tsx`

**Interfaces:**
- Consumes: `parseShippingAddress` from `@cosmos/shared`.
- Produces: `WaybillInfo({ recipientName, recipientPhone, shippingAddress, items, orderNo, isOther })`.

- [ ] **Step 1: 컴포넌트 작성**

Create `apps/web/app/(admin)/admin/orders/[id]/_components/WaybillInfo.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { parseShippingAddress } from '@cosmos/shared'

interface Props {
  recipientName: string | null
  recipientPhone: string | null
  shippingAddress: string | null
  items: { title: string; quantity: number }[]
  orderNo: string
  isOther: boolean
}

export default function WaybillInfo({ recipientName, recipientPhone, shippingAddress, items, orderNo, isOther }: Props) {
  const { zonecode, address } = parseShippingAddress(shippingAddress)
  const itemsText = items.map((i) => `${i.title} x${i.quantity}`).join(', ')

  const fields: { label: string; value: string }[] = [
    { label: '받는분', value: recipientName ?? '' },
    { label: '연락처', value: recipientPhone ?? '' },
    { label: '우편번호', value: zonecode },
    { label: '주소', value: address },
    { label: '품목', value: itemsText },
    { label: '주문번호', value: orderNo },
  ]

  const [copied, setCopied] = useState<string | null>(null)

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200)
    } catch {
      alert('복사에 실패했습니다. 직접 선택해 복사해주세요.')
    }
  }

  const allText = fields.map((f) => `${f.label}: ${f.value}`).join('\n')

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>송장용 정보</h2>
        <button
          type="button"
          onClick={() => copy('__all__', allText)}
          className="text-xs px-3 py-1 rounded-lg border"
          style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
        >
          {copied === '__all__' ? '복사됨 ✓' : '전체 복사'}
        </button>
      </div>

      {isOther && (
        <p className="text-xs mb-3 px-2 py-1.5 rounded" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
          받는분이 주문자와 다릅니다 · 송장은 받는분(수령인) 기준으로 작성하세요.
        </p>
      )}

      <div className="space-y-1.5">
        {fields.map((f) => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="text-xs w-16 shrink-0" style={{ color: '#6B6862' }}>{f.label}</span>
            <span className="text-sm flex-1 break-all" style={{ color: '#1C1C1C' }}>{f.value || '-'}</span>
            <button
              type="button"
              onClick={() => copy(f.label, f.value)}
              className="text-xs px-2 py-0.5 rounded shrink-0"
              style={{ backgroundColor: '#F2F1EE', color: '#6B6862' }}
            >
              {copied === f.label ? '✓' : '복사'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 타입체크 + 린트**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint "app/(admin)/admin/orders/[id]/_components/WaybillInfo.tsx"
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(admin)/admin/orders/[id]/_components/WaybillInfo.tsx"
git commit -m "feat(admin): waybill info block with copy"
```

---

## Task 6: 관리자 주문 상세 조립

**Files:**
- Modify: `apps/web/app/(admin)/admin/orders/[id]/page.tsx`

**Interfaces:**
- Consumes: `classifyRecipient`, `courierLabel`, `trackingUrl` from `@cosmos/shared`; `ShipmentForm` (Task 4); `WaybillInfo` (Task 5); `orders.courier`/`tracking_number` (Task 2).

**Read the file fully first.** Then apply the edits below.

- [ ] **Step 1: imports + OrderDetail 타입 + select 확장**

(a) Add imports (top of file, after existing imports):
```tsx
import { classifyRecipient, courierLabel, trackingUrl } from '@cosmos/shared'
import ShipmentForm from './_components/ShipmentForm'
import WaybillInfo from './_components/WaybillInfo'
```

(b) Extend the `OrderDetail` type — add `courier`/`tracking_number`:
```tsx
// 기존 type OrderDetail = { ... order_items: [...] } 에 두 필드 추가:
  courier: string | null
  tracking_number: string | null
```

(c) Add `courier, tracking_number` to the orders select string:
```tsx
// 변경 전
    .select(`
      id, status, total_amount, created_at, user_id,
      recipient_name, recipient_phone, shipping_address, memo,
      order_items(id, title, quantity, price, status)
    `)
// 변경 후
    .select(`
      id, status, total_amount, created_at, user_id,
      recipient_name, recipient_phone, shipping_address, memo,
      courier, tracking_number,
      order_items(id, title, quantity, price, status)
    `)
```

- [ ] **Step 2: 관계 분류로 교체**

Replace the inline `normalize`/`nameDiffers`/`phoneDiffers`/`isThirdPartyDelivery` block with `classifyRecipient` (keep `registeredPhone` as-is above it):

```tsx
// 변경 전 (normalize~isThirdPartyDelivery 4~5줄 제거)
  const normalize = (p: string) => p.replace(/\D/g, '')
  const nameDiffers = profile?.display_name && order.recipient_name &&
    profile.display_name !== order.recipient_name
  const phoneDiffers = registeredPhone && order.recipient_phone &&
    normalize(registeredPhone) !== normalize(order.recipient_phone)
  const isThirdPartyDelivery = !!(nameDiffers || phoneDiffers)

// 변경 후
  const relation = classifyRecipient({
    ordererName: profile?.display_name ?? null,
    ordererPhone: registeredPhone,
    recipientName: order.recipient_name,
    recipientPhone: order.recipient_phone,
  })
  const relationBadge =
    relation === 'other'
      ? { label: '타인 수령 (선물·대리)', bg: '#dbeafe', color: '#2563eb' }
      : relation === 'unknown'
      ? { label: '수령인 확인 필요', bg: '#FEF9C3', color: '#854D0E' }
      : { label: '본인 수령', bg: '#E8E5E0', color: '#6B6862' }
```

- [ ] **Step 3: 배송 정보 헤더 뱃지 교체 + 배송 처리/송장 정보 카드 추가**

Find the "배송 정보" section header that renders the `isThirdPartyDelivery` badge:
```tsx
// 변경 전
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>배송 정보</h2>
          {isThirdPartyDelivery && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}
            >
              타인 배송
            </span>
          )}
        </div>
// 변경 후 (relationBadge 사용)
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>배송 정보</h2>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: relationBadge.bg, color: relationBadge.color }}
          >
            {relationBadge.label}
          </span>
        </div>
```

Then, immediately AFTER the closing `</section>` of the 배송 정보 section (before the component's final `</div>`), insert the 배송 처리 카드 + 송장용 정보 카드:

```tsx
      {/* 배송 처리 */}
      {order.status !== 'cancelled' && (
        <section className="mt-8">
          <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>배송 처리</h2>
          <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
            {(order.status === 'paid' || order.status === 'preparing') ? (
              <ShipmentForm orderId={order.id} mode="ship" />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: '#1C1C1C' }}>
                  <span>택배사: <strong>{courierLabel(order.courier)}</strong></span>
                  <span>송장번호: <strong>{order.tracking_number ?? '-'}</strong></span>
                  {trackingUrl(order.courier, order.tracking_number) && (
                    <a
                      href={trackingUrl(order.courier, order.tracking_number)!}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-3 py-1 rounded-lg text-white"
                      style={{ backgroundColor: '#1C1C1C' }}
                    >
                      배송조회
                    </a>
                  )}
                </div>
                <details>
                  <summary className="text-xs cursor-pointer" style={{ color: '#6B6862' }}>송장 수정</summary>
                  <div className="mt-2">
                    <ShipmentForm orderId={order.id} mode="edit" initialCourier={order.courier} initialTracking={order.tracking_number} />
                  </div>
                </details>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 송장용 정보 */}
      {order.status !== 'cancelled' && (
        <section className="mt-8">
          <WaybillInfo
            recipientName={order.recipient_name}
            recipientPhone={order.recipient_phone}
            shippingAddress={order.shipping_address}
            items={order.order_items.filter((i) => i.status !== 'cancelled').map((i) => ({ title: i.title, quantity: i.quantity }))}
            orderNo={order.id.slice(0, 8).toUpperCase()}
            isOther={relation === 'other'}
          />
        </section>
      )}
```

> 배치: 위 두 `<section>`은 기존 "배송 정보" 섹션 뒤, 컴포넌트 최상위 `<div>`의 닫힘 직전에 둔다. 정확한 위치는 파일을 읽고 배송 정보 `</section>` 다음 줄에 삽입.

- [ ] **Step 4: 타입체크 + 린트**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint app lib
```
Expected: tsc 0 errors; eslint 0 errors (기존 warning 외 신규 없음). `isThirdPartyDelivery` 잔여 참조가 있으면 tsc가 잡아줌 → 모두 relation 기반으로 정리.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(admin)/admin/orders/[id]/page.tsx"
git commit -m "feat(admin): order detail shipment + waybill + recipient relation"
```

---

## Task 7: 고객 주문 상세 배송조회

**Files:**
- Modify: `apps/web/app/orders/[id]/page.tsx`

**Interfaces:**
- Consumes: `courierLabel`, `trackingUrl` from `@cosmos/shared`; `orders.courier`/`tracking_number` (Task 2, comes through the existing `select('*, ...')`).

- [ ] **Step 1: import 추가**

At the top of `apps/web/app/orders/[id]/page.tsx`, add:
```tsx
import { courierLabel, trackingUrl } from '@cosmos/shared'
```

- [ ] **Step 2: 배송 정보 섹션에 배송조회 추가**

The order query is `.select('*, order_items(*)')`, so `order.courier`/`order.tracking_number` are available. In the "배송 정보" `<section>` (the one showing recipient_name/phone/shipping_address), append a tracking block that shows only when shipping/delivered with a tracking number:

```tsx
// 배송 정보 section의 order.memo 블록 다음(섹션 </section> 직전)에 삽입
          {(order.status === 'shipping' || order.status === 'delivered') && order.tracking_number && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#D8D5CF' }}>
              <p className="text-sm mb-1" style={{ color: '#1C1C1C' }}>
                {courierLabel(order.courier)} · {order.tracking_number}
              </p>
              {trackingUrl(order.courier, order.tracking_number) && (
                <a
                  href={trackingUrl(order.courier, order.tracking_number)!}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-1 text-xs px-3 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: '#1C1C1C' }}
                >
                  배송조회
                </a>
              )}
            </div>
          )}
```

- [ ] **Step 3: 타입체크 + 린트**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint app/orders
```
Expected: 0 errors.

- [ ] **Step 4: 동작 검증 (/verify — 수동, 마이그레이션 022 적용 후)**

`pnpm dev`:
1. 관리자 `/admin/orders/[id]` (상품준비중 주문): "배송 처리"에서 택배사·송장 입력 → 발송 처리 → status 배송중 + 송장 표시 + 배송조회 링크.
2. 수령 유형 뱃지: 주문자=수령인 → 본인 수령 / 다르면 타인 수령 / 주문자정보 없으면 확인 필요.
3. 송장용 정보: 우편번호 분리, 개별/전체 복사 동작, 타인 수령 시 안내.
4. 상태 드롭다운에 '배송중'은 비활성(선택 불가).
5. 고객 `/orders/[id]` (배송중 주문): 택배사·송장 + 배송조회 버튼 → tracker.delivery 이동.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/orders/[id]/page.tsx"
git commit -m "feat(orders): customer shipment tracking on order detail"
```

---

## Self-Review 결과

**Spec coverage:**
- R1 courier/tracking_number → Task 2 ✓
- R2 배송 처리(택배사+송장 → shipping) → Task 3 shipOrder, Task 4 ShipmentForm, Task 6 카드 ✓
- R3 '배송중' 발송 처리로만 → Task 3 OrderStatusSelect disabled ✓
- R4 배송중/완료 시 송장·배송조회·수정 → Task 6 (courierLabel/trackingUrl + edit ShipmentForm) ✓
- R5 고객 배송조회 → Task 7 (`/orders/[id]`; mypage 목록은 nested-anchor 제약으로 상세 귀속, 파일구조 노트) ✓
- R6 tracker.delivery + 고정 목록 → Task 1 trackingUrl/COURIERS ✓
- R7 송장용 정보 블록 + 복사 → Task 5 WaybillInfo, Task 6 배치 ✓
- R8 주문자↔수령인 분류 → Task 1 classifyRecipient, Task 6 뱃지 + WaybillInfo isOther ✓

**Placeholder scan:** 모든 스텝에 실제 코드/명령. TBD 없음.

**Type consistency:** `shipOrder`/`updateTracking`(orderId, courier, trackingNumber) 시그니처가 Task 3 정의 = Task 4 사용 일치. `ShipmentForm` props(mode 'ship'|'edit', initialCourier/Tracking) Task 4 정의 = Task 6 사용 일치. `WaybillInfo` props Task 5 정의 = Task 6 사용 일치. `classifyRecipient`/`courierLabel`/`trackingUrl`/`parseShippingAddress` 시그니처가 Task 1 정의와 소비처 일치. `OrderDetail`에 courier/tracking_number 추가가 select 문자열과 정합.
