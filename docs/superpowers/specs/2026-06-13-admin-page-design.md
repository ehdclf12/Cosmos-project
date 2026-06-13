# Admin Page Design

**Date:** 2026-06-13  
**Status:** Approved

## Overview

Cosmos 관리자 페이지. 관리자가 상품을 등록/수정/삭제하고, 주문 상태를 관리하며, 회원 정보를 조회할 수 있는 전용 영역.

## Auth Flow

- 기존 `/login` 페이지 공유. 로그인 후 `user.app_metadata.role === 'admin'`이면 `/admin`으로 리다이렉트, 일반 유저는 `/`로.
- `middleware.ts`에서 `/admin/*` 경로 보호: 비로그인 → `/login`, role이 admin이 아닌 경우 → `/` 리다이렉트.
- 관리자 계정 설정은 Supabase 대시보드 → Authentication → Users에서 해당 계정의 `app_metadata`에 `{"role": "admin"}` 수동 입력.

## Route Structure

```
apps/web/app/
└── (admin)/
    ├── layout.tsx                        ← 관리자 전용 레이아웃 (사이드바 + 헤더)
    └── admin/
        ├── page.tsx                      ← 대시보드
        ├── goods/
        │   ├── page.tsx                  ← 상품 목록
        │   ├── new/page.tsx              ← 상품 등록
        │   └── [id]/edit/page.tsx        ← 상품 수정
        ├── orders/
        │   └── page.tsx                  ← 주문 목록 + 상태 변경
        └── customers/
            ├── page.tsx                  ← 회원 목록
            └── [id]/page.tsx             ← 회원 상세
```

## Layout

관리자 레이아웃은 `(main)` 레이아웃과 완전히 별개.  
좌측 사이드바에 4개 메뉴: 대시보드 / 상품 관리 / 주문 관리 / 고객 관리.

## Pages

### 대시보드 (`/admin`)
- 요약 카드 3개: 전체 상품 수, 전체 주문 수 (paid/cancelled 구분), 전체 회원 수
- 최근 주문 5건 테이블 미리보기

### 상품 관리 (`/admin/goods`)
- 테이블: 이미지 썸네일, 상품명, 가격, 카테고리, 상태
- 행마다 수정 / 삭제 버튼
- 상단 `+ 상품 등록` 버튼 → `/admin/goods/new`

**등록/수정 폼 필드**
- 상품명 (필수)
- 설명
- 가격 (필수)
- 원가
- 카테고리 (categories 테이블에서 select)
- 이미지 URL
- 상태: `active` / `sold_out` / `draft`

### 주문 관리 (`/admin/orders`)
- 테이블: 주문번호, 회원명, 상품 목록, 총액, 상태, 주문일
- 상태 드롭다운으로 인라인 변경 (`paid` → `cancelled`)

### 고객 관리 (`/admin/customers`)
- 회원 목록 테이블: 이름, 이메일, 가입일, 총 주문 수
- 회원 클릭 → 상세 페이지

**회원 상세 (`/admin/customers/[id]`)**
- 기본 정보: 이름, 이메일, 가입일
- 주문 내역 테이블
- 위시리스트 목록

## Database

마이그레이션 파일: `supabase/migrations/002_admin_rls.sql`

```sql
-- 관리자 role 확인 헬퍼 함수
create or replace function public.is_admin()
returns boolean as $$
  select (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
$$ language sql stable;

-- goods: 관리자 전체 접근 (insert, update, delete)
create policy "goods_admin" on public.goods
  using (public.is_admin()) with check (public.is_admin());

-- orders: 관리자 전체 조회 + 상태 수정
create policy "orders_admin_select" on public.orders
  for select using (public.is_admin());
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin());

-- profiles: 관리자 전체 조회
create policy "profiles_admin_select" on public.profiles
  for select using (public.is_admin());

-- wishlist: 관리자 조회
create policy "wishlist_admin_select" on public.wishlist
  for select using (public.is_admin());
```

## Security

- middleware에서 서버 사이드로 role 검증 (클라이언트 우회 불가)
- 모든 관리자 페이지는 서버 컴포넌트로 구현해 데이터 fetching 시 role 재확인
- RLS 정책이 최종 방어선: 클라이언트에서 직접 Supabase 호출 시에도 관리자 아닌 경우 차단
