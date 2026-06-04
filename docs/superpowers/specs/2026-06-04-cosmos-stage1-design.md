# Cosmos — Stage 1 Design Spec
**독서 커뮤니티 플랫폼 · 1단계: 인프라 + 인증 + 책 기록/리뷰**

---

## Overview

Cosmos는 책을 좋아하는 독자들이 소통하는 앱·웹 플랫폼이다. 전체 3단계로 구성되며, 1단계는 플랫폼의 기반을 구축한다.

**1단계 범위:** 모노레포 세팅 + 인증 + 책 기록/리뷰
**2단계 (예정):** 독서 클럽 (온라인 토론 + 오프라인 모임)
**3단계 (예정):** 소셜 피드 + 팔로우

---

## Tech Stack

| 영역 | 기술 |
|------|------|
| 모노레포 | Turborepo |
| 웹 | Next.js 15 (App Router) |
| 앱 | Expo (React Native, Expo Router) |
| 백엔드/DB | Supabase (PostgreSQL + Auth + Realtime) |
| 배포 | Vercel (웹), EAS Build (앱) |
| 공통 패키지 | TypeScript types, Supabase client, custom hooks |

---

## 네비게이션 구조

앱과 웹 모두 하단/사이드 탭 4개로 구성한다. 클럽 탭은 Stage 1에서 이미 노출하되 기능은 비활성(준비 중) 상태로 표시한다.

| 탭 | 아이콘 | Stage 1 상태 |
|----|--------|-------------|
| 홈 | 🏠 | 활성 — 최근 기록, 추천 |
| 책장 | 📚 | 활성 — 책 기록/리뷰 |
| 클럽 | 👥 | 노출 + 준비 중 안내 |
| 프로필 | 👤 | 활성 — 내 프로필 |

---

## 프로젝트 구조

```
cosmos/                          # Turborepo 루트
├── apps/
│   ├── web/                     # Next.js 15 (App Router)
│   │   └── app/
│   │       ├── (auth)/          # 로그인, 회원가입, 온보딩
│   │       ├── (main)/          # 메인 레이아웃 (4탭)
│   │       │   ├── page.tsx     # 홈
│   │       │   ├── books/       # 책 기록/리뷰
│   │       │   ├── clubs/       # 클럽 (준비 중 페이지)
│   │       │   └── profile/     # 프로필
│   │       └── ...
│   └── mobile/                  # Expo (React Native)
│       └── app/
│           ├── (auth)/          # 로그인, 회원가입, 온보딩
│           └── (tabs)/
│               ├── index.tsx    # 홈
│               ├── books.tsx    # 책 기록
│               ├── clubs.tsx    # 클럽 (준비 중)
│               └── profile.tsx  # 프로필
└── packages/
    ├── shared/                  # 웹·앱 공통 로직
    │   ├── types/               # TypeScript 타입
    │   ├── lib/supabase.ts      # Supabase 클라이언트
    │   └── hooks/               # useAuth, useBooks 등
    └── ui/                      # 공통 컴포넌트 (웹·앱 공유 가능한 것만)
```

---

## 디자인 시스템 (컬러 팔레트)

| 역할 | 색상 | HEX |
|------|------|-----|
| 배경 | 오프 화이트 | `#F2F1EE` |
| 카드 배경 | 웜 베이지 | `#C8C5BC` |
| 서브 카드 | 라이트 그레이 | `#D0CEC6` |
| 미디엄 텍스트 | 웜 그레이 | `#A8A49C` |
| 서브 텍스트 | 미디엄 그레이 | `#B8B4AC` |
| 강조 / 다크 | 차콜 | `#1C1C1C` |
| 다크 섹션 | 딥 차콜 | `#2A2A28` |

별 텍스처는 다크 배경 섹션(Quote, 강조 카드)에 선택적으로 적용한다.

---

## 데이터베이스 스키마 (Supabase)

### `profiles`
Supabase `auth.users`를 확장하는 공개 프로필 테이블.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | auth.users.id와 동일 |
| username | text (unique) | @핸들 |
| display_name | text | 표시 이름 |
| avatar_url | text | 프로필 이미지 URL |
| created_at | timestamptz | |

신규 가입 시 DB Trigger로 자동 생성.

### `books`
사용자가 직접 등록하는 책 정보.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| title | text | 제목 |
| author | text | 저자 |
| cover_url | text (nullable) | 표지 이미지 URL |
| publisher | text (nullable) | 출판사 |
| published_year | int (nullable) | 출판 연도 |
| created_by | uuid (FK → profiles) | 등록한 유저 |
| created_at | timestamptz | |

### `user_books`
개인 독서 기록 — 상태, 진행도, 메모.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles) | |
| book_id | uuid (FK → books) | |
| status | enum | `want_to_read` / `reading` / `finished` |
| current_page | int (nullable) | 현재 페이지 |
| total_pages | int (nullable) | 전체 페이지 수 |
| started_at | date (nullable) | 읽기 시작일 |
| finished_at | date (nullable) | 완독일 |
| memo | text (nullable) | 개인 메모 |
| created_at | timestamptz | |

