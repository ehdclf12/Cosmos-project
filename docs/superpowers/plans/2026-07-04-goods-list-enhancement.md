# 상품 목록 페이지 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 상품 목록에 등록일 컬럼과 상품별 노출 토글(`goods.is_active`)을 추가하고, 비활성 상품을 홈 목록·상세에서 완전히 숨긴다.

**Architecture:** `goods.is_active` boolean(기본 true)을 추가. 공개 `/goods` 목록·상세 쿼리에 `.eq('is_active', true)` 필터를 더해 비활성 상품을 숨김(상세는 404). 관리 목록은 전부 표시하고, 각 행에서 브라우저 클라이언트로 `is_active`를 직접 토글(기존 `DeleteGoodsButton` 패턴과 동일, RLS는 goods admin 정책이 이미 허용).

**Tech Stack:** Next.js 16 (App Router, Server Components), React 19, Supabase(untyped, browser+server client), TypeScript. 차트/외부 라이브러리 없음.

## Global Constraints

- node/pnpm 경로: `/Users/cosmos/.local/node/bin` — 명령 전 `export PATH="/Users/cosmos/.local/node/bin:$PATH"`.
- auto-commit hook이 편집 시 자동 커밋. `git commit`이 "nothing to commit"이어도 정상 — `git log`에서 SHA 기록.
- **마이그레이션 순서**: 앱 코드가 `is_active` 컬럼을 참조하므로(graceful fallback 없음), **마이그레이션 021을 Supabase에 적용한 뒤 main 병합**해야 홈/목록이 안 깨진다. (feature 브랜치에서 작업 → 병합 전 021 적용)
- ESLint `no-explicit-any` = 0. untyped Supabase 결과는 로컬 타입 캐스트(`as unknown as T`), 인라인 `as any` 금지.
- 스타일 토큰: 텍스트/보더 `#1C1C1C`, 카드 `#E8E5E0`, 서브텍스트 `#6B6862`/`#A8A49C`. 노출=강조, 미노출=흐림(opacity 0.5).
- 토글은 브라우저 클라이언트(`@/lib/supabase/client`)로 `goods.update({is_active}).eq('id', id)` + `router.refresh()` (기존 `DeleteGoodsButton`과 동일 패턴). 서버 액션 불필요.
- 컬럼 순서: 이미지 · 상품명 · 가격 · 할인 · 재고 · 카테고리 · 상태 · **노출** · **등록일** · 관리.
- 등록일 표기: `YYYY.MM.DD`.

---

## File Structure

| 파일 | 책임 |
|------|------|
| `supabase/migrations/021_goods_is_active.sql` | `goods.is_active` 컬럼 추가 |
| `apps/web/app/goods/page.tsx` | 공개 목록: `is_active=true`만 노출 (수정) |
| `apps/web/app/goods/[id]/page.tsx` | 공개 상세: 비활성 404 + 관련상품 필터 (수정) |
| `apps/web/app/(admin)/admin/goods/_components/ToggleActiveButton.tsx` | 목록 인라인 노출 토글 (신규) |
| `apps/web/app/(admin)/admin/goods/page.tsx` | 등록일·노출 컬럼 + 노출여부 필터 + 행 흐림 (수정) |

이 기능은 순수 로직 함수가 없어(전부 DB/UI 통합) 유닛 테스트 대상이 없다. 검증은 tsc + eslint + 수동 /verify.

---

## Task 1: 마이그레이션 021 (goods.is_active)

**Files:**
- Create: `supabase/migrations/021_goods_is_active.sql`

**Interfaces:**
- Produces: `goods.is_active boolean not null default true` 컬럼. Task 2·4의 쿼리가 소비.

- [ ] **Step 1: 마이그레이션 작성**

Create `supabase/migrations/021_goods_is_active.sql`:

```sql
-- 021_goods_is_active.sql
-- 상품별 노출 플래그. status(active/sold_out/draft)와 독립.
-- is_active=false → 홈 목록·상세에서 완전 숨김(관리 목록엔 유지).
-- 기본 true → 기존 상품 전부 노출 유지(회귀 없음).

alter table public.goods
  add column if not exists is_active boolean not null default true;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/021_goods_is_active.sql
git commit -m "feat(db): goods.is_active visibility flag"
```

