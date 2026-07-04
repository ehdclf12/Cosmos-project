# 랜딩 콘텐츠 관리 — 설계 문서

- **날짜**: 2026-07-04
- **하위 프로젝트**: A (관리자 페이지 고도화 3부작 중 첫 번째)
- **상태**: 설계 확정
- **후속**: B(대시보드 강화), C(관리자 운영 기능)는 별도 spec으로 진행

---

## 1. 개요 (Overview)

현재 랜딩 페이지(`/`)의 모든 이미지·문구는 `app/landing/content.ts`에 **하드코딩**되어 있어, 콘텐츠를 바꾸려면 코드 수정·배포가 필요하다. 이를 **어드민에서 편집 가능한 DB 기반 콘텐츠**로 전환한다.

관리자는 `/admin/content`에서 랜딩의 이미지와 텍스트를 편집하고, **초안 → 미리보기 → 발행** 흐름으로 안전하게 반영한다. Hero(메인) 영역은 여러 이미지를 등록해 **자동 슬라이드 캐러셀**로 노출하며, 슬라이드 속도도 관리자가 지정한다.

## 2. 요구사항 (확정)

| # | 요구사항 |
|---|----------|
| R1 | 랜딩 10개 이미지 슬롯 + 관련 텍스트(제목/카테고리/문구/alt)를 어드민에서 편집 |
| R2 | Hero는 다중 이미지 → 자동 슬라이드 캐러셀. **슬라이드 속도(interval)를 관리자가 지정** |
| R3 | 각 슬롯은 고정 픽셀 크기로 렌더. 업로드 이미지는 `object-cover`로 자동 채움. 업로드 화면에 **권장 크기(px) 안내** 표시 |
| R4 | **초안 → 미리보기 → 발행** 워크플로. 발행 전까지 라이브 랜딩은 변하지 않음 |
| R5 | "테스트 화면" = 초안 데이터로 렌더된 실제 랜딩 미리보기 |

### 비목표 (Out of Scope)
- 크롭/리사이즈 도구 (object-cover로 대체)
- 슬롯 추가/삭제·순서 변경 (Hero 이미지 목록 제외), 섹션 노출 토글
- 발행 이력/롤백 (필요 시 후속)
- Hero 외 슬롯의 캐러셀화
- 대시보드/운영 기능 (하위 프로젝트 B·C)

## 3. 데이터 모델

### 3.1 테이블

```sql
create table public.site_content (
  key        text primary key,        -- 'landing' | 'landing_draft'
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
```

- **2개 행으로 초안/발행 분리**
  - `landing` — 발행본 (라이브 랜딩이 읽음, anon 공개)
  - `landing_draft` — 초안 (어드민만)
- 랜딩은 구조가 고정적이므로 정규화 테이블 대신 JSONB 단일 문서 사용.

### 3.2 RLS 정책

```sql
alter table public.site_content enable row level security;

-- 발행본만 공개 read (비로그인 랜딩 렌더용)
create policy "site_content_public_read" on public.site_content
  for select using (key = 'landing');

-- 관리자는 전체 접근 (기존 public.is_admin() 재사용)
create policy "site_content_admin_all" on public.site_content
  for all using (public.is_admin()) with check (public.is_admin());
```

> `is_admin()`은 기존 마이그레이션(006 등)에서 이미 정의·사용 중. 신규 정의 불필요.

### 3.3 Storage

- 신규 **`landing-images`** 버킷 (public). 업로드 흐름은 기존 `GoodsForm`의 Supabase Storage 업로드 패턴 재사용(`crypto.randomUUID()` 파일명 → `getPublicUrl`).
- `next.config.ts`의 `images.remotePatterns`에 이미 `*.supabase.co` 포함되어 있어 추가 설정 불필요.

### 3.4 시드 마이그레이션

`content.ts`의 현재 값(그대로 `/monet_*.png` public 경로)으로 `landing`, `landing_draft` 두 행을 초기화한다. → 배포 즉시 기존 화면 유지, 이미지 파일 이관 불필요. Hero는 아래 새 스키마로 변환하여 시드(단일 이미지 → images 배열 1개 + 기본 intervalMs).

## 4. 콘텐츠 JSON 스키마

기존 `LandingContent` 타입을 재사용하되 **Hero만 확장**한다.

```ts
// 변경: Hero — 단일 이미지 → 다중 이미지 + 슬라이드 속도
interface HeroContent {
  images: { src: string; alt: string }[]
  intervalMs: number          // 슬라이드 전환 간격 (ms). 관리자 지정
}

// 나머지 (Featured / GridItem / GridCard / Banner)는 기존 유지
interface LandingContent {
  hero: HeroContent
  section1: { featured: FeaturedContent; grid: GridItemContent[] }  // grid 4개
  section2: { items: GridCardContent[] }                            // 카드 3개
  section3: BannerContent
}
```

- 슬롯별 권장 크기(px)는 코드 상수(`SLOT_SPECS`)로 정의하여 업로드 UI 안내에 사용.

## 5. 렌더링 변경 (content.ts → DB)

