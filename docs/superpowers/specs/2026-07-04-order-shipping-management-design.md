# 주문관리 고도화 — 배송/송장 관리 설계 문서

- **날짜**: 2026-07-04
- **상태**: 설계 확정
- **범위**: 관리자 주문 상세에서 송장번호·택배사 입력(발송 처리), 고객 화면 배송조회

---

## 1. 개요 (Overview)

현재 주문관리는 상태 흐름(결제완료→상품준비중→배송중→배송완료/취소)과 상세(상품·취소·고객/배송정보)까지 갖췄으나, **송장번호·택배사 정보가 없어 배송 추적이 불가**하다. 관리자가 주문을 '배송중'으로 전환할 때 **택배사와 송장번호를 함께 입력**하게 하고, 고객이 자신의 주문 화면에서 **배송조회**를 할 수 있게 한다.

## 2. 요구사항 (확정)

| # | 요구사항 |
|---|----------|
| R1 | `orders`에 `courier`(택배사 코드), `tracking_number` 저장 |
| R2 | 관리자 주문 상세에 **"배송 처리" 카드** — 택배사 select + 송장번호 input + "발송 처리" 버튼 → `status='shipping'` + 송장 저장 |
| R3 | **'배송중' 전환은 발송 처리로만** 가능(송장 입력 강제). `OrderStatusSelect`에서 '배송중' 옵션 제거 |
| R4 | 이미 배송중/배송완료면 상세에 택배사·송장번호·**배송조회 링크** 표시 + **"송장 수정"** |
| R5 | 고객 화면(`/orders/[id]`, `/mypage/orders`)에 배송중/배송완료 시 택배사·송장번호 + **배송조회 버튼** |
| R6 | 배송조회는 통합 조회(tracker.delivery) 링크. 택배사는 고정 목록 |
| R7 | 관리자 상세에 **"송장용 정보" 블록** — 받는분·연락처·**우편번호(분리)**·주소·품목·주문번호를 송장 양식대로 정리 + **복사 버튼**(개별/전체). 택배사 시스템에 붙여넣기 용이 |

### 비목표 (Out of Scope)
- 발송일(`shipped_at`) 컬럼, 배송 상태 실시간 API 연동(웹훅)
- 목록 화면에서의 발송 처리(상세에서만)
- 택배사 자유 입력
- 고객 알림(이메일/SMS)

## 3. 데이터 모델 (마이그레이션 022)

```sql
alter table public.orders
  add column if not exists courier text,
  add column if not exists tracking_number text;
```

- 둘 다 nullable. 기존 주문은 null → 배송정보 미표시(자연스러움).
- 택배사는 **코드**(예: `cjlogistics`)로 저장. 코드↔라벨 매핑은 앱 상수(§4).

## 4. 택배사 목록 & 배송조회 (순수 유틸)

**위치 확정**: 순수 유틸(상수·함수)은 jest가 있는 **`packages/shared/src/couriers.ts`** 에 두고 `@cosmos/shared`로 export(대시보드/랜딩과 동일 패턴). 앱은 `import { COURIERS, trackingUrl, ... } from '@cosmos/shared'`.

`packages/shared/src/couriers.ts`:

```ts
export interface Courier { code: string; label: string }

export const COURIERS: Courier[] = [
  { code: 'cjlogistics', label: 'CJ대한통운' },
  { code: 'epost',       label: '우체국택배' },
  { code: 'hanjin',      label: '한진택배' },
  { code: 'lotte',       label: '롯데택배' },
  { code: 'logen',       label: '로젠택배' },
]

// 코드 → 라벨 (없으면 코드 그대로)
export function courierLabel(code: string | null): string { ... }

// 통합 배송조회 URL (tracker.delivery). 코드/번호 없으면 null
export function trackingUrl(courier: string | null, trackingNumber: string | null): string | null { ... }
// 형식: https://tracker.delivery/#/kr.{courier}/{trackingNumber}
```

- **순수 함수** → jest 테스트 대상. (`@cosmos/shared`의 dashboard/landing과 동일 패턴이나, Next 전용 상수라 `apps/web/lib`에 둔다. 유닛 테스트를 위해 `@cosmos/shared/src/couriers.ts`에 두는 방안도 가능 — 구현 계획에서 확정.)

### 4.1 배송지 파싱 (송장용 정보)
`shipping_address`는 체크아웃에서 `(${zonecode}) ${baseAddress} ${detailAddress}` 형식으로 저장된다. 우편번호를 분리하는 순수 함수:
```ts
// 예: "(12345) 서울시 ... 101동 202호" → { zonecode: "12345", address: "서울시 ... 101동 202호" }
// 형식이 안 맞으면 { zonecode: "", address: <원문> }
export function parseShippingAddress(shipping: string | null): { zonecode: string; address: string }
```
- **순수 함수** → jest 테스트(정상/형식불일치/null).

## 5. 관리자 배송 처리 (`/admin/orders/[id]`)

### 5.1 배송 처리 카드
주문 상세에 카드 추가. 현재 `order.status` 기준:
- **`paid` 또는 `preparing`**: 택배사 `<select>`(COURIERS) + 송장번호 `<input>` + "발송 처리" 버튼.
  - 클릭 → `shipOrder(orderId, courier, trackingNumber)` 서버 액션: 택배사·송장 비었으면 에러. `orders.update({ status: 'shipping', courier, tracking_number })` + `revalidatePath`.
