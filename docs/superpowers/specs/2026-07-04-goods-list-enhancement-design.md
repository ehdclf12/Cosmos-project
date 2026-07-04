# 상품 목록 페이지 개선 — 설계 문서

- **날짜**: 2026-07-04
- **상태**: 설계 확정
- **범위**: 관리자 상품 목록(`/admin/goods`)에 등록일 표시 + 상품별 노출 토글(`is_active`) 추가

---

## 1. 개요 (Overview)

관리자 상품 목록에 두 가지를 추가한다.

1. **상품 등록일 표시** — 날짜별 검색·트래킹을 위해 목록에 `created_at`을 컬럼으로 노출. (날짜 from~to 필터는 이미 존재하나 등록일 컬럼 자체는 없음)
2. **상품별 비활성화(홈 미노출) 토글** — 상품을 `sold_out` 상태로 유지하면서도 홈에서 완전히 숨길 수 있도록 `status`와 독립된 노출 플래그 `goods.is_active`를 추가. 관리 목록에서는 계속 보여 이전 상품 트래킹이 가능.

현재 상품(goods)에는 노출 플래그가 없어, `sold_out` 상품은 홈 `/goods`에 "Sold Out"으로 그대로 노출된다. 개별 상품을 홈에서 빼려면 `draft`로 바꿔야 하는데 그러면 sold_out 표시를 잃는다. 이를 해결한다.

## 2. 요구사항 (확정)

| # | 요구사항 |
|---|----------|
| R1 | `/admin/goods` 목록에 **등록일 컬럼**(`created_at`, `YYYY.MM.DD`) 표시 |
| R2 | 상품별 **`is_active` 노출 플래그**(status와 독립). 기본 true |
| R3 | 목록에서 **인라인 토글**로 노출/미노출 즉시 전환 |
| R4 | 비활성(`is_active=false`) 상품은 홈 **목록 + 상세 모두 완전 숨김**(상세 직접 URL → 404) |
| R5 | 비활성 상품도 **관리 목록에는 그대로 표시**(트래킹). 비활성 행은 시각적으로 흐리게 구분 |
| R6 | 관리 목록에 **노출여부 필터**(전체/노출/미노출) 추가 |

### 비목표 (Out of Scope)
- 위시리스트에 이미 담긴 비활성 상품을 마이페이지 위시리스트에서 필터링 (기록은 유지, 클릭 시 404) — 필요 시 후속
- 상품 등록/수정 폼(GoodsForm)에서의 활성 체크박스 (토글은 목록 전용)
- 예약 노출(published_at) 로직 변경

## 3. 데이터 모델

### 3.1 컬럼 추가 (마이그레이션 021)

```sql
alter table public.goods
  add column if not exists is_active boolean not null default true;
```

- 기존 상품은 default `true`로 채워져 모두 노출 유지(회귀 없음). 신규 상품도 default true.
- `categories.is_active`(016)와 동일 패턴.
- RLS 변경 불필요: 공개 read는 기존 goods select 정책이 컬럼 단위가 아니므로 그대로 동작. 토글 write는 어드민 서비스 롤(아래) 사용.

## 4. 공개 노출 변경 (비활성 = 완전 숨김)

- **`app/goods/page.tsx`** (목록): 메인 goods 쿼리에 `.eq('is_active', true)` 추가.
- **`app/goods/[id]/page.tsx`** (상세):
  - 메인 상품 쿼리에 `.eq('is_active', true)` 추가 → 비활성 상품은 `notFound()`(404).
  - "관련 상품(related)" 쿼리에도 `.eq('is_active', true)` 추가.
  - `generateMetadata`의 title 조회 쿼리는 그대로 둠(제목만 조회, 노출과 무관 — 404는 본문 쿼리가 처리).

## 5. 관리자 목록 변경 (`/admin/goods`)

### 5.1 쿼리
- 목록 select에 `is_active`, `created_at` 추가.
- 노출여부 필터: `searchParams.active`(`''`|`'true'`|`'false'`) → `if (active) query = query.eq('is_active', active === 'true')`.