- [ ] **Step 3: 수동 적용 안내 (사용자 액션 — 병합 전 필수)**

Supabase 대시보드 → SQL Editor에 위 파일 내용 실행. 검증:
```sql
select column_name, data_type, column_default
from information_schema.columns
where table_schema='public' and table_name='goods' and column_name='is_active';
-- 기대: is_active | boolean | true
```

---

## Task 2: 공개 노출 필터 (홈 목록 + 상세)

**Files:**
- Modify: `apps/web/app/goods/page.tsx`
- Modify: `apps/web/app/goods/[id]/page.tsx`

**Interfaces:**
- Consumes: `goods.is_active` (Task 1).

- [ ] **Step 1: 홈 목록에 is_active 필터 추가**

In `apps/web/app/goods/page.tsx`, find the main goods query and add `.eq('is_active', true)`:

```tsx
// 변경 전
  let query = supabase
    .from('goods')
    .select('id, title, description, price, discount_rate, images, status, categories(name, slug)')
    .or(`published_at.is.null,published_at.lte.${now}`)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })

// 변경 후 (.eq('is_active', true) 한 줄 추가)
  let query = supabase
    .from('goods')
    .select('id, title, description, price, discount_rate, images, status, categories(name, slug)')
    .eq('is_active', true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
```

- [ ] **Step 2: 상세 페이지 — 비활성 상품 404**

In `apps/web/app/goods/[id]/page.tsx`, add `.eq('is_active', true)` to the main item query (비활성이면 `data` null → 기존 `if (!item) notFound()`가 404 처리):

```tsx
// 변경 전
  const { data: item } = await supabase
    .from('goods')
    .select('*, categories(id, name, slug)')
    .eq('id', id)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .neq('status', 'draft')
    .single()

// 변경 후
  const { data: item } = await supabase
    .from('goods')
    .select('*, categories(id, name, slug)')
    .eq('id', id)
    .eq('is_active', true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .neq('status', 'draft')
    .single()
```

- [ ] **Step 3: 상세 페이지 — 관련 상품에도 필터**

In the same file, add `.eq('is_active', true)` to the related-products query:

```tsx
// 변경 전
  const { data: relatedData } = await supabase
    .from('goods')
    .select('id, title, description, price, discount_rate, images, status, categories(name, slug)')
    .eq('category_id', item.category_id)
    .neq('id', id)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .neq('status', 'draft')
    .limit(4)

// 변경 후
  const { data: relatedData } = await supabase
    .from('goods')
    .select('id, title, description, price, discount_rate, images, status, categories(name, slug)')
    .eq('category_id', item.category_id)
    .neq('id', id)
    .eq('is_active', true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .neq('status', 'draft')
    .limit(4)
```

- [ ] **Step 4: 타입체크 + 린트**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint app/goods
```
Expected: 0 errors (기존 warning 외 신규 없음).
> 주: 이 단계는 `is_active` 컬럼이 Supabase에 없어도 컴파일된다(런타임 쿼리만 컬럼 필요). dev 서버/DB 접속은 하지 않는다.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/goods/page.tsx apps/web/app/goods/[id]/page.tsx
git commit -m "feat(goods): hide inactive products from storefront + detail 404"
```

---

## Task 3: 인라인 노출 토글 컴포넌트

**Files:**
- Create: `apps/web/app/(admin)/admin/goods/_components/ToggleActiveButton.tsx`

**Interfaces:**
- Consumes: `@/lib/supabase/client` `createClient()`, `next/navigation` `useRouter`, `goods.is_active` (Task 1).
- Produces: `ToggleActiveButton({ id: string; isActive: boolean })` (default export).

- [ ] **Step 1: 컴포넌트 작성**

Create `apps/web/app/(admin)/admin/goods/_components/ToggleActiveButton.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ToggleActiveButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('goods').update({ is_active: !isActive }).eq('id', id)
    setBusy(false)
    if (error) {
      alert('노출 상태 변경 실패: ' + error.message)
      return
    }
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="text-xs px-2 py-1 rounded-full transition-opacity hover:opacity-70 disabled:opacity-40"
      style={
        isActive
          ? { backgroundColor: '#DCFCE7', color: '#166534' }
          : { backgroundColor: '#E8E5E0', color: '#6B6862' }
      }
      aria-pressed={isActive}
    >
      {isActive ? '노출' : '미노출'}
    </button>
  )
}
```

