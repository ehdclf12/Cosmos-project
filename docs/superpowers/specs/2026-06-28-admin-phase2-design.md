# 관리자 페이지 고도화 2차 설계

**날짜:** 2026-06-28  
**범위:** 사이드바 재구성, 대시보드 개편, 상품/주문/고객 관리 고도화  
**독서클럽 관리:** 이번 범위에서 제외 (추후 별도 진행)

---

## 1. DB 마이그레이션

**파일:** `supabase/migrations/004_admin_phase2.sql`

### goods 테이블
- `stock_quantity integer not null default 0` 컬럼 추가
- 재고가 0이 되면 status를 자동으로 `sold_out`으로 전환하는 트리거 추가
- 기존 goods의 stock_quantity는 0으로 초기화 (관리자가 이후 수동 입력)

### orders 테이블 상태 확장
- 현재: `paid | cancelled`
- 추가: `preparing` (상품준비중), `shipping` (배송중), `delivered` (배송완료)
- status 컬럼 타입에 따라 check constraint 업데이트 또는 ALTER TYPE 적용
- 기존 paid 주문은 그대로 유지, 새 상태는 관리자가 수동 전환

---

## 2. 사이드바 (아코디언형)

**파일:** `apps/web/app/(admin)/_components/AdminSidebar.tsx`

### 네비게이션 구조
```
Cosmos Admin
─────────────
대시보드                    → /admin
▼ 상품관리                  ← 클릭 시 토글
   ├ 상품 목록              → /admin/goods
   └ 상품 등록              → /admin/goods/new
주문관리                    → /admin/orders
고객관리                    → /admin/customers
독서클럽                    → /admin/clubs
```

### 동작 규칙
- 상품관리 헤더는 링크가 아닌 토글 버튼
- `/admin/goods` 또는 `/admin/goods/**` 경로 진입 시 자동 펼침
- 서브메뉴 active 스타일: 현행과 동일 (검정 배경, 흰 글씨)
- 상품관리 헤더 active 스타일: 서브메뉴 열린 상태에서 반투명 처리

---

## 3. 대시보드 재구성

**파일:** `apps/web/app/(admin)/admin/page.tsx`

### 제거
- 전체 상품, 완료 주문, 취소 주문, 최근 주문 테이블

### 유지
- 오늘 방문자, 신규 회원(7일) 지표 카드
- 오늘 시간대별 방문 바 차트

### 추가: 최근 7일 매출 차트
- 데이터: `orders` 테이블에서 최근 7일 `status IN ('paid', 'delivered')` 주문의 `total_amount` 일별 합계
- 형태: 기존 시간대별 방문 차트와 동일한 CSS 바 차트 (외부 라이브러리 없음)
- 하단: "7일 총 매출 ₩XXX,XXX" 합계 표시
- 날짜 라벨: M/D 형식으로 7개 표시

### 레이아웃
```
[ 오늘 방문자 ]  [ 신규 회원 (7일) ]

─── 오늘 시간대별 방문 ───────────────────
  바 차트 (기존 유지)

─── 최근 7일 매출 ────────────────────────
  바 차트 + 하단 날짜 라벨
  7일 총 매출: ₩XXX,XXX
```

---

## 4. 상품관리 페이지

**파일:** `apps/web/app/(admin)/admin/goods/page.tsx`

### 상단 미니 대시보드
```
[ 전체 상품 N ]  [ 판매중 N ]  [ 완료 주문 N ]
```

### 검색/필터 바 (URL searchParams 기반)
- 상품명 텍스트 검색 (`title ilike %query%`)
- 상태 드롭다운: 전체 / 판매중(active) / 품절(sold_out) / 임시저장(draft)
- 날짜 범위: `created_at` 기준 시작일~종료일
- 검색 버튼으로 submit (debounce 없음)

### 목록 테이블 컬럼
```
이미지 | 상품명 | 가격 | 할인 | 재고 | 카테고리 | 상태 | 액션(수정/삭제)
```
- 재고(stock_quantity) 컬럼 추가
- 재고 0이면 수량 빨간색 표시

### 페이지네이션
- 20개/페이지
- 공통 Pagination 컴포넌트 사용

### 버그 수정
- 상품 등록 시 `status`가 `active`/`draft`일 때 저장 불가 버그
- `002_admin_rls.sql` RLS 정책 확인 후 원인 파악 및 수정