### 5.2 테이블
- **컬럼 순서**(확정): 이미지 · 상품명 · 가격 · 할인 · 재고 · 카테고리 · 상태 · **노출** · **등록일** · (관리 버튼).
- **등록일 컬럼**: `상태` 뒤 두 번째 신규 컬럼. `new Date(created_at)` → `YYYY.MM.DD` 표기.
- **노출 컬럼**: `상태` 바로 뒤. 각 행에 `ToggleActiveButton`(인라인 토글). 노출=강조, 미노출=흐림.
- **비활성 행**: `style={{ opacity: item.is_active ? 1 : 0.5 }}`로 구분.
- 필터 폼에 노출여부 select 추가(전체/노출/미노출), 초기화 링크 유지.

### 5.3 인라인 토글
- `ToggleActiveButton.tsx` (클라이언트): 현재 `is_active`와 `id`를 받아 버튼/스위치 렌더. 클릭 시 `toggleGoodsActive(id, next)` 서버 액션 호출 후 `router.refresh()`.
- `actions.ts`에 `toggleGoodsActive(id: string, isActive: boolean)` 추가 — `createAdminClient()`로 `goods.update({ is_active })` + `revalidatePath('/admin/goods')` + `revalidatePath('/goods')`. (주문 액션과 동일하게 서비스 롤 사용 → RLS 의존 없음, 어드민 라우트는 middleware가 보호)

## 6. 파일 구조

```
supabase/migrations/021_goods_is_active.sql                       # is_active 컬럼
app/(admin)/admin/goods/page.tsx                                  # 등록일·노출 컬럼 + 필터 (수정)
app/(admin)/admin/goods/_components/ToggleActiveButton.tsx        # 인라인 토글 (신규)
app/(admin)/admin/goods/actions.ts                               # toggleGoodsActive 추가 (수정)
app/goods/page.tsx                                               # is_active 필터 (수정)
app/goods/[id]/page.tsx                                          # is_active 필터 + related (수정)
```

## 7. 데이터 흐름

1. 관리자가 목록에서 토글 클릭 → `toggleGoodsActive(id, next)` → `goods.is_active` 갱신 → `revalidatePath` → 목록·홈 갱신.
2. 홈 `/goods` 및 상세 `/goods/[id]`는 `is_active = true`만 노출/접근 허용.
3. 관리 목록은 `is_active` 무관하게 전부 표시(+ 선택적 필터).

## 8. 테스트 & 검증

- **동작(/verify)**: 마이그레이션 적용 후 (a) 목록에 등록일 표시, (b) 상품 토글 OFF → `/goods` 목록에서 사라지고 `/goods/[id]` 404, 관리 목록엔 남고 흐리게 표시, (c) 토글 ON → 다시 노출, (d) 노출여부 필터 동작, (e) sold_out 상품을 비활성해도 status는 sold_out 유지.
- **lint/tsc**: eslint 0 errors, tsc 통과. untyped Supabase 결과는 로컬 타입 캐스트(기존 컨벤션).

## 9. 엣지 케이스 / 결정사항

- **배포/마이그레이션 순서**: 021 미적용 상태로 앱이 배포되면 `is_active` 컬럼이 없어 목록·홈 쿼리(`.eq('is_active', ...)`)가 에러날 수 있음 → **마이그레이션 021을 먼저 적용**해야 함(이번엔 graceful fallback 없음, 컬럼 참조라). 배포 안내에 명시.
- **기본값**: 전 상품 default true → 회귀 없음.
- **위시리스트**: 비활성 상품이 기존 위시리스트에 남아 있으면 목록엔 보이나 클릭 시 404. 이번 범위 밖(허용).
- **saveGoods**: payload에 `is_active`가 없어 상품 편집 저장 시 노출값이 덮어써지지 않음(유지).
- **auto_sold_out 트리거**: `is_active`와 무관(트리거는 stock/status만) → 상호작용 없음.
