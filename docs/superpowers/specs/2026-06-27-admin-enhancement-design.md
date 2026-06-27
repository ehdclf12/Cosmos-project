# Admin 고도화 설계 — 2026-06-27

## 개요

Cosmos 어드민 페이지를 고도화한다. 스타일 일관성 정비, 대시보드 방문자 지표 추가, 상품 등록 UX 개선(가격 구조·이미지 업로드·노출 시간), 상품 상세 대시보드, 고객 상품 이미지 슬라이드쇼가 주요 범위다.

---

## 1. 전역 스타일 수정

- 모든 텍스트(라벨, 테이블 헤더, 서브텍스트 등) 색상 `#A8A49C` / `#6B6862` → `#1C1C1C` 으로 통일
- 모든 `input`, `textarea`, `select` 입력 필드 텍스트 색상 → `#1C1C1C`
- placeholder 텍스트는 기존 회색 유지

**적용 파일:**
- `(admin)/_components/AdminSidebar.tsx`
- `(admin)/admin/page.tsx`
- `(admin)/admin/goods/page.tsx`
- `(admin)/admin/goods/_components/GoodsForm.tsx`
- `(admin)/admin/orders/page.tsx`
- `(admin)/admin/orders/_components/OrderStatusSelect.tsx`
- `(admin)/admin/customers/page.tsx`
- `(admin)/admin/customers/[id]/page.tsx`

---

## 2. 대시보드 개선

### 2-1. Supabase 테이블 추가: `page_views`

```sql
create table public.page_views (
  id uuid default gen_random_uuid() primary key,
  path text not null,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);
```

RLS: 관리자만 조회 가능, 인증된 유저 + 비로그인 모두 insert 가능.

### 2-2. 트래킹 컴포넌트

- `apps/web/components/TrackPageView.tsx` — Client Component
- 마운트 시 현재 `pathname`을 `page_views`에 insert (supabase client)
- `apps/web/app/layout.tsx` 루트 레이아웃에 포함 (어드민 제외)

### 2-3. 대시보드 지표 카드

기존 3개 카드에 추가:
- **오늘 방문자 수**: `page_views`에서 오늘 날짜 count
- **신규 회원 (7일)**: `profiles`에서 최근 7일 count

### 2-4. 시간대별 방문 차트

- 오늘의 `page_views`를 시간대(0~23시)별로 그룹핑
- 단순 바 차트를 순수 CSS/div로 구현 (외부 차트 라이브러리 없음)
- 서버 컴포넌트에서 데이터 fetch, 클라이언트 컴포넌트로 렌더링

### 2-5. 독서클럽 관리 플레이스홀더

- `AdminSidebar`에 "독서클럽" 메뉴 추가
- `/admin/clubs` 라우트: "준비 중" 페이지

---

## 3. DB 스키마 변경: `goods` 테이블

### 마이그레이션 (`003_goods_enhancement.sql`)

```sql
-- original_price 제거, discount_rate / published_at 추가
alter table public.goods drop column if exists original_price;
alter table public.goods add column discount_rate integer default 0 check (discount_rate >= 0 and discount_rate <= 100);
alter table public.goods add column published_at timestamptz;
```

### 최종가 계산 로직

```
final_price = round(price * (1 - discount_rate / 100))
```

- DB에는 `price`(정가), `discount_rate`(할인율) 저장
- 화면 표시 시 계산해서 노출

### 고객 페이지 상품 노출 조건

goods 조회 쿼리에 필터 추가:
```sql
.or('published_at.is.null,published_at.lte.now()')
```

---

## 4. Supabase Storage 설정

- 버킷 이름: `goods-images`
- Public 버킷 (고객 페이지에서 URL로 직접 접근)
- 관리자만 upload/delete 가능 (RLS)

### 마이그레이션 추가

```sql
insert into storage.buckets (id, name, public)
values ('goods-images', 'goods-images', true);

create policy "goods_images_admin_upload" on storage.objects
  for insert using (public.is_admin() and bucket_id = 'goods-images');

create policy "goods_images_public_read" on storage.objects
  for select using (bucket_id = 'goods-images');

create policy "goods_images_admin_delete" on storage.objects
  for delete using (public.is_admin() and bucket_id = 'goods-images');
```

---

## 5. 상품 등록/수정 폼 (GoodsForm) 개선

### 5-1. 가격 구조 변경

- 기존: 가격 + 원가 (2 input)
- 변경: 정가 + 할인율(%) → 최종가 실시간 미리보기
- UI: `정가 [____원]  할인율 [___%]  →  최종가: X,XXX원`

### 5-2. 이미지 업로드

- 파일 선택 버튼 + 드래그앤드롭 영역
- 선택 즉시 Supabase Storage `goods-images/{goods_id}/` 에 업로드
- 업로드된 이미지 미리보기 썸네일 (삭제 버튼 포함)
- 순서 변경: 썸네일 드래그로 순서 조정 (없으면 삭제 후 재업로드)
- 최대 10장

### 5-3. 노출 시간

- `published_at` datetime-local input
- 비워두면 즉시 노출 (null = 항상 노출)
- UI 라벨: "노출 시작 시간 (비워두면 즉시 노출)"

---

## 6. 상품 관리 — 상품별 대시보드

### 라우트: `/admin/goods/[id]`

상품 목록에서 상품명 클릭 → 상품 상세 대시보드 페이지

**표시 정보:**
- 상품 기본 정보 (이미지, 이름, 가격, 상태)
- 총 판매 수량 / 총 판매 금액
- 찜 수 (`goods_wishlist` count)
- 해당 상품 관련 주문 목록 (주문자, 수량, 금액, 상태, 일시)
- "수정" 버튼 → `/admin/goods/[id]/edit`

---

## 7. 고객 상품 상세 페이지 — 이미지 슬라이드쇼

### 대상 파일: `apps/web/app/goods/[id]/page.tsx`

- 이미지가 1장이면 기존 단일 이미지 표시 유지
- 이미지가 2장 이상이면 슬라이드쇼로 전환
- 좌/우 화살표 버튼으로 이동
- 하단 dot indicator (현재 페이지 표시)
- Client Component (`GoodsImageSlider.tsx`)

### 상품 목록 카드 (`/goods`)

- 첫 번째 이미지만 고정 노출 (변경 없음)

---

## 구현 순서

1. 전역 스타일 수정 (빠른 정리)
2. DB 마이그레이션 (`003_goods_enhancement.sql`, `page_views` 테이블, Storage 버킷)
3. GoodsForm 개선 (가격 구조 + 이미지 업로드 + 노출 시간)
4. 상품별 대시보드 페이지
5. 대시보드 방문자 지표 (TrackPageView + 차트)
6. 독서클럽 플레이스홀더
7. 고객 상품 상세 이미지 슬라이드쇼
8. 고객 상품 목록/상세 노출 조건 필터 적용

---

## 수동 설정 필요 항목

- Supabase 대시보드: `003` 마이그레이션 SQL 실행
- Supabase Storage: `goods-images` 버킷 생성 (마이그레이션에 포함)
