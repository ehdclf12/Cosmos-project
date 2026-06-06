# Cosmos — Stage 2 Design Spec
**독서 커뮤니티 플랫폼 · 2단계: 독서 클럽**

---

## Overview

Stage 2는 Stage 1(인프라 + 인증 + 책 기록/리뷰)을 기반으로 독서 클럽 기능을 추가한다.

**2단계 범위:** 클럽 생성/탐색/가입 + 클럽 피드(게시판) + 오프라인 모임 관리  
**3단계 (예정):** 소셜 피드 + 팔로우

---

## Tech Stack

Stage 1과 동일 스택 유지. 추가 사항:

| 영역 | 기술 |
|------|------|
| 지도 | 카카오맵 API (장소 검색) |
| 이미지 업로드 | Supabase Storage |
| 피드 | Supabase 일반 쿼리 + pull-to-refresh (Realtime 미사용) |

---

## 네비게이션 구조

Stage 1의 클럽 탭 "준비 중" 상태를 실제 기능으로 교체한다.

```
클럽 탭
├── 클럽 홈 (탐색)         — 공개 클럽 목록, 검색, 내가 속한 클럽
├── 클럽 상세
│   ├── 피드 탭           — 텍스트/이미지/책 공유 게시물
│   ├── 모임 탭           — 오프라인 모임 목록 + 생성
│   └── 멤버 탭           — 멤버 목록 + 역할 관리
├── 클럽 생성             — 이름/소개/태그/가입방식/인원 설정
└── 클럽 가입 플로우      — 공개(즉시) / 비공개(승인 대기) / 초대코드 입력
```

### 라우팅

```
웹:  /clubs                    — 탐색
     /clubs/new                — 생성
     /clubs/[id]               — 상세 (피드/모임/멤버 탭)
     /clubs/[id]/meetups/new   — 모임 생성

앱:  (tabs)/clubs/index        — 탐색
     clubs/[id]                — 상세
     clubs/new                 — 생성
```

---

## 데이터베이스 스키마 (Supabase)

### `clubs`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| name | text | 클럽 이름 |
| description | text (nullable) | 소개 |
| tags | text[] | 장르/주제 태그 |
| access_type | enum | `public` / `private` / `invite_only` |
| max_members | int (nullable) | 인원 제한 (null = 무제한) |
| invite_code | text (unique, nullable) | 초대 전용 코드 |
| cover_url | text (nullable) | 클럽 커버 이미지 |
| created_by | uuid (FK → profiles) | 클럽장 |
| created_at | timestamptz | |

### `club_members`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| club_id | uuid (FK → clubs) | |
| user_id | uuid (FK → profiles) | |
| role | enum | `leader` / `admin` / `member` |
| status | enum | `active` / `pending` (승인 대기) |
| joined_at | timestamptz | |

`(club_id, user_id)` unique 제약

### `club_posts`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| club_id | uuid (FK → clubs) | |
| author_id | uuid (FK → profiles) | |
| content | text (nullable) | 본문 (image_urls/book_id 중 하나 이상과 함께 제공) |
| image_urls | text[] (nullable) | 이미지 첨부 |
| book_id | uuid (FK → books, nullable) | 책 공유 |
| created_at | timestamptz | |

### `club_meetups`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| club_id | uuid (FK → clubs) | |
| created_by | uuid (FK → profiles) | |
| title | text | 모임 제목 |
| description | text (nullable) | |
| scheduled_at | timestamptz | 모임 일시 |
| location_text | text (nullable) | 직접 입력 주소 |
| location_map_id | text (nullable) | 카카오맵 장소 ID |
| location_url | text (nullable) | 지도 링크 URL |
| max_attendees | int (nullable) | |
| created_at | timestamptz | |

### `club_meetup_attendees`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| meetup_id | uuid (FK → club_meetups) | |
| user_id | uuid (FK → profiles) | |
| status | enum | `going` / `maybe` / `not_going` |

`(meetup_id, user_id)` unique 제약

### Row Level Security (RLS)