- `app/landing/content.ts`: **타입 정의 + 기본값(fallback) 소스로만** 유지. `landingContent`는 `DEFAULT_LANDING_CONTENT`로 역할 전환.
- 신규 `lib/landing-content.ts`:
  - `getPublishedLandingContent(): Promise<LandingContent>` — `site_content` `landing` 행 read, 없거나 필드 누락 시 기본값과 merge.
  - `getDraftLandingContent(): Promise<LandingContent>` — `landing_draft` 행 read (admin RLS).
  - 순수 merge 함수 `withDefaults(data): LandingContent` 분리 → 유닛 테스트 대상.
- `app/page.tsx`: `async`로 전환, `getPublishedLandingContent()` 호출 후 기존과 동일하게 섹션에 props 전달. 발행 시 `revalidatePath('/')`로 갱신.
- **Hero 렌더**: 신규 `app/landing/sections/HeroCarousel.tsx` (클라이언트) — `images` 순회 자동 슬라이드, `intervalMs` 간격. 이미지 1장이면 정적 표시. 기존 `HeroSection`은 이 캐러셀을 감싸도록 수정.

## 6. 어드민 편집 UI — `/admin/content`

- 사이드바(`AdminSidebar`)에 **"콘텐츠 관리"** 메뉴 추가.
- `app/(admin)/admin/content/page.tsx` (서버): `getDraftLandingContent()` 로드 → `ContentEditor`에 전달.
- `ContentEditor.tsx` (클라이언트): 섹션별 편집 폼.
  - **Hero 블록** (`HeroImagesField`): 이미지 여러 장 추가/삭제/순서변경, 슬라이드 속도(초 단위 입력 → ms 저장).
  - **일반 슬롯** (`SlotImageField`): 이미지 업로드(권장 px 라벨) + 텍스트 필드.
- 하단 액션: `초안 저장` / `미리보기` / `발행`.
- 스타일: 기존 어드민 톤(`#1C1C1C`, `#E8E5E0` 카드) 준수.

## 7. 미리보기 & 발행

- **미리보기**: `app/(admin)/admin/content/preview/page.tsx` (admin 전용) — `getDraftLandingContent()`로 실제 랜딩 섹션을 렌더. 에디터에서 **iframe으로 임베드**(초안 저장 후 리로드) + "새 탭에서 열기" 링크.
- **발행**: `actions.ts`의 server action `publish()` — `landing_draft.data`를 `landing.data`로 복사, `updated_at` 갱신, `revalidatePath('/')` 호출.
- **초안 저장**: server action `saveDraft(data)` — `landing_draft` upsert.

## 8. 파일 구조

```
supabase/migrations/017_site_content.sql        # 테이블 + RLS + landing-images 버킷 + 시드
lib/landing-content.ts                          # fetch + withDefaults(merge) [유닛 테스트]
app/landing/content.ts                          # 타입 + DEFAULT_LANDING_CONTENT (역할 전환)
app/landing/sections/HeroCarousel.tsx           # 신규: 자동 슬라이드
app/landing/sections/HeroSection.tsx            # 캐러셀 사용하도록 수정
app/page.tsx                                    # async + 발행본 fetch
app/(admin)/admin/content/page.tsx              # 초안 로드 → 에디터
app/(admin)/admin/content/actions.ts            # saveDraft / publish
app/(admin)/admin/content/_components/
    ContentEditor.tsx
    HeroImagesField.tsx
    SlotImageField.tsx
app/(admin)/admin/content/preview/page.tsx      # 초안 렌더
app/(admin)/_components/AdminSidebar.tsx        # "콘텐츠 관리" 메뉴 추가
```

## 9. 테스트 & 검증

- **유닛 테스트(jest)**: `withDefaults()` — DB 데이터 누락/부분 존재 시 기본값 merge, Hero 배열 변환 정확성.
- **동작 검증(/verify)**: 어드민 로그인 → `/admin/content` 이미지 교체 + Hero 2장 등록 + 속도 변경 → 미리보기에서 확인 → 발행 → `/`에서 캐러셀/새 이미지 반영 확인.
- **린트/타입**: `eslint` 0 errors, `tsc --noEmit` 통과 (Supabase 결과는 로컬 row 타입으로 캐스트 — 기존 패턴 준수).

## 10. 엣지 케이스 / 결정사항

- **이미지 삭제 시 Storage 정리**: 이번 범위에서는 하지 않음(고아 파일 허용). 후속 개선 항목.
- **초안 미저장 상태로 발행**: 발행 버튼은 현재 초안(`landing_draft`)을 발행하므로, 편집 후 반드시 "초안 저장" 선행. UI에서 미저장 변경 경고.
- **Hero 이미지 0장**: 발행 검증에서 최소 1장 요구(빈 캐러셀 방지).
- **anon이 초안을 못 읽음**: RLS `public_read`가 `key = 'landing'`만 허용하므로 초안 노출 없음. 미리보기 라우트는 admin 세션으로만 접근.
- **랜딩 캐싱**: `app/page.tsx`가 DB를 읽으므로 발행 시 `revalidatePath('/')`로 무효화. 필요 시 라우트 세그먼트 캐시 설정 검토(구현 단계에서 Next 16 문서 확인).
