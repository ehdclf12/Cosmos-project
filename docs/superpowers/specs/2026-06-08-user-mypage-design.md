# User Identity & Mypage — Design Spec (Spec 1)

**Date:** 2026-06-08
**Status:** Approved

## Overview

사용자 신원 시스템(닉네임·전화번호)을 추가하고, 로그인 후 헤더에 닉네임을 표시하며, 마이페이지(`/mypage`)를 구현한다. 주문 시스템은 Spec 2에서 별도로 진행한다.

---

## DB 스키마 (Supabase)

### `profiles`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid PK FK → auth.users(id) ON DELETE CASCADE | |
| nickname | text UNIQUE NOT NULL | 헤더 및 마이페이지에 표시 |
| phone | text NOT NULL | 휴대폰 번호 |
| created_at | timestamptz | default now() |

**RLS:**
- SELECT: `auth.uid() = user_id` (본인만)
- INSERT: `auth.uid() = user_id` (회원가입 시 자동)
- UPDATE: `auth.uid() = user_id` (본인만 수정)

---

## 인증 흐름 변경

### 회원가입 폼 (`/register`)

기존 필드에 닉네임 + 휴대폰 번호 추가. 필드 순서:
1. 이메일
2. 닉네임 (필수, 중복 불가)
3. 휴대폰 번호 (필수)
4. 비밀번호 (6자 이상)
5. 비밀번호 확인

처리 순서:
1. `supabase.auth.signUp({ email, password })` 호출
2. 성공 시 `profiles` 테이블에 `{ user_id, nickname, phone }` insert
3. `/`로 리다이렉트

닉네임 중복 시 에러 메시지: "이미 사용 중인 닉네임입니다."

### 헤더 (`LandingHeader`)

`LandingHeader`는 `LandingClient`('use client') 안에서 렌더링되므로 Supabase 브라우저 클라이언트로 세션 확인 가능.

- **비로그인:** 기존 "Log In" + "Sign Up" 버튼 유지
- **로그인:** "[닉네임]" 텍스트 버튼 (클릭 → `/mypage`) + "Log Out" 버튼

`LandingHeader`에 auth 상태 prop을 내려받거나, 내부에서 `useEffect`로 세션 확인.

---

## 마이페이지 구조

### 라우트

| 경로 | 내용 |
|------|------|
| `/mypage` | 프로필 정보 + 닉네임·전화번호 수정 |
| `/mypage/wishlist` | 찜한 상품 목록 |
| `/mypage/clubs` | 가입한 클럽 목록 |
| `/mypage/books` | 읽은 책 목록 |

### 레이아웃 (`app/mypage/layout.tsx`)

랜딩 스타일: `LandingClient` (헤더+사이드바) + 본문 2컬럼 구조.

```
┌──────────────────────────────────────┐
│  [LandingClient: 헤더 + 사이드바]      │
├────────────┬─────────────────────────┤
│ 좌측 메뉴  │ 우측 콘텐츠             │
│ (240px)   │                         │
│           │                         │
└────────────┴─────────────────────────┘
```

**좌측 메뉴 항목:**
```
[닉네임] 님
─────────────
내 정보
  └ 프로필 수정   → /mypage
찜한 목록
  └ 상품          → /mypage/wishlist
가입한 클럽        → /mypage/clubs
읽은 책           → /mypage/books
─────────────
로그아웃
```

현재 활성 경로는 텍스트 강조 (color: #1C1C1C, 나머지 #A8A49C).

### 비로그인 접근 제어

`app/mypage/layout.tsx` 서버 컴포넌트에서 Supabase 서버 클라이언트로 세션 확인. 비로그인이면 `redirect('/login')`.

### 각 탭 콘텐츠

**`/mypage` — 프로필 수정**
- 닉네임, 전화번호 인라인 수정 폼 (클라이언트 컴포넌트)
- 저장 시 `profiles` 테이블 UPDATE
- 닉네임 중복 시 에러 표시

**`/mypage/wishlist` — 찜한 상품**
- `goods_wishlist` JOIN `goods` JOIN `categories` 조회
- 기존 `GoodsCard` 컴포넌트 재사용 (그리드)
- 비어있으면: "찜한 상품이 없습니다."

**`/mypage/clubs` — 가입한 클럽**
- `club_members` JOIN `clubs` 조회 (user_id = 본인)
- 클럽 카드 목록 (이름, 설명, 태그)
- 클릭 시 `/clubs/[id]`로 이동
- 비어있으면: "가입한 클럽이 없습니다."

**`/mypage/books` — 읽은 책**
- `user_books` 조회 (status = 'finished' 또는 전체)
- 책 카드 목록 (표지, 제목, 저자, 읽기 상태)
- 클릭 시 `/books/[id]`로 이동
- 비어있으면: "등록한 책이 없습니다."

---

## 파일 구조

```
apps/web/app/mypage/
  layout.tsx               # 랜딩 헤더+사이드바 + 좌측 메뉴 (서버, 인증 체크)
  page.tsx                 # 프로필 수정 (서버 → 클라이언트 폼)
  wishlist/page.tsx        # 찜한 상품
  clubs/page.tsx           # 가입한 클럽
  books/page.tsx           # 읽은 책
  _components/
    MypageSidebar.tsx      # 좌측 메뉴 (클라이언트, 현재 경로 강조)
    ProfileForm.tsx        # 닉네임·전화번호 수정 폼 (클라이언트)

apps/web/app/landing/
  LandingHeader.tsx        # 수정: 로그인 상태에 따라 닉네임/버튼 분기

apps/web/app/(auth)/
  register/page.tsx        # 수정: 닉네임 + 전화번호 필드 추가
```

---

## 색상 팔레트

기존 랜딩 스타일 유지:
- 배경: `#F2F1EE`
- 주 텍스트: `#1C1C1C`
- 보조 텍스트: `#A8A49C`
- 3차 텍스트: `#6B6862`
- 구분선: `#E8E5E0`

---

## 범위 외 (Spec 2)

- 주문 시스템 (orders, order_items 테이블)
- 주문 현황 탭
- 결제 연동
