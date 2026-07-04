# 관리자 대시보드 강화 — 설계 문서

- **날짜**: 2026-07-04
- **하위 프로젝트**: B (관리자 페이지 고도화 3부작 중 두 번째)
- **상태**: 설계 확정
- **선행**: A(랜딩 콘텐츠 관리) 완료·배포됨. **후속**: C(관리자 운영 기능)는 별도 spec.

---

## 1. 개요 (Overview)

현재 `/admin` 대시보드는 지표가 빈약하다 — 카드 2개(오늘 방문자, 신규 회원 7일)와 차트 2개(시간대별 방문, 7일 매출)뿐이고, 기간이 고정이며 커머스 핵심 지표(주문·상품·전환)가 없다.

이를 **커머스 중심 + 운영/재고 신호**를 담은 대시보드로 강화한다. 상단 **기간 토글(오늘/7일/30일)** 로 커머스 지표를 재계산하고 **직전 동일 기간 대비 증감%** 를 함께 보여준다. 차트는 기존과 동일하게 **순수 CSS/SVG**로 구현(의존성 0, 에디토리얼 톤 유지). 트래픽/전환 지표는 이번 범위에서 후순위로 두고 기존 것을 유지한다.

## 2. 요구사항 (확정)

| # | 요구사항 |
|---|----------|
| R1 | 상단 **기간 토글**: 오늘 / 7일 / 30일. `?range=today\|7d\|30d` URL 쿼리로 상태 유지(기본 7d) |
| R2 | **커머스 KPI 카드 4개**: 총매출 · 주문수 · 평균주문가(AOV) · 취소율. 각각 **직전 동일 기간 대비 증감%** 표시 |
| R3 | **매출·주문 추세 차트**: 선택 기간의 일별 시리즈 (SVG) |
| R4 | **인기 상품 Top 5**: 매출순(수량 병기), 각 상품 `/admin/goods/[id]` 링크 |
| R5 | **주문 상태 분포**: 기간 내 상태별 건수 (SVG 도넛) |
| R6 | **운영 신호(현재 상태, 기간 무관)**: 재고 부족 상품 목록 + 처리 대기 주문 건수 |
| R7 | 기존 **트래픽 영역**(오늘 방문자, 시간대별 방문)은 유지하되 하단으로 재배치 |
| R8 | 차트는 순수 CSS/SVG. 외부 차트 라이브러리 미도입 |

### 비목표 (Out of Scope)
- 커스텀 날짜 범위 선택기 (프리셋 토글만)
- 트래픽/전환율 신규 지표(방문→주문 전환 등) — 후속
- 실시간 갱신, 데이터 export, 차트 애니메이션/툴팁 고도화
- 관리자 운영 기능(권한/감사 로그 등, 하위 프로젝트 C)

## 3. 지표 정의

### 3.1 매출 인정 기준 (변경점)
- **매출 = `orders.status != 'cancelled'` 인 주문의 `total_amount` 합**.
- 현재 대시보드는 `status in ('paid','delivered')`만 집계해 `preparing`/`shipping`을 **누락**한다. 이를 "취소 제외 전체"로 바로잡는다.
- **주문수** = 기간 내 취소 제외 주문 건수. **AOV** = 매출 ÷ 주문수 (주문수 0이면 0).
- **취소율** = (기간 내 `cancelled` 주문수) ÷ (기간 내 전체 주문수). 분모 0이면 0.

### 3.2 기간 & 비교
- `today`: 오늘 00:00~현재 / 비교 대상 = 어제 같은 구간.
- `7d`: 최근 7일(오늘 포함) / 비교 = 직전 7일.
- `30d`: 최근 30일 / 비교 = 직전 30일.
- **증감%** = (현재 − 이전) ÷ |이전| × 100. 이전이 0이면: 현재 0 → 0%, 현재 >0 → "신규"(∞ 대신 텍스트 표기).
- 모든 기간 계산은 **서버 시각 기준**(현 코드와 동일; KST 보정은 후속 과제로 남김 — §8 참고).

### 3.3 랭킹 & 분포
- **인기 상품 Top 5**: 취소 안 된 `order_items`(주문이 취소 아님 + 아이템 status != 'cancelled')의 `quantity × unit_price` 합계 상위 5. `goods_id`로 그룹, 표기는 `title`. 각 행 `/admin/goods/[id]` 링크.
- **주문 상태 분포**: 기간 내 주문을 `status`별로 카운트 → 도넛(paid/preparing/shipping/delivered/cancelled).

### 3.4 운영 신호 (현재 상태, 기간 토글 영향 없음)
- **재고 부족**: `goods.stock_quantity <= 5 AND status = 'active'`, 재고 적은 순, 최대 10개 목록(각 상품 링크).
- **처리 대기 주문**: `orders.status IN ('paid','preparing')` 총 건수 → `/admin/orders?status=paid` 링크.

## 4. 데이터 & 순수 계산 레이어