---

## 5. 상품 등록/수정 폼

**파일:** `apps/web/app/(admin)/admin/goods/_components/GoodsForm.tsx`

### 변경사항
- `재고 수량 (개)` 필드 추가 (number input, min=0)
- payload에 `stock_quantity` 포함
- 버그 수정 적용

---

## 6. 주문관리 페이지

**파일:** `apps/web/app/(admin)/admin/orders/page.tsx`

### 검색/필터 바 (URL searchParams 기반)
- 주문번호/고객명 텍스트 검색
- 상태 드롭다운: 전체 / 결제완료 / 상품준비중 / 배송중 / 배송완료 / 취소됨
- 날짜 범위: `created_at` 기준 시작일~종료일

### 목록 테이블
- 기존 컬럼 유지
- 주문번호 클릭 시 `/admin/orders/[id]` 이동
- OrderStatusSelect에 4단계 상태 반영

### 페이지네이션
- 20개/페이지, 공통 Pagination 컴포넌트 사용

---

## 7. 주문 상세 페이지 (신규)

**파일:** `apps/web/app/(admin)/admin/orders/[id]/page.tsx`

### 레이아웃
```
← 주문 목록

주문번호: XXXXXXXX                상태: [드롭다운]
주문일시: 2026-06-28

─── 주문 상품 ──────────────────────────
  상품명          수량    단가      소계
  ─────────────────────────────────────
                          합계  ₩XX,XXX

─── 주문자 정보 ────────────────────────
  이름: XXX
  이메일: xxx@xxx.com  → /admin/customers/[id] 링크
```

### 데이터
- `order_items(title, quantity, price)` 조인 — price 컬럼 없으면 구현 시 goods 테이블 조인으로 대체
- `profiles(display_name)` + auth.admin.getUserById로 이메일 조회

---

## 8. OrderStatusSelect 확장

**파일:** `apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx`

### 상태 옵션
```
결제완료(paid) → 상품준비중(preparing) → 배송중(shipping) → 배송완료(delivered)
                                                          ↘ 취소됨(cancelled)
```

---

## 9. 고객관리 페이지

**파일:** `apps/web/app/(admin)/admin/customers/page.tsx`

### 검색/필터 바 (URL searchParams 기반)
- 이름/이메일 텍스트 검색
- 날짜 범위: `created_at` 기준 가입일 시작~종료

### 페이지네이션
- 20개/페이지, 공통 Pagination 컴포넌트 사용

---

## 10. 공통 Pagination 컴포넌트 (신규)

**파일:** `apps/web/app/components/Pagination.tsx`

### Props
```ts
{
  page: number
  totalCount: number
  pageSize: number      // 기본 20
  searchParams: Record<string, string>  // 기존 필터 파라미터 유지
}
```

### 동작
- `page` searchParam을 업데이트하는 `<Link>` 기반 (서버 컴포넌트 친화적)
- 기존 검색/필터 파라미터는 그대로 유지
- 표시: `← 이전  1  2  3  ...  N  다음 →`
- 현재 페이지 ±2 범위 표시, 양 끝 항상 표시

---

## 파일 변경 목록

| 파일 | 작업 유형 |
|------|----------|
| `supabase/migrations/004_admin_phase2.sql` | 신규 |
| `apps/web/app/(admin)/_components/AdminSidebar.tsx` | 수정 |
| `apps/web/app/(admin)/admin/page.tsx` | 수정 |
| `apps/web/app/(admin)/admin/goods/page.tsx` | 수정 |
| `apps/web/app/(admin)/admin/goods/_components/GoodsForm.tsx` | 수정 |
| `apps/web/app/(admin)/admin/orders/page.tsx` | 수정 |
| `apps/web/app/(admin)/admin/orders/[id]/page.tsx` | 신규 |
| `apps/web/app/(admin)/admin/orders/_components/OrderStatusSelect.tsx` | 수정 |
| `apps/web/app/(admin)/admin/customers/page.tsx` | 수정 |
| `apps/web/app/components/Pagination.tsx` | 신규 |

---

## 구현 순서 (의존성 기준)

1. DB 마이그레이션 (004)
2. Pagination 공통 컴포넌트
3. AdminSidebar 아코디언
4. 대시보드 재구성
5. 상품관리 (버그 수정 포함)
6. 주문관리 + 주문 상세
7. 고객관리
