# Goods & Tickets — Design Spec

**Date:** 2026-06-08
**Status:** Approved

## Overview

Goods & Tickets 페이지 구현. 랜딩 스타일(헤더 + 사이드바 유지)로 상품 목록 및 상세 페이지를 제공한다. 결제는 이번 범위에 포함하지 않으며, 나중에 관리자 상품 등록 기능을 붙일 수 있는 DB 구조를 설계한다.

## DB 스키마 (Supabase)

### `categories`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| name | text NOT NULL | 예: "Goods", "Tickets" |
| slug | text UNIQUE NOT NULL | URL용 식별자 |
| created_at | timestamptz | default now() |

### `goods`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| category_id | uuid FK → categories.id | |
| title | text NOT NULL | |
| description | text | 짧은 소개 |
| detail_content | text | 상세 페이지 본문 (긴 텍스트) |
| price | integer NOT NULL | 판매가 (원) |
| original_price | integer | 할인 전 가격, null이면 할인 없음 |
| images | text[] | 이미지 URL 배열, 첫 번째가 대표 이미지 |
| status | text NOT NULL | "available" \| "sold_out" |
| created_at | timestamptz | default now() |

### `goods_wishlist`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| goods_id | uuid FK → goods.id | |
| created_at | timestamptz | default now() |
| UNIQUE | (user_id, goods_id) | 중복 찜 방지 |

### RLS 정책
- `categories`: 전체 읽기 허용, 쓰기 불가 (관리자 기능은 추후)
- `goods`: 전체 읽기 허용, 쓰기 불가
- `goods_wishlist`: 본인 row만 읽기/쓰기/삭제

### 시드 데이터
- 카테고리: Goods, Tickets, Books
- 샘플 상품 5개 (카테고리별 분산, 할인 상품 포함, sold_out 1개)

## 페이지 구조

### `/goods` — 목록 페이지

**레이아웃:** 랜딩 헤더 + 사이드바 공유 (`app/goods/layout.tsx`)

**구성:**
1. 페이지 상단 타이틀 영역: "GOODS & TICKETS" 워드마크
2. 카테고리 필터: All / Goods / Tickets / Books … (쿼리 파라미터 `?category=slug`)
3. 상품 그리드: 3컬럼(데스크탑) / 2컬럼(태블릿) / 1컬럼(모바일)

**GoodsCard 컴포넌트:**
- 상품 이미지 (aspect-ratio 3:4)
- 카테고리 태그 (소문자, 회색)
- 상품명
- 가격: 할인가 강조 + 원가 취소선 + 할인율 표시
- SOLD OUT 오버레이 (status === "sold_out")
- 찜 버튼 (하트 아이콘): 로그인 시 토글, 비로그인 시 `/login` 이동

### `/goods/[id]` — 상세 페이지

**레이아웃:** 동일 랜딩 헤더 + 사이드바

**구성 (2컬럼):**

좌측 (60%):
- 메인 이미지 (전체 높이, object-cover)

우측 (40%):
- 카테고리 태그
- 상품명 (large, font-light)
- 구분선
- 가격 (할인가 크게 / 원가 취소선 / 할인율)
- 구분선
- 상세 설명 (`detail_content`, whitespace-pre-line)
- 찜 버튼 (텍스트형: "♡ 위시리스트에 추가" / "♥ 위시리스트에서 제거")

하단:
- "Related Items" 섹션: 같은 카테고리 상품 최대 4개 가로 스크롤 또는 그리드

### 라우팅 변경
- `LandingSidebar.tsx`: `Goods & Tickets` href `/coming-soon` → `/goods`

## 컴포넌트 파일 구조

```
apps/web/app/goods/
  layout.tsx          # 랜딩 헤더 + 사이드바 래퍼
  page.tsx            # 목록 페이지 (서버 컴포넌트)
  [id]/
    page.tsx          # 상세 페이지 (서버 컴포넌트)
  _components/
    GoodsCard.tsx     # 카드 (클라이언트 — 찜 버튼 인터랙션)
    GoodsGrid.tsx     # 그리드 래퍼
    CategoryFilter.tsx # 카테고리 필터 링크
    WishlistButton.tsx # 찜 버튼 (클라이언트)
```

## 색상 팔레트

기존 랜딩 스타일 그대로 사용:
- 배경: `#F2F1EE`
- 주 텍스트: `#1C1C1C`
- 보조 텍스트: `#A8A49C`
- 3차 텍스트: `#6B6862`
- 강조(할인가): `#1C1C1C` bold
- 취소선(원가): `#A8A49C`

## 데이터 페칭

- 목록/상세: 서버 컴포넌트에서 Supabase 서버 클라이언트로 직접 조회 (React Query 불필요)
- 찜 상태: 클라이언트 컴포넌트에서 Supabase 클라이언트로 조회 + 토글

## 범위 외 (추후)

- 장바구니 / 결제
- 관리자 상품 등록 UI
- 상품 이미지 다중 썸네일 전환
- 카테고리 관리자 추가/삭제