- **`shipping` 또는 `delivered`**: 택배사 라벨 + 송장번호 + **배송조회 링크**(새 탭) 표시 + "송장 수정"(폼 토글 → `updateTracking(orderId, courier, trackingNumber)`).
- **`cancelled`**: 배송 처리 영역 숨김.

### 5.2 상태 셀렉트 변경
`OrderStatusSelect`의 선택 옵션에서 **`shipping`(배송중) 제거**. 표기용 라벨 맵(STATUS_LABEL)에는 유지(이미 배송중인 주문 표시). 남는 선택지: 결제완료·상품준비중·배송완료·취소됨. (목록·상세 공용)

### 5.4 송장용 정보 블록
주문 상세에 **"송장용 정보" 카드** 추가(취소 주문 제외, 항상 표시). 송장 작성/붙여넣기용으로 다음을 라벨과 함께 정리:
- 받는분(`recipient_name`) · 연락처(`recipient_phone`) · **우편번호**(`parseShippingAddress`로 분리) · 주소(우편번호 제외 나머지) · 품목(`상품명 x수량` 목록) · 주문번호(`id` 앞 8자리 대문자)
- 각 항목에 **복사 버튼**, 상단에 **"전체 복사"** 버튼(모든 항목을 `라벨: 값` 줄바꿈 텍스트로 클립보드 복사).
- 클라이언트 컴포넌트(`navigator.clipboard.writeText`). 복사 시 잠깐 "복사됨" 피드백.

### 5.3 액션
`app/(admin)/admin/orders/[id]/actions.ts`에 추가(기존 `adminCancelOrderItem` 파일):
- `shipOrder(orderId, courier, trackingNumber): Promise<{error?: string}>` — 검증 후 update.
- `updateTracking(orderId, courier, trackingNumber): Promise<{error?: string}>` — 송장 수정(상태 변경 없음).
- `createAdminClient()` 사용(기존 주문 액션과 동일).

## 6. 고객 배송 정보

- `app/orders/[id]/page.tsx`, `app/mypage/orders/page.tsx`: 주문 쿼리에 `courier, tracking_number` 추가. status가 `shipping`/`delivered`이고 `tracking_number` 있으면 **택배사 라벨 + 송장번호 + "배송조회" 버튼**(`trackingUrl` 링크, `target="_blank"`).

## 7. 파일 구조

```
supabase/migrations/022_orders_shipping.sql                   # courier, tracking_number
packages/shared/src/couriers.ts                               # COURIERS + courierLabel + trackingUrl + parseShippingAddress (순수, jest)
app/(admin)/admin/orders/[id]/actions.ts                      # shipOrder / updateTracking (수정)
app/(admin)/admin/orders/[id]/_components/ShipmentForm.tsx    # 배송 처리 폼 (신규, 클라이언트)
app/(admin)/admin/orders/[id]/_components/WaybillInfo.tsx     # 송장용 정보 블록 + 복사 (신규, 클라이언트)
app/(admin)/admin/orders/[id]/page.tsx                        # 배송 처리 카드 + 송장용 정보 카드 (수정)
app/(admin)/admin/orders/_components/OrderStatusSelect.tsx    # '배송중' 옵션 제거 (수정)
app/orders/[id]/page.tsx                                      # 고객 배송정보 (수정)
app/mypage/orders/page.tsx                                    # 고객 배송정보 (수정)
```

## 8. 테스트 & 검증

- **jest**: `trackingUrl`(정상 코드/번호 → 올바른 URL, null 입력 → null), `courierLabel`(매핑/미지 코드 fallback), `parseShippingAddress`(정상 `(우편번호) 주소` 분리 / 형식불일치 → zonecode 빈값+원문 / null).
- **/verify**: (a) 상품준비중 주문 상세 → 택배사·송장 입력 → 발송 처리 → 배송중 전환 + 송장 표시, (b) 고객 주문 화면에 택배사·송장·배송조회 버튼, 링크 이동, (c) 송장 수정, (d) 목록/상세 상태 드롭다운에 '배송중' 없음, (e) **송장용 정보 블록**: 우편번호 분리 표시, 개별/전체 복사 동작(클립보드).
- **lint/tsc**: eslint 0 errors, tsc 통과.

## 9. 엣지 케이스 / 결정사항

- **배포 순서**: 앱이 `courier`/`tracking_number` 컬럼 참조(graceful fallback 없음) → **마이그레이션 022를 먼저 적용한 뒤 main 병합**. feature 브랜치라 병합 전 프로덕션 영향 없음.
- **발송 처리 검증**: 택배사 미선택 또는 송장번호 공백이면 에러 반환(배송중 전환 차단).
- **기존 주문**: courier/tracking null → 배송정보·조회 버튼 미표시.
- **배송조회 링크**: tracker.delivery는 택배사 코드(`kr.{code}`) 기반. COURIERS 코드가 tracker.delivery 규격과 일치하도록 정의.
- **취소 주문**: 배송 처리 영역 숨김. 취소는 기존 로직 유지(배송/송장과 무관).