### 4.1 순수 함수 (TDD, jest — `@cosmos/shared`)
DB에 의존하지 않는 계산 로직을 분리해 단위 테스트한다. `packages/shared/src/dashboard.ts`:

- `resolveRange(range: 'today'|'7d'|'30d', now: Date): { start: Date; end: Date; prevStart: Date; prevEnd: Date }` — 현재/직전 기간 경계 계산.
- `pctChange(current: number, previous: number): { pct: number; isNew: boolean }` — 증감%(이전 0 처리 포함).
- `bucketByDay(rows: {created_at: string; amount: number}[], start: Date, days: number): { date: string; total: number }[]` — 일별 버킷(빈 날 0 채움).
- `topProducts(items: {goods_id: string; title: string; quantity: number; unit_price: number}[], n: number): {goods_id; title; qty; revenue}[]` — 그룹·정렬·상위 N.

> `now`/`Date`는 인자로 주입해 테스트 가능하게 한다(하드코딩 금지).

### 4.2 DB 집계 레이어
`apps/web/lib/admin-dashboard.ts`:
- `getDashboardData(range)` — 위 순수 함수 + Supabase 쿼리를 조합해 페이지가 쓸 형태로 반환:
  - 현재/이전 기간 매출·주문수·취소수 (orders)
  - 일별 추세 시리즈 (orders → `bucketByDay`)
  - Top 5 상품 (order_items join)
  - 상태 분포 (orders group by status)
  - 운영 신호 (goods 재고, 대기 주문 수)
- Supabase 클라이언트는 untyped → 결과는 로컬 row 타입으로 `as unknown as T` 캐스트(기존 컨벤션, `as any` 금지).

## 5. 컴포넌트 구조 (순수 CSS/SVG)

```
app/(admin)/admin/page.tsx                     # 서버: ?range 파싱 → getDashboardData → 조립
app/(admin)/admin/_components/
    RangeToggle.tsx      # 오늘/7일/30일 토글 (next/link, ?range=)
    KpiCard.tsx          # 라벨·값·전기간 대비 ▲▼% (증감 색상)
    TrendChart.tsx       # 일별 매출/주문 SVG (막대)
    StatusDonut.tsx      # 상태 분포 SVG 도넛 + 범례
    TopProducts.tsx      # 인기상품 Top5 (링크)
    OpsSignals.tsx       # 재고부족 목록 + 대기주문 카드
    VisitCharts.tsx      # 기존 오늘 방문자·시간대별 방문 (page.tsx에서 추출)
```
- 기존 `page.tsx`의 방문/매출 로직 중 재사용 부분은 위 컴포넌트로 추출하고, 서버 컴포넌트가 조립한다.
- 스타일 토큰 준수: 텍스트/보더 `#1C1C1C`, 카드 `#E8E5E0`, 서브텍스트 `#6B6862`/`#A8A49C`, 증감 양수 초록/음수 빨강.

## 6. 데이터 흐름

1. `page.tsx`(서버)가 `searchParams.range`(기본 `7d`)를 읽는다.
2. `getDashboardData(range)` 호출 → 순수 함수로 기간 경계 계산 → Supabase 병렬 쿼리 → 집계.
3. 반환 데이터를 KPI/차트/랭킹/운영/트래픽 컴포넌트에 props로 전달.
4. `RangeToggle`은 `?range=` 링크 → 서버 재렌더로 전체 재계산(클라이언트 상태 없음).

## 7. 테스트 & 검증

- **유닛(jest)**: `resolveRange`(오늘/7d/30d 경계 + 직전기간), `pctChange`(양수/음수/이전 0/둘다 0), `bucketByDay`(경계·빈 날 채움·기간 밖 제외), `topProducts`(취소 제외·그룹 합산·정렬·N 컷).
- **동작(/verify)**: `?range` 3종 전환 시 KPI·추세·분포 재계산, Top5·재고·대기주문 링크 이동, **주문 0/상품 0 빈 상태**에서 안 깨짐(도넛/차트 0 처리).
- **lint/tsc**: eslint 0 errors, tsc 통과.

## 8. 엣지 케이스 / 결정사항

- **타임존**: 현 코드처럼 서버 TZ 기준. KST(+09:00) 정합은 이번 범위 밖(기존 대시보드도 동일). 후속 개선 후보.
- **이전 기간 0 매출**: 증감% 대신 "신규"/"—" 표기(0 나눗셈 방지).
- **빈 데이터**: 주문/상품 0이면 카드 0, 차트·도넛은 "데이터 없음" 플레이스홀더.
- **성능**: 30일도 소규모 데이터라 단순 집계로 충분(현 규모). 인덱스/집계뷰는 불필요(YAGNI).
- **매출 기준 변경**: §3.1처럼 "취소 제외 전체"로 변경 — 기존 `['paid','delivered']` 대비 preparing/shipping 포함. 의도된 수정.
- **order_items 취소 상태**: 부분취소(`order_items.status='cancelled'`)된 개별 아이템은 Top5 매출에서 제외.