`(user_id, book_id)` unique 제약 — 한 유저가 같은 책을 중복 등록 불가.

### `reviews`
공개/비공개 리뷰 및 별점.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles) | |
| book_id | uuid (FK → books) | |
| rating | int (1~5) | 별점 |
| content | text (nullable) | 리뷰 본문 |
| is_public | boolean | 공개 여부 (기본 true) |
| created_at | timestamptz | |

`(user_id, book_id)` unique 제약 — 책당 리뷰 1개.

### Row Level Security (RLS)

| 테이블 | 읽기 | 쓰기 |
|--------|------|------|
| profiles | 모든 유저 | 본인만 |
| books | 모든 유저 | 로그인 유저 |
| user_books | 본인만 | 본인만 |
| reviews | 공개 리뷰는 모두, 비공개는 본인만 | 본인만 |

---

## 인증

### 지원 방식
- 이메일 + 비밀번호
- 구글 OAuth
- 애플 OAuth (iOS 앱 필수)
- 카카오 OAuth (Supabase Custom OAuth)

### 인증 흐름

**회원가입:**
1. 이메일 입력 → 인증 메일 발송
2. 이메일 인증 완료
3. DB Trigger로 `profiles` 레코드 자동 생성
4. 온보딩 화면에서 username 설정 (최초 1회)
5. 메인 화면 진입

**로그인:**
1. 자격증명 입력 or 소셜 버튼 클릭
2. Supabase JWT 세션 발급
3. 웹: Next.js middleware에서 세션 검증
4. 앱: Expo SecureStore에 토큰 저장

### 화면 목록
- `/login` — 이메일 로그인 폼 + 소셜 로그인 버튼
- `/register` — 이메일 회원가입 폼
- `/onboarding` — username 설정 (최초 로그인 시만)

---

## 책 기록/리뷰 기능

### 핵심 플로우
```
책 검색 (등록된 책) 또는 신규 등록
  → 내 책장에 추가 + 상태 선택
  → 읽는 중: 진행도 업데이트 (현재 페이지, 날짜)
  → 읽음: 리뷰 + 별점 작성 (공개/비공개)
```

### 화면 목록

| 화면 | 경로 | 설명 |
|------|------|------|
| 내 책장 | `/books` | 상태별 탭 (읽고 싶음 / 읽는 중 / 읽음) + 책 카드 그리드 |
| 책 상세 | `/books/[id]` | 책 정보 + 내 진행도 + 내 리뷰 + 공개 리뷰 목록 |
| 책 등록 | `/books/new` | 제목·저자·출판사·표지 직접 입력 폼 |
| 진행도 수정 | 모달 | 현재 페이지, 시작일/완료일, 메모 |
| 리뷰 작성 | 모달 | 별점 + 텍스트 + 공개 여부 |

### 공통 훅 (`packages/shared/hooks`)

```typescript
useBooks(status?)         // 내 책 목록 (상태 필터 선택)
useBookDetail(bookId)     // 책 상세 + 내 기록 + 리뷰 목록
useAddBook()              // 신규 책 등록
useUpdateProgress()       // 진행도 업데이트
useWriteReview()          // 리뷰 작성/수정
```

---

## 에러 처리

- 네트워크 오류: 토스트 메시지 표시, 재시도 버튼 제공
- 인증 만료: 자동으로 `/login`으로 리다이렉트
- 중복 데이터 (같은 책 추가 시도): "이미 책장에 있는 책입니다" 안내
- 폼 유효성: 클라이언트 사이드에서 즉시 피드백

---

## 테스트 전략

- **단위 테스트:** `packages/shared` 훅 및 유틸 함수
- **통합 테스트:** Supabase RLS 정책 검증
- **E2E:** 회원가입 → 책 등록 → 진행도 업데이트 → 리뷰 작성 핵심 플로우

---

## Stage 2 사전 메모 — 독서 클럽

Stage 2에서 구현할 클럽 기능의 핵심 방향. Stage 1 클럽 탭은 이 비전을 기반으로 디자인한다.

**클럽 노출 비중:** 앱 전체에서 책 기록 다음으로 가장 prominent한 기능으로 배치.

**핵심 기능:**
- **클럽 생성:** 모임 이름·소개·태그(장르/주제)·인원 제한 설정 후 공개 모집
- **클럽 탐색:** 공개 클럽 목록 브라우징, 키워드/장르 검색
- **클럽 참여:** 공개 클럽 바로 참여 or 비공개 클럽 가입 신청
- **온라인 활동:** 클럽 내 채팅, 현재 읽는 책 공유, 진행도 비교
- **오프라인 활동:** 모임 일정 생성, 장소 공유, 참석 여부 관리