| 테이블 | 읽기 | 쓰기 |
|--------|------|------|
| clubs | 모든 유저 (탐색용, invite_only 포함 — 존재는 노출, 가입만 코드 필요) | 로그인 유저(생성), 클럽장만(수정/삭제) |
| club_members | 클럽 멤버만 | 본인만 |
| club_posts | 클럽 멤버만 | 클럽 멤버만 |
| club_meetups | 클럽 멤버만 | leader/admin만 |
| club_meetup_attendees | 클럽 멤버만 | 본인만 |

---

## 핵심 기능 플로우

### 클럽 생성
```
이름/소개/태그 입력
  → 가입 방식 선택 (공개 / 비공개 / 초대 전용)
  → 인원 제한 설정 (선택)
  → 생성 → 클럽장으로 자동 가입 → 클럽 상세 진입
```

### 클럽 탐색 & 가입
```
공개 클럽 목록 브라우징 / 키워드·태그 검색
  → [공개]      바로 참여 → 멤버 등록 → 피드 진입
  → [비공개]    가입 신청 → status=pending → 클럽장/운영진 승인 → 멤버 등록
  → [초대 전용] 초대 코드 입력 → 검증 → 멤버 등록
```

### 클럽 피드
```
피드 탭 진입 → 게시물 목록 (최신순, pull-to-refresh)
  → 글 작성: 텍스트 입력 + 이미지 첨부(선택) + 책 공유(선택)
  → 게시물 삭제: 본인 or leader/admin
```

### 오프라인 모임 관리
```
모임 탭 → 예정된 모임 목록 (날짜순)
  → [leader/admin] 모임 생성:
      제목/설명 → 일시 선택 → 장소 입력
        ├── 텍스트 직접 입력
        ├── 지도 검색 (카카오맵 API)
        └── URL 붙여넣기
      → 인원 제한(선택) → 저장
  → [모든 멤버] 참석 여부 선택: 갈게요 / 미정 / 못 가요
  → 모임 상세: 참석자 목록, 장소 지도 미리보기
```

### 멤버 관리
```
멤버 탭 → 멤버 목록 (역할별)
  → [leader] 운영진 임명/해제, 멤버 강퇴
  → [leader/admin] 가입 신청 승인/거절
  → [본인] 클럽 탈퇴
```

---

## 공통 훅 (`packages/shared/hooks`)

```typescript
// 클럽 탐색
useClubs(filter?)           // 공개 클럽 목록 (키워드/태그 필터)
useMyClubs()                // 내가 속한 클럽 목록

// 클럽 상세
useClub(clubId)             // 클럽 정보 + 내 역할
useClubMembers(clubId)      // 멤버 목록 + 가입 신청 목록

// 피드
useClubPosts(clubId)        // 게시물 목록 (페이지네이션)
useCreatePost()             // 게시물 작성

// 모임
useClubMeetups(clubId)      // 모임 목록
useCreateMeetup()           // 모임 생성
useUpdateAttendance()       // 참석 여부 변경

// 멤버십
useJoinClub()               // 가입 (공개/초대코드)
useRequestJoin()            // 가입 신청 (비공개)
useApproveMember()          // 승인/거절 (leader/admin)
useUpdateMemberRole()       // 역할 변경
```

---

## 에러 처리

| 상황 | 처리 |
|------|------|
| 인원 제한 초과 가입 시도 | "클럽 인원이 가득 찼습니다" 토스트 |
| 잘못된 초대 코드 | "유효하지 않은 초대 코드입니다" 인라인 에러 |
| 권한 없는 작업 (강퇴 등) | "권한이 없습니다" 토스트 |
| 이미 가입된 클럽 재가입 시도 | "이미 가입된 클럽입니다" 토스트 |
| 가입 신청 중복 | "승인 대기 중입니다" 토스트 |
| 이미지 업로드 실패 | 토스트 + 재시도 버튼 |

---

## 테스트 전략

**단위 테스트:** `packages/shared` 훅 — 가입 플로우 로직, 역할 권한 체크 유틸

**통합 테스트 (RLS 검증):**
- 비멤버가 club_posts 읽기 시도 → 차단 확인
- member가 club_meetups 생성 시도 → 차단 확인
- leader만 역할 변경 가능 확인

**E2E 핵심 플로우:**
1. 클럽 생성 → 탐색 → 공개 가입
2. 비공개 클럽 신청 → 승인 → 피드 접근
3. 모임 생성 → 참석 여부 선택
4. 게시물 작성 (텍스트 + 책 공유)