- [ ] **Step 2: 타입체크 + 린트**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint "app/(admin)/admin/goods/_components/ToggleActiveButton.tsx"
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(admin)/admin/goods/_components/ToggleActiveButton.tsx"
git commit -m "feat(admin): goods active toggle button"
```

---

## Task 4: 관리 목록 — 등록일·노출 컬럼 + 노출여부 필터

**Files:**
- Modify: `apps/web/app/(admin)/admin/goods/page.tsx`

**Interfaces:**
- Consumes: `ToggleActiveButton` (Task 3); `goods.is_active`/`created_at` (Task 1).

- [ ] **Step 1: import + searchParams + 타입 확장**

In `apps/web/app/(admin)/admin/goods/page.tsx`:

(a) Add the import near the other component imports (after `DeleteGoodsButton` import):
```tsx
import ToggleActiveButton from './_components/ToggleActiveButton'
```

(b) Extend the `searchParams` Props type — add `active?: string`:
```tsx
// 변경 전
  searchParams: Promise<{ q?: string; status?: string; category?: string; from?: string; to?: string; page?: string }>
// 변경 후
  searchParams: Promise<{ q?: string; status?: string; category?: string; active?: string; from?: string; to?: string; page?: string }>
```

(c) Extend the `GoodsListRow` type — add `is_active` and `created_at`:
```tsx
// 변경 전
type GoodsListRow = {
  id: string
  title: string
  price: number
  discount_rate: number | null
  stock_quantity: number | null
  status: string
  images: string[] | null
  category_id: string | null
  categories: { name: string } | null
}
// 변경 후 (두 필드 추가)
type GoodsListRow = {
  id: string
  title: string
  price: number
  discount_rate: number | null
  stock_quantity: number | null
  status: string
  images: string[] | null
  category_id: string | null
  categories: { name: string } | null
  is_active: boolean
  created_at: string
}
```

- [ ] **Step 2: 필터 상태 읽기 + 쿼리 select/필터 + spRecord/hasFilter**

(a) After `const dateTo = sp.to ?? ''` (필터 변수 읽는 블록), add:
```tsx
  const activeFilter = sp.active ?? ''
```

(b) Add `is_active, created_at` to the list query select:
```tsx
// 변경 전
    .select('id, title, price, discount_rate, stock_quantity, status, images, category_id, categories(name)', { count: 'exact' })
// 변경 후
    .select('id, title, price, discount_rate, stock_quantity, status, images, category_id, categories(name), is_active, created_at', { count: 'exact' })
```

(c) After the existing `if (statusFilter) query = query.eq('status', statusFilter)` line, add:
```tsx
  if (activeFilter) query = query.eq('is_active', activeFilter === 'true')
```

(d) In the `spRecord` block (pagination params), after `if (statusFilter) spRecord.status = statusFilter`, add:
```tsx
  if (activeFilter) spRecord.active = activeFilter
```

(e) Update `hasFilter` to include `activeFilter`:
```tsx
// 변경 전
  const hasFilter = q || statusFilter || categoryFilter || dateFrom || dateTo
// 변경 후
  const hasFilter = q || statusFilter || categoryFilter || activeFilter || dateFrom || dateTo
```

- [ ] **Step 3: 필터 폼에 노출여부 select 추가**

In the filter `<form>`, right after the status `<select name="status">…</select>` block, add:
```tsx
        <select
          name="active"
          defaultValue={activeFilter}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none"
          style={{ color: '#1C1C1C' }}
        >
          <option value="">전체 노출</option>
          <option value="true">노출</option>
          <option value="false">미노출</option>
        </select>
```

- [ ] **Step 4: 테이블 헤더 — 노출·등록일 추가**

In `<thead>`, after the `상태` header cell (`<th ...>상태</th>`) and before the empty actions header (`<th className="pb-3 font-normal w-28"></th>`), insert two headers:
```tsx
            <th className="pb-3 font-normal">노출</th>
            <th className="pb-3 font-normal">등록일</th>
```

- [ ] **Step 5: 테이블 바디 — 행 흐림 + 노출 토글·등록일 셀**

(a) Make the inactive row visually dim — change the `<tr>` opening tag inside `(goods ?? []).map((item) => ...)`:
```tsx
// 변경 전
              <tr key={item.id} style={{ borderTop: '1px solid #E8E5E0' }}>
// 변경 후
              <tr key={item.id} style={{ borderTop: '1px solid #E8E5E0', opacity: item.is_active ? 1 : 0.5 }}>
```

(b) After the status `<td>` cell (the one rendering the `status.label` badge, ends with `</td>`) and before the actions `<td>` cell (the one containing 수정 Link + `DeleteGoodsButton`), insert two cells:
```tsx
                <td className="py-3">
                  <ToggleActiveButton id={item.id} isActive={item.is_active} />
                </td>
                <td className="py-3 text-xs" style={{ color: '#6B6862' }}>
                  {new Date(item.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}
                </td>
```

(c) The empty-state row `colSpan` must grow by 2 (two new columns). Find the empty-state `<td colSpan={8} ...>` and change to `colSpan={10}`:
```tsx
// 변경 전
              <td colSpan={8} className="py-12 text-center text-sm" style={{ color: '#A8A49C' }}>
// 변경 후
              <td colSpan={10} className="py-12 text-center text-sm" style={{ color: '#A8A49C' }}>
```

- [ ] **Step 6: 타입체크 + 린트**

```bash
export PATH="/Users/cosmos/.local/node/bin:$PATH"
cd apps/web && node_modules/.bin/tsc --noEmit && node_modules/.bin/eslint app lib
```
Expected: tsc 0 errors; eslint 0 errors (기존 warning 외 신규 없음).

- [ ] **Step 7: 동작 검증 (/verify — 수동, 마이그레이션 021 적용 후)**

`pnpm dev` → 관리자 `/admin/goods`:
1. **등록일 컬럼** 표시(YYYY.MM.DD), **노출 컬럼**에 토글 버튼.
2. 어떤 상품 토글 **미노출** → 행이 흐려짐 → `/goods` 목록에서 사라짐 → `/goods/[id]` 직접 접속 시 404.
3. 토글 **노출** → 다시 홈에 나타남.
4. 노출여부 필터 `미노출` 선택 → 비활성 상품만 목록.
5. **sold_out 상품을 미노출**해도 상태 뱃지는 여전히 '품절'(status 유지).

- [ ] **Step 8: Commit**

```bash
git add "apps/web/app/(admin)/admin/goods/page.tsx"
git commit -m "feat(admin): goods list registration date + visibility toggle/filter"
```

---

## Self-Review 결과

**Spec coverage:**
- R1 등록일 컬럼 → Task 4 Step 4·5 ✓
- R2 is_active 플래그(기본 true) → Task 1 ✓
- R3 인라인 토글 → Task 3 + Task 4 Step 5 ✓
- R4 비활성 홈 목록+상세(404) 숨김 → Task 2 ✓
- R5 관리 목록 유지 + 흐림 → Task 4 Step 5(a) ✓
- R6 노출여부 필터 → Task 4 Step 2·3 ✓
- §4 관련상품 필터 → Task 2 Step 3 ✓
- §9 배포/마이그레이션 순서 → Global Constraints + Task 1 Step 3 ✓

**Placeholder scan:** 모든 스텝에 실제 코드/명령. TBD 없음.

**Type consistency:** `ToggleActiveButton({id, isActive})` 시그니처가 Task 3 정의 = Task 4 사용 일치. `GoodsListRow`에 `is_active: boolean`/`created_at: string` 추가가 select 문자열과 정합. `searchParams.active` 추가가 필터 로직과 정합.

**결정(스펙 대비 개선):** 노출 토글을 서버 액션(`toggleGoodsActive`) 대신 **브라우저 클라이언트 직접 update**로 구현 — 기존 `DeleteGoodsButton`과 동일 패턴(goods admin RLS가 이미 허용), 더 단순. `/goods`는 요청마다 동적 렌더라 토글 후 재방문 시 최신값 반영(별도 revalidate 불필요). 스펙 §5.3의 요구(목록에서 즉시 노출 전환)는 동일 충족.
