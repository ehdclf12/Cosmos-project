# Cosmos Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turborepo 모노레포 기반 Cosmos Stage 1 — 4탭 네비게이션 + 로그인 UI(무늬) + 책 기록/리뷰(Supabase 실연동)

**Architecture:** Next.js 15(웹) + Expo(앱)을 Turborepo + pnpm workspaces로 관리. 로그인은 UI만 구현(버튼 클릭 시 메인 이동). 앱 시작 시 Supabase 익명 로그인 자동 처리로 books 기능의 user_id 확보. packages/shared에서 타입·Zod 스키마·쿼리 함수·TanStack Query 훅 공유.

**Tech Stack:** Turborepo, pnpm, Next.js 15 (App Router), Expo SDK 52 (Expo Router), Supabase (PostgreSQL + RLS + Anonymous Auth), TypeScript, Tailwind CSS, NativeWind v4, shadcn/ui, TanStack Query v5, React Hook Form, Zod, Jest

---

## File Map

```
cosmos/
├── turbo.json
├── package.json                              # pnpm workspace root
├── tsconfig.base.json
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── middleware.ts                     # 미구현 — 추후 auth guard
│   │   ├── .env.local
│   │   └── app/
│   │       ├── layout.tsx                    # QueryClientProvider
│   │       ├── globals.css
│   │       ├── (auth)/
│   │       │   ├── login/page.tsx            # UI only
│   │       │   └── register/page.tsx         # UI only
│   │       └── (main)/
│   │           ├── layout.tsx                # 4탭 사이드바
│   │           ├── page.tsx                  # 홈
│   │           ├── books/
│   │           │   ├── page.tsx              # 내 책장
│   │           │   ├── new/page.tsx          # 책 등록
│   │           │   └── [id]/page.tsx         # 책 상세
│   │           ├── clubs/page.tsx            # 준비 중
│   │           └── profile/page.tsx          # 기본 프로필
│   └── mobile/
│       ├── package.json
│       ├── app.json
│       ├── tailwind.config.ts
│       ├── .env
│       └── app/
│           ├── _layout.tsx                   # root + QueryClient + Supabase anon auth
│           ├── (auth)/
│           │   ├── _layout.tsx
│           │   ├── login.tsx                 # UI only
│           │   └── register.tsx              # UI only
│           └── (tabs)/
│               ├── _layout.tsx               # 하단 탭
│               ├── index.tsx                 # 홈
│               ├── books/
│               │   ├── index.tsx             # 내 책장
│               │   ├── new.tsx               # 책 등록
│               │   └── [id].tsx              # 책 상세
│               ├── clubs.tsx                 # 준비 중
│               └── profile.tsx
└── packages/
    ├── shared/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts
    │       ├── types/
    │       │   └── index.ts                  # Profile, Book, UserBook, Review, BookStatus
    │       ├── schemas/
    │       │   └── index.ts                  # Zod schemas
    │       ├── queries/
    │       │   └── books.ts                  # Supabase query functions
    │       ├── hooks/
    │       │   └── books.ts                  # TanStack Query hooks
    │       └── __tests__/
    │           ├── schemas.test.ts
    │           └── books.test.ts
    └── ui/
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts
            └── BookCard.tsx                  # 웹·앱 공통 카드 (추후 확장)
```

---

## Task 1: Turborepo 모노레포 스캐폴딩

**Files:**
- Create: `turbo.json`, `package.json`, `tsconfig.base.json`
- Create: `apps/web/` (Next.js 15)
- Create: `apps/mobile/` (Expo)
- Create: `packages/shared/`, `packages/ui/`

- [ ] **Step 1: Turborepo + pnpm 초기화**

```bash
cd /Users/cosmos/Desktop/Cosmos
pnpm dlx create-turbo@latest . --package-manager pnpm
```

프롬프트에서 "Empty workspace" 선택. 생성된 `apps/`, `packages/` 폴더 확인.

- [ ] **Step 2: 루트 package.json 확인 및 수정**

`package.json` 내용이 아래와 같은지 확인:

```json
{
  "name": "cosmos",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 3: tsconfig.base.json 생성**

```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "jsx": "react-jsx"
  }
}
```

- [ ] **Step 4: turbo.json 설정**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 5: Next.js 앱 생성**

```bash
cd /Users/cosmos/Desktop/Cosmos/apps
pnpm dlx create-next-app@latest web \
  --typescript --tailwind --eslint \
  --app --no-src-dir --import-alias "@/*"
```

- [ ] **Step 6: Expo 앱 생성**

```bash
cd /Users/cosmos/Desktop/Cosmos/apps
pnpm dlx create-expo-app@latest mobile --template blank-typescript
cd mobile
pnpm add expo-router expo-secure-store @expo/vector-icons
pnpm add nativewind tailwindcss
```

- [ ] **Step 7: packages/shared 초기화**

```bash
mkdir -p /Users/cosmos/Desktop/Cosmos/packages/shared/src/{types,schemas,queries,hooks,__tests__}
```

`packages/shared/package.json`:
```json
{
  "name": "@cosmos/shared",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "jest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "@tanstack/react-query": "^5",
    "zod": "^3"
  },
  "devDependencies": {
    "@types/jest": "^29",
    "jest": "^29",
    "ts-jest": "^29",
    "typescript": "^5"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2020",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

`packages/shared/jest.config.ts`:
```typescript
import type { Config } from 'jest'
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: { '^@cosmos/shared(.*)$': '<rootDir>/src$1' },
}
export default config
```

- [ ] **Step 8: packages/ui 초기화**

```bash
mkdir -p /Users/cosmos/Desktop/Cosmos/packages/ui/src
```

`packages/ui/package.json`:
```json
{
  "name": "@cosmos/ui",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "peerDependencies": {
    "react": "*"
  }
}
```

- [ ] **Step 9: pnpm workspace 설정**

루트에 `pnpm-workspace.yaml` 생성:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 10: 의존성 설치 확인**

```bash
cd /Users/cosmos/Desktop/Cosmos
pnpm install
```

Expected: 모든 workspace 의존성 설치 완료, 에러 없음.

- [ ] **Step 11: 커밋**

```bash
git add .
git commit -m "feat: initialize Turborepo monorepo with Next.js and Expo"
git push origin main
```

---

## Task 2: Supabase DB 스키마 + RLS

**Files:**
- Create: `supabase/migrations/001_init.sql`

- [ ] **Step 1: Supabase 프로젝트 생성 (수동)**

1. https://supabase.com → 새 프로젝트 생성 ("cosmos")
2. Project URL, anon key 복사 (나중에 .env에 사용)
3. 대시보드 → SQL Editor 열기

- [ ] **Step 2: 테이블 + 트리거 생성**

Supabase SQL Editor에서 실행:

```sql
-- profiles
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- 신규 가입 시 profiles 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8),
    coalesce(new.raw_user_meta_data->>'full_name', '독자')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- books
create table public.books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text not null,
  cover_url text,
  publisher text,
  published_year integer,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

-- user_books
create type public.book_status as enum ('want_to_read', 'reading', 'finished');

create table public.user_books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  status public.book_status not null default 'want_to_read',
  current_page integer check (current_page >= 0),
  total_pages integer check (total_pages >= 1),
  started_at date,
  finished_at date,
  memo text,
  created_at timestamptz default now() not null,
  unique(user_id, book_id)
);

create index on public.user_books(user_id);
create index on public.user_books(book_id);

-- reviews
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  content text,
  is_public boolean not null default true,
  created_at timestamptz default now() not null,
  unique(user_id, book_id)
);

create index on public.reviews(book_id);
create index on public.reviews(user_id);
```

Expected: 4개 테이블 생성, 트리거 생성 성공.

- [ ] **Step 3: RLS 활성화 + 정책 설정**

```sql
-- RLS 활성화
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.user_books enable row level security;
alter table public.reviews enable row level security;

-- profiles
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- books
create policy "books_select" on public.books for select using (true);
create policy "books_insert" on public.books for insert with check (auth.role() = 'authenticated');

-- user_books
create policy "user_books_select" on public.user_books for select using (auth.uid() = user_id);
create policy "user_books_insert" on public.user_books for insert with check (auth.uid() = user_id);
create policy "user_books_update" on public.user_books for update using (auth.uid() = user_id);
create policy "user_books_delete" on public.user_books for delete using (auth.uid() = user_id);

-- reviews
create policy "reviews_select" on public.reviews for select using (is_public = true or auth.uid() = user_id);
create policy "reviews_insert" on public.reviews for insert with check (auth.uid() = user_id);
create policy "reviews_update" on public.reviews for update using (auth.uid() = user_id);
create policy "reviews_delete" on public.reviews for delete using (auth.uid() = user_id);
```

- [ ] **Step 4: 익명 로그인 활성화**

Supabase 대시보드 → Authentication → Providers → Anonymous Sign-ins → Enable

- [ ] **Step 5: SQL 파일 로컬 저장**

```bash
mkdir -p /Users/cosmos/Desktop/Cosmos/supabase/migrations
```

`supabase/migrations/001_init.sql`에 Step 2~3의 SQL 전체 저장 후:

```bash
git add supabase/
git commit -m "feat: add Supabase schema migrations and RLS policies"
git push origin main
```

---

## Task 3: packages/shared — 타입, 스키마, 쿼리 함수 (TDD)

**Files:**
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/schemas/index.ts`
- Create: `packages/shared/src/queries/books.ts`
- Create: `packages/shared/src/hooks/books.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/__tests__/schemas.test.ts`
- Create: `packages/shared/src/__tests__/books.test.ts`

- [ ] **Step 1: 타입 정의**

`packages/shared/src/types/index.ts`:
```typescript
export type BookStatus = 'want_to_read' | 'reading' | 'finished'

export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export type Book = {
  id: string
  title: string
  author: string
  cover_url: string | null
  publisher: string | null
  published_year: number | null
  created_by: string | null
  created_at: string
}

export type UserBook = {
  id: string
  user_id: string
  book_id: string
  status: BookStatus
  current_page: number | null
  total_pages: number | null
  started_at: string | null
  finished_at: string | null
  memo: string | null
  created_at: string
}

export type Review = {
  id: string
  user_id: string
  book_id: string
  rating: number
  content: string | null
  is_public: boolean
  created_at: string
  profile?: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>
}

export type UserBookWithBook = UserBook & { book: Book }
export type BookDetailResult = {
  book: Book
  userBook: UserBook | null
  reviews: Review[]
}
```

- [ ] **Step 2: Zod 스키마 테스트 작성 (실패 확인용)**

`packages/shared/src/__tests__/schemas.test.ts`:
```typescript
import { addBookSchema, writeReviewSchema, onboardingSchema, updateProgressSchema } from '../schemas'

describe('addBookSchema', () => {
  it('accepts valid book data', () => {
    expect(addBookSchema.safeParse({ title: '코스모스', author: '칼 세이건' }).success).toBe(true)
  })
  it('rejects empty title', () => {
    expect(addBookSchema.safeParse({ title: '', author: '저자' }).success).toBe(false)
  })
  it('rejects empty author', () => {
    expect(addBookSchema.safeParse({ title: '책 제목', author: '' }).success).toBe(false)
  })
})

describe('writeReviewSchema', () => {
  it('accepts rating 1~5', () => {
    expect(writeReviewSchema.safeParse({ rating: 1, is_public: true }).success).toBe(true)
    expect(writeReviewSchema.safeParse({ rating: 5, is_public: true }).success).toBe(true)
  })
  it('rejects rating 0 or 6', () => {
    expect(writeReviewSchema.safeParse({ rating: 0, is_public: true }).success).toBe(false)
    expect(writeReviewSchema.safeParse({ rating: 6, is_public: true }).success).toBe(false)
  })
})

describe('onboardingSchema', () => {
  it('accepts valid username with letters, numbers, underscore', () => {
    expect(onboardingSchema.safeParse({ username: 'user_123', display_name: '독자' }).success).toBe(true)
  })
  it('rejects username with special characters', () => {
    expect(onboardingSchema.safeParse({ username: 'user@name', display_name: '독자' }).success).toBe(false)
  })
  it('rejects username shorter than 2 chars', () => {
    expect(onboardingSchema.safeParse({ username: 'a', display_name: '독자' }).success).toBe(false)
  })
})

describe('updateProgressSchema', () => {
  it('accepts valid status', () => {
    expect(updateProgressSchema.safeParse({ status: 'reading' }).success).toBe(true)
  })
  it('rejects invalid status', () => {
    expect(updateProgressSchema.safeParse({ status: 'done' }).success).toBe(false)
  })
})
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

```bash
cd /Users/cosmos/Desktop/Cosmos/packages/shared
pnpm test
```

Expected: FAIL — `Cannot find module '../schemas'`

- [ ] **Step 4: Zod 스키마 구현**

`packages/shared/src/schemas/index.ts`:
```typescript
import { z } from 'zod'

export const addBookSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  author: z.string().min(1, '저자를 입력해주세요'),
  cover_url: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  publisher: z.string().optional(),
  published_year: z.number().int().min(1000).max(2100).optional(),
})

export const updateProgressSchema = z.object({
  status: z.enum(['want_to_read', 'reading', 'finished']),
  current_page: z.number().int().min(0).optional(),
  total_pages: z.number().int().min(1).optional(),
  started_at: z.string().optional(),
  finished_at: z.string().optional(),
  memo: z.string().max(1000).optional(),
})

export const writeReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().max(2000).optional(),
  is_public: z.boolean().default(true),
})

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
})

export const registerSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

export const onboardingSchema = z.object({
  username: z.string()
    .min(2, '2자 이상 입력해주세요')
    .max(20, '20자 이하로 입력해주세요')
    .regex(/^[a-zA-Z0-9_]+$/, '영문, 숫자, 밑줄(_)만 사용 가능합니다'),
  display_name: z.string().min(1, '이름을 입력해주세요').max(30),
})

export type AddBookInput = z.infer<typeof addBookSchema>
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>
export type WriteReviewInput = z.infer<typeof writeReviewSchema>
export type OnboardingInput = z.infer<typeof onboardingSchema>
```

- [ ] **Step 5: 쿼리 함수 테스트 작성 (실패 확인용)**

`packages/shared/src/__tests__/books.test.ts`:
```typescript
import { fetchUserBooks, addBook, upsertUserBook, upsertReview } from '../queries/books'

const makeMockSupabase = (resolvedValue: { data: unknown; error: unknown }) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(resolvedValue),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
    maybeSingle: jest.fn().mockResolvedValue(resolvedValue),
  }
  return { from: jest.fn().mockReturnValue(chain), _chain: chain }
}

describe('fetchUserBooks', () => {
  it('fetches books for user and returns data', async () => {
    const mockBooks = [{ id: '1', status: 'reading', book: { title: '코스모스' } }]
    const { _chain, ...supabase } = makeMockSupabase({ data: mockBooks, error: null })
    const result = await fetchUserBooks(supabase as any, 'user-1')
    expect(result).toEqual(mockBooks)
  })

  it('throws when supabase returns error', async () => {
    const { _chain, ...supabase } = makeMockSupabase({ data: null, error: new Error('DB error') })
    await expect(fetchUserBooks(supabase as any, 'user-1')).rejects.toThrow('DB error')
  })
})

describe('addBook', () => {
  it('inserts book with created_by and returns result', async () => {
    const mockBook = { id: 'b1', title: '코스모스', author: '칼 세이건' }
    const { _chain, ...supabase } = makeMockSupabase({ data: mockBook, error: null })
    const result = await addBook(supabase as any, 'user-1', { title: '코스모스', author: '칼 세이건' })
    expect(result).toEqual(mockBook)
  })
})
```

- [ ] **Step 6: 테스트 실행 — 실패 확인**

```bash
pnpm test
```

Expected: FAIL — `Cannot find module '../queries/books'`

- [ ] **Step 7: 쿼리 함수 구현**

`packages/shared/src/queries/books.ts`:
```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import type { BookStatus, UserBookWithBook, BookDetailResult } from '../types'

export async function fetchUserBooks(
  supabase: SupabaseClient,
  userId: string,
  status?: BookStatus
): Promise<UserBookWithBook[]> {
  let query = supabase
    .from('user_books')
    .select('*, book:books(*)')
    .eq('user_id', userId)

  if (status) query = (query as any).eq('status', status)

  const { data, error } = await (query as any).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchBookDetail(
  supabase: SupabaseClient,
  bookId: string,
  userId: string
): Promise<BookDetailResult> {
  const [bookRes, userBookRes, reviewsRes] = await Promise.all([
    supabase.from('books').select('*').eq('id', bookId).single(),
    supabase.from('user_books').select('*').eq('book_id', bookId).eq('user_id', userId).maybeSingle(),
    supabase
      .from('reviews')
      .select('*, profile:profiles(username, display_name, avatar_url)')
      .eq('book_id', bookId)
      .eq('is_public', true)
      .order('created_at', { ascending: false }),
  ])
  if (bookRes.error) throw bookRes.error
  return {
    book: bookRes.data,
    userBook: userBookRes.data ?? null,
    reviews: (reviewsRes.data as any) ?? [],
  }
}

export async function addBook(
  supabase: SupabaseClient,
  userId: string,
  data: { title: string; author: string; cover_url?: string; publisher?: string; published_year?: number }
) {
  const { data: book, error } = await supabase
    .from('books')
    .insert({ ...data, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return book
}

export async function upsertUserBook(
  supabase: SupabaseClient,
  userId: string,
  bookId: string,
  data: { status: BookStatus; current_page?: number | null; total_pages?: number | null; started_at?: string | null; finished_at?: string | null; memo?: string | null }
) {
  const { data: result, error } = await supabase
    .from('user_books')
    .upsert({ user_id: userId, book_id: bookId, ...data }, { onConflict: 'user_id,book_id' })
    .select()
    .single()
  if (error) throw error
  return result
}

export async function upsertReview(
  supabase: SupabaseClient,
  userId: string,
  bookId: string,
  data: { rating: number; content?: string | null; is_public: boolean }
) {
  const { data: result, error } = await supabase
    .from('reviews')
    .upsert({ user_id: userId, book_id: bookId, ...data }, { onConflict: 'user_id,book_id' })
    .select()
    .single()
  if (error) throw error
  return result
}
```

- [ ] **Step 8: TanStack Query 훅 구현**

`packages/shared/src/hooks/books.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SupabaseClient } from '@supabase/supabase-js'
import { fetchUserBooks, fetchBookDetail, addBook, upsertUserBook, upsertReview } from '../queries/books'
import type { BookStatus } from '../types'
import type { AddBookInput, UpdateProgressInput, WriteReviewInput } from '../schemas'

export const bookKeys = {
  all: ['books'] as const,
  lists: () => [...bookKeys.all, 'list'] as const,
  list: (status?: BookStatus) => [...bookKeys.lists(), { status }] as const,
  detail: (bookId: string) => [...bookKeys.all, 'detail', bookId] as const,
}

export function useBooks(supabase: SupabaseClient, userId: string, status?: BookStatus) {
  return useQuery({
    queryKey: bookKeys.list(status),
    queryFn: () => fetchUserBooks(supabase, userId, status),
    enabled: !!userId,
  })
}

export function useBookDetail(supabase: SupabaseClient, bookId: string, userId: string) {
  return useQuery({
    queryKey: bookKeys.detail(bookId),
    queryFn: () => fetchBookDetail(supabase, bookId, userId),
    enabled: !!bookId && !!userId,
  })
}

export function useAddBook(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AddBookInput) => addBook(supabase, userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.lists() }),
  })
}

export function useUpdateProgress(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookId, data }: { bookId: string; data: UpdateProgressInput }) =>
      upsertUserBook(supabase, userId, bookId, data),
    onSuccess: (_, { bookId }) => {
      qc.invalidateQueries({ queryKey: bookKeys.lists() })
      qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) })
    },
  })
}

export function useWriteReview(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookId, data }: { bookId: string; data: WriteReviewInput }) =>
      upsertReview(supabase, userId, bookId, data),
    onSuccess: (_, { bookId }) => {
      qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) })
    },
  })
}
```

- [ ] **Step 9: shared index 내보내기**

`packages/shared/src/index.ts`:
```typescript
export * from './types'
export * from './schemas'
export * from './queries/books'
export * from './hooks/books'
```

- [ ] **Step 10: 테스트 실행 — 통과 확인**

```bash
cd /Users/cosmos/Desktop/Cosmos/packages/shared
pnpm test
```

Expected: PASS — 7 tests passed

- [ ] **Step 11: 커밋**

```bash
cd /Users/cosmos/Desktop/Cosmos
git add packages/shared/
git commit -m "feat: add shared types, Zod schemas, Supabase query functions, and TanStack Query hooks"
git push origin main
```

---

## Task 4: 웹(Next.js) — 환경변수 + Supabase 클라이언트 + 익명 로그인

**Files:**
- Create: `apps/web/.env.local`
- Create: `apps/web/lib/supabase/client.ts`
- Create: `apps/web/lib/supabase/server.ts`
- Create: `apps/web/lib/supabase/anon.ts`
- Modify: `apps/web/app/layout.tsx`
- Create: `apps/web/app/providers.tsx`

- [ ] **Step 1: 의존성 설치**

```bash
cd /Users/cosmos/Desktop/Cosmos/apps/web
pnpm add @supabase/supabase-js @supabase/ssr @tanstack/react-query @cosmos/shared
```

`apps/web/package.json`의 `dependencies`에 `"@cosmos/shared": "workspace:*"` 추가.

- [ ] **Step 2: 환경변수 설정**

`apps/web/.env.local` (Supabase 대시보드에서 값 복사):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Supabase 브라우저 클라이언트**

`apps/web/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Supabase 서버 클라이언트**

`apps/web/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 5: 익명 로그인 유틸**

`apps/web/lib/supabase/anon.ts`:
```typescript
import { createClient } from './client'

let _userId: string | null = null

export async function ensureAnonSession(): Promise<string> {
  if (_userId) return _userId
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    _userId = session.user.id
    return _userId
  }
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) throw new Error('익명 로그인 실패')
  _userId = data.user.id
  return _userId
}
```

- [ ] **Step 6: Providers 컴포넌트**

`apps/web/app/providers.tsx`:
```typescript
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  }))
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

- [ ] **Step 7: 루트 레이아웃 수정**

`apps/web/app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'Cosmos — 독서 커뮤니티' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 8: 커밋**

```bash
cd /Users/cosmos/Desktop/Cosmos
git add apps/web/
git commit -m "feat: add web Supabase client setup and anon auth"
git push origin main
```

---

## Task 5: 웹 — 로그인/회원가입 UI (무늬)

**Files:**
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/(auth)/register/page.tsx`
- Create: `apps/web/app/(auth)/layout.tsx`

컬러 팔레트: 배경 `#F2F1EE`, 카드 `#FFFFFF`, 강조 `#1C1C1C`, 서브텍스트 `#A8A49C`

- [ ] **Step 1: Auth 레이아웃**

`apps/web/app/(auth)/layout.tsx`:
```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F2F1EE' }}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: 로그인 페이지 (UI only)**

`apps/web/app/(auth)/login/page.tsx`:
```typescript
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-light tracking-widest" style={{ color: '#1C1C1C' }}>
          COSMOS
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#A8A49C' }}>
          책을 사랑하는 독자들의 공간
        </p>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>이메일</label>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>비밀번호</label>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full mt-6 py-3 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          로그인
        </button>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs" style={{ color: '#B8B4AC' }}>또는</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <div className="mt-4 space-y-3">
          {['구글로 계속하기', '카카오로 계속하기', 'Apple로 계속하기'].map((label) => (
            <button
              key={label}
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              style={{ color: '#1C1C1C' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center mt-6 text-sm" style={{ color: '#A8A49C' }}>
        계정이 없으신가요?{' '}
        <Link href="/register" className="underline" style={{ color: '#1C1C1C' }}>
          가입하기
        </Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 3: 회원가입 페이지 (UI only)**

`apps/web/app/(auth)/register/page.tsx`:
```typescript
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-light tracking-widest" style={{ color: '#1C1C1C' }}>COSMOS</h1>
        <p className="mt-2 text-sm" style={{ color: '#A8A49C' }}>새로운 독자로 시작하기</p>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <div className="space-y-4">
          {[
            { label: '이메일', type: 'email', placeholder: 'email@example.com' },
            { label: '비밀번호 (6자 이상)', type: 'password', placeholder: '••••••••' },
            { label: '비밀번호 확인', type: 'password', placeholder: '••••••••' },
          ].map(({ label, type, placeholder }) => (
            <div key={label}>
              <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>{label}</label>
              <input
                type={type}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full mt-6 py-3 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          가입하기
        </button>
      </div>

      <p className="text-center mt-6 text-sm" style={{ color: '#A8A49C' }}>
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="underline" style={{ color: '#1C1C1C' }}>로그인</Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 4: 커밋**

```bash
cd /Users/cosmos/Desktop/Cosmos
git add apps/web/app/\(auth\)/
git commit -m "feat: add web auth UI screens (login, register - UI only)"
git push origin main
```

---

## Task 6: 웹 — 4탭 메인 레이아웃 + 페이지 뼈대

**Files:**
- Create: `apps/web/app/(main)/layout.tsx`
- Create: `apps/web/app/(main)/page.tsx`
- Create: `apps/web/app/(main)/clubs/page.tsx`
- Create: `apps/web/app/(main)/profile/page.tsx`

- [ ] **Step 1: 메인 레이아웃 (사이드바 4탭)**

`apps/web/app/(main)/layout.tsx`:
```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: '홈', icon: '◎' },
  { href: '/books', label: '책장', icon: '☰' },
  { href: '/clubs', label: '클럽', icon: '◈' },
  { href: '/profile', label: '프로필', icon: '○' },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F2F1EE' }}>
      {/* 사이드바 */}
      <aside className="w-16 md:w-56 flex flex-col py-8 px-2 md:px-6" style={{ backgroundColor: '#1C1C1C' }}>
        <div className="mb-10 hidden md:block">
          <span className="text-lg font-light tracking-widest text-white">COSMOS</span>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ href, label, icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors ${
                  active ? 'text-white bg-white/10' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <span className="text-base">{icon}</span>
                <span className="hidden md:inline">{label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* 콘텐츠 */}
      <main className="flex-1 overflow-auto p-6 md:p-10">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: 홈 페이지**

`apps/web/app/(main)/page.tsx`:
```typescript
export default function HomePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-light mb-2" style={{ color: '#1C1C1C' }}>안녕하세요</h1>
      <p className="text-sm" style={{ color: '#A8A49C' }}>오늘도 좋은 책과 함께하세요.</p>
    </div>
  )
}
```

- [ ] **Step 3: 클럽 준비 중 페이지**

`apps/web/app/(main)/clubs/page.tsx`:
```typescript
export default function ClubsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div
        className="w-24 h-24 rounded-2xl mb-6 flex items-center justify-center text-4xl"
        style={{ backgroundColor: '#2A2A28', color: 'white' }}
      >
        ◈
      </div>
      <h2 className="text-xl font-light mb-2" style={{ color: '#1C1C1C' }}>독서 클럽</h2>
      <p className="text-sm" style={{ color: '#A8A49C' }}>
        같은 책을 읽는 사람들과 함께하는 공간
        <br />
        곧 만나볼 수 있어요
      </p>
      <span
        className="mt-4 px-4 py-1.5 rounded-full text-xs"
        style={{ backgroundColor: '#E8E5E0', color: '#A8A49C' }}
      >
        Coming Soon
      </span>
    </div>
  )
}
```

- [ ] **Step 4: 프로필 페이지 (기본)**

`apps/web/app/(main)/profile/page.tsx`:
```typescript
export default function ProfilePage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>프로필</h1>
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: '#C8C5BC' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: '#1C1C1C', color: 'white' }}
          >
            ○
          </div>
          <div>
            <p className="font-medium" style={{ color: '#1C1C1C' }}>독자</p>
            <p className="text-sm mt-0.5" style={{ color: '#6B6862' }}>@username</p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 커밋**

```bash
cd /Users/cosmos/Desktop/Cosmos
git add apps/web/app/\(main\)/
git commit -m "feat: add web main layout with 4-tab sidebar and placeholder pages"
git push origin main
```

---

## Task 7: 웹 — 책 기능 (책장 + 책 등록 + 책 상세)

**Files:**
- Create: `apps/web/app/(main)/books/page.tsx`
- Create: `apps/web/app/(main)/books/new/page.tsx`
- Create: `apps/web/app/(main)/books/[id]/page.tsx`
- Create: `apps/web/hooks/useSupabaseUser.ts`

- [ ] **Step 1: Supabase 유저 훅 (웹)**

`apps/web/hooks/useSupabaseUser.ts`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useSupabaseUser() {
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
      } else {
        supabase.auth.signInAnonymously().then(({ data }) => {
          setUserId(data.user?.id ?? null)
        })
      }
    })
  }, [])

  return { userId, supabase }
}
```

- [ ] **Step 2: 내 책장 페이지**

`apps/web/app/(main)/books/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useBooks } from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import type { BookStatus, UserBookWithBook } from '@cosmos/shared'

const STATUS_TABS: { key: BookStatus | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'want_to_read', label: '읽고 싶음' },
  { key: 'reading', label: '읽는 중' },
  { key: 'finished', label: '읽음' },
]

const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: '읽고 싶음',
  reading: '읽는 중',
  finished: '읽음',
}

export default function BooksPage() {
  const [activeTab, setActiveTab] = useState<BookStatus | 'all'>('all')
  const { userId, supabase } = useSupabaseUser()
  const { data: books = [], isLoading } = useBooks(
    supabase,
    userId ?? '',
    activeTab === 'all' ? undefined : activeTab
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light" style={{ color: '#1C1C1C' }}>내 책장</h1>
        <Link
          href="/books/new"
          className="px-4 py-2 rounded-xl text-sm text-white"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          + 책 추가
        </Link>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="px-4 py-2 rounded-full text-sm transition-colors"
            style={{
              backgroundColor: activeTab === key ? '#1C1C1C' : '#E8E5E0',
              color: activeTab === key ? 'white' : '#6B6862',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm" style={{ color: '#A8A49C' }}>불러오는 중...</p>}

      {!isLoading && books.length === 0 && (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: '#A8A49C' }}>아직 추가한 책이 없어요.</p>
          <Link href="/books/new" className="mt-2 inline-block text-sm underline" style={{ color: '#1C1C1C' }}>
            첫 번째 책 추가하기
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {books.map((ub: UserBookWithBook) => (
          <Link key={ub.id} href={`/books/${ub.book_id}`}>
            <div
              className="rounded-2xl p-4 aspect-[3/4] flex flex-col justify-end cursor-pointer hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#C8C5BC' }}
            >
              {ub.book.cover_url ? (
                <img src={ub.book.cover_url} alt={ub.book.title} className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
              ) : (
                <div className="flex-1" />
              )}
              <div>
                <p className="text-xs mb-1" style={{ color: '#6B6862' }}>{STATUS_LABELS[ub.status]}</p>
                <p className="font-medium text-sm leading-tight" style={{ color: '#1C1C1C' }}>{ub.book.title}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B6862' }}>{ub.book.author}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 책 등록 페이지**

`apps/web/app/(main)/books/new/page.tsx`:
```typescript
'use client'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addBookSchema, useAddBook, type AddBookInput } from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

export default function NewBookPage() {
  const router = useRouter()
  const { userId, supabase } = useSupabaseUser()
  const { mutateAsync, isPending } = useAddBook(supabase, userId ?? '')
  const { register, handleSubmit, formState: { errors } } = useForm<AddBookInput>({
    resolver: zodResolver(addBookSchema),
  })

  async function onSubmit(data: AddBookInput) {
    if (!userId) return
    await mutateAsync(data)
    router.push('/books')
  }

  const fieldStyle = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors bg-white"

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>새 책 추가</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>제목 *</label>
          <input {...register('title')} className={fieldStyle} placeholder="책 제목" />
          {errors.title && <p className="text-xs mt-1 text-red-400">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>저자 *</label>
          <input {...register('author')} className={fieldStyle} placeholder="저자 이름" />
          {errors.author && <p className="text-xs mt-1 text-red-400">{errors.author.message}</p>}
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>출판사</label>
          <input {...register('publisher')} className={fieldStyle} placeholder="출판사 (선택)" />
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>출판 연도</label>
          <input
            {...register('published_year', { valueAsNumber: true })}
            type="number"
            className={fieldStyle}
            placeholder="2024"
          />
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>표지 이미지 URL</label>
          <input {...register('cover_url')} className={fieldStyle} placeholder="https://..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            style={{ color: '#6B6862' }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isPending || !userId}
            className="flex-1 py-3 rounded-xl text-sm text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1C1C1C' }}
          >
            {isPending ? '추가 중...' : '추가하기'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

`apps/web/package.json`에 `@hookform/resolvers` 추가:
```bash
cd /Users/cosmos/Desktop/Cosmos/apps/web
pnpm add @hookform/resolvers react-hook-form
```

- [ ] **Step 4: 책 상세 페이지**

`apps/web/app/(main)/books/[id]/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useBookDetail, useUpdateProgress, useWriteReview, type BookStatus } from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: '읽고 싶음',
  reading: '읽는 중',
  finished: '읽음',
}

const STATUS_OPTIONS: BookStatus[] = ['want_to_read', 'reading', 'finished']

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { userId, supabase } = useSupabaseUser()
  const { data, isLoading } = useBookDetail(supabase, id, userId ?? '')
  const { mutateAsync: updateProgress } = useUpdateProgress(supabase, userId ?? '')
  const { mutateAsync: writeReview } = useWriteReview(supabase, userId ?? '')

  const [showProgressModal, setShowProgressModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<BookStatus>('want_to_read')
  const [currentPage, setCurrentPage] = useState('')
  const [totalPages, setTotalPages] = useState('')
  const [memo, setMemo] = useState('')
  const [rating, setRating] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  if (isLoading) return <p className="text-sm" style={{ color: '#A8A49C' }}>불러오는 중...</p>
  if (!data) return <p className="text-sm" style={{ color: '#A8A49C' }}>책을 찾을 수 없습니다.</p>

  const { book, userBook, reviews } = data

  async function handleProgressSave() {
    if (!userId) return
    await updateProgress({
      bookId: id,
      data: {
        status: selectedStatus,
        current_page: currentPage ? parseInt(currentPage) : undefined,
        total_pages: totalPages ? parseInt(totalPages) : undefined,
        memo: memo || undefined,
      },
    })
    setShowProgressModal(false)
  }

  async function handleReviewSave() {
    if (!userId) return
    await writeReview({ bookId: id, data: { rating, content: reviewContent || undefined, is_public: isPublic } })
    setShowReviewModal(false)
  }

  return (
    <div className="max-w-2xl">
      {/* 책 기본 정보 */}
      <div className="flex gap-6 mb-8">
        <div
          className="w-28 h-40 rounded-xl flex-shrink-0 flex items-center justify-center text-3xl"
          style={{ backgroundColor: '#C8C5BC' }}
        >
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover rounded-xl" />
          ) : '📖'}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-medium mb-1" style={{ color: '#1C1C1C' }}>{book.title}</h1>
          <p className="text-sm mb-1" style={{ color: '#6B6862' }}>{book.author}</p>
          {book.publisher && <p className="text-xs" style={{ color: '#A8A49C' }}>{book.publisher}</p>}

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setSelectedStatus((userBook?.status as BookStatus) ?? 'want_to_read')
                setCurrentPage(userBook?.current_page?.toString() ?? '')
                setTotalPages(userBook?.total_pages?.toString() ?? '')
                setMemo(userBook?.memo ?? '')
                setShowProgressModal(true)
              }}
              className="px-4 py-2 rounded-xl text-sm text-white"
              style={{ backgroundColor: '#1C1C1C' }}
            >
              {userBook ? STATUS_LABELS[userBook.status as BookStatus] : '+ 책장에 추가'}
            </button>
            {userBook?.status === 'finished' && (
              <button
                onClick={() => {
                  setRating(5)
                  setReviewContent('')
                  setShowReviewModal(true)
                }}
                className="px-4 py-2 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
                style={{ color: '#1C1C1C' }}
              >
                리뷰 쓰기
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 진행도 */}
      {userBook?.status === 'reading' && userBook.current_page && userBook.total_pages && (
        <div className="mb-6 p-4 rounded-2xl" style={{ backgroundColor: '#E8E5E0' }}>
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: '#6B6862' }}>읽기 진행도</span>
            <span style={{ color: '#1C1C1C' }}>{userBook.current_page} / {userBook.total_pages}p</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ backgroundColor: '#D0CEC6' }}>
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: '#1C1C1C',
                width: `${Math.min((userBook.current_page / userBook.total_pages) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* 리뷰 목록 */}
      <div>
        <h2 className="text-base font-medium mb-4" style={{ color: '#1C1C1C' }}>독자 리뷰</h2>
        {reviews.length === 0 && (
          <p className="text-sm" style={{ color: '#A8A49C' }}>아직 리뷰가 없어요.</p>
        )}
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="p-4 rounded-2xl" style={{ backgroundColor: 'white' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: '#1C1C1C' }}>
                  {r.profile?.display_name ?? '독자'}
                </span>
                <span className="text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              {r.content && <p className="text-sm" style={{ color: '#6B6862' }}>{r.content}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* 진행도 모달 */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-medium mb-4" style={{ color: '#1C1C1C' }}>독서 상태</h3>
            <div className="flex gap-2 mb-4">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className="flex-1 py-2 rounded-xl text-xs transition-colors"
                  style={{
                    backgroundColor: selectedStatus === s ? '#1C1C1C' : '#E8E5E0',
                    color: selectedStatus === s ? 'white' : '#6B6862',
                  }}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            {selectedStatus === 'reading' && (
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: '#A8A49C' }}>현재 페이지</label>
                  <input
                    type="number"
                    value={currentPage}
                    onChange={(e) => setCurrentPage(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: '#A8A49C' }}>전체 페이지</label>
                  <input
                    type="number"
                    value={totalPages}
                    onChange={(e) => setTotalPages(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-xs mb-1" style={{ color: '#A8A49C' }}>메모 (선택)</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none h-20"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowProgressModal(false)} className="flex-1 py-3 rounded-xl text-sm border border-gray-200" style={{ color: '#6B6862' }}>취소</button>
              <button onClick={handleProgressSave} className="flex-1 py-3 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 리뷰 모달 */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-medium mb-4" style={{ color: '#1C1C1C' }}>리뷰 작성</h3>
            <div className="flex gap-2 mb-4 justify-center text-2xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)}>
                  {n <= rating ? '★' : '☆'}
                </button>
              ))}
            </div>
            <textarea
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              placeholder="리뷰를 작성해주세요 (선택)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none h-28 mb-4"
            />
            <label className="flex items-center gap-2 mb-4 text-sm cursor-pointer" style={{ color: '#6B6862' }}>
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              공개 리뷰로 등록
            </label>
            <div className="flex gap-2">
              <button onClick={() => setShowReviewModal(false)} className="flex-1 py-3 rounded-xl text-sm border border-gray-200" style={{ color: '#6B6862' }}>취소</button>
              <button onClick={handleReviewSave} className="flex-1 py-3 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>등록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 커밋**

```bash
cd /Users/cosmos/Desktop/Cosmos
git add apps/web/
git commit -m "feat: add web book shelf, add book, and book detail pages"
git push origin main
```

---

## Task 8: 모바일(Expo) — 환경변수 + Supabase + 루트 레이아웃

**Files:**
- Create: `apps/mobile/.env`
- Create: `apps/mobile/lib/supabase.ts`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: 의존성 설치**

```bash
cd /Users/cosmos/Desktop/Cosmos/apps/mobile
pnpm add @supabase/supabase-js @tanstack/react-query @cosmos/shared
pnpm add react-native-url-polyfill expo-secure-store
```

`apps/mobile/package.json`에 `"@cosmos/shared": "workspace:*"` 추가.

- [ ] **Step 2: 환경변수**

`apps/mobile/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Supabase 모바일 클라이언트**

`apps/mobile/lib/supabase.ts`:
```typescript
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

- [ ] **Step 4: 루트 레이아웃 — QueryClient + 익명 로그인**

`apps/mobile/app/_layout.tsx`:
```typescript
import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000 } },
})

export default function RootLayout() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setReady(true)
      } else {
        supabase.auth.signInAnonymously().finally(() => setReady(true))
      }
    })
  }, [])

  if (!ready) return null

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 5: 커밋**

```bash
cd /Users/cosmos/Desktop/Cosmos
git add apps/mobile/
git commit -m "feat: add mobile Supabase client with anon auth and QueryClient"
git push origin main
```

---

## Task 9: 모바일 — 로그인 UI + 4탭 네비게이션

**Files:**
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/app/(auth)/register.tsx`
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/index.tsx`
- Create: `apps/mobile/app/(tabs)/clubs.tsx`
- Create: `apps/mobile/app/(tabs)/profile.tsx`

- [ ] **Step 1: NativeWind 설정**

`apps/mobile/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cosmos: {
          bg: '#F2F1EE',
          card: '#C8C5BC',
          dark: '#1C1C1C',
          muted: '#A8A49C',
          sub: '#6B6862',
        },
      },
    },
  },
}
export default config
```

`apps/mobile/babel.config.js`:
```javascript
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}
```

- [ ] **Step 2: Auth 레이아웃**

`apps/mobile/app/(auth)/_layout.tsx`:
```typescript
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 3: 로그인 화면 (UI only)**

`apps/mobile/app/(auth)/login.tsx`:
```typescript
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

export default function LoginScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>COSMOS</Text>
        <Text style={styles.subtitle}>책을 사랑하는 독자들의 공간</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            placeholderTextColor="#B8B4AC"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#B8B4AC"
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryBtnText}>로그인</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.line} />
        </View>

        {['구글로 계속하기', '카카오로 계속하기', 'Apple로 계속하기'].map((label) => (
          <TouchableOpacity key={label} style={styles.socialBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.socialBtnText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <Text style={styles.link}>계정이 없으신가요? <Text style={styles.linkUnderline}>가입하기</Text></Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '300', letterSpacing: 6, color: '#1C1C1C' },
  subtitle: { fontSize: 13, color: '#A8A49C', marginTop: 6 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 24, width: '100%' },
  field: { marginBottom: 16 },
  label: { fontSize: 11, color: '#A8A49C', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E8E5E0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1C1C1C' },
  primaryBtn: { backgroundColor: '#1C1C1C', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: 'white', fontSize: 14, fontWeight: '500' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 8 },
  line: { flex: 1, height: 1, backgroundColor: '#F0EEE9' },
  dividerText: { fontSize: 12, color: '#B8B4AC' },
  socialBtn: { borderWidth: 1, borderColor: '#E8E5E0', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  socialBtnText: { fontSize: 14, color: '#1C1C1C' },
  link: { marginTop: 20, fontSize: 13, color: '#A8A49C' },
  linkUnderline: { color: '#1C1C1C', textDecorationLine: 'underline' },
})
```

- [ ] **Step 4: 회원가입 화면 (UI only)**

`apps/mobile/app/(auth)/register.tsx`:
```typescript
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

export default function RegisterScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>COSMOS</Text>
        <Text style={styles.subtitle}>새로운 독자로 시작하기</Text>
      </View>

      <View style={styles.card}>
        {[
          { label: '이메일', placeholder: 'email@example.com', keyboardType: 'email-address' as const, secure: false },
          { label: '비밀번호 (6자 이상)', placeholder: '••••••••', keyboardType: 'default' as const, secure: true },
          { label: '비밀번호 확인', placeholder: '••••••••', keyboardType: 'default' as const, secure: true },
        ].map(({ label, placeholder, keyboardType, secure }) => (
          <View key={label} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#B8B4AC"
              keyboardType={keyboardType}
              secureTextEntry={secure}
              autoCapitalize="none"
            />
          </View>
        ))}

        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryBtnText}>가입하기</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>이미 계정이 있으신가요? <Text style={styles.linkUnderline}>로그인</Text></Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '300', letterSpacing: 6, color: '#1C1C1C' },
  subtitle: { fontSize: 13, color: '#A8A49C', marginTop: 6 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 24, width: '100%' },
  field: { marginBottom: 16 },
  label: { fontSize: 11, color: '#A8A49C', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E8E5E0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1C1C1C' },
  primaryBtn: { backgroundColor: '#1C1C1C', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: 'white', fontSize: 14, fontWeight: '500' },
  link: { marginTop: 20, fontSize: 13, color: '#A8A49C' },
  linkUnderline: { color: '#1C1C1C', textDecorationLine: 'underline' },
})
```

- [ ] **Step 5: 4탭 레이아웃**

`apps/mobile/app/(tabs)/_layout.tsx`:
```typescript
import { Tabs } from 'expo-router'
import { Text } from 'react-native'

const TAB_ICON: Record<string, string> = { index: '◎', books: '☰', clubs: '◈', profile: '○' }

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1C1C1C', borderTopWidth: 0, paddingBottom: 8, height: 64 },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#6B6862',
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{TAB_ICON[route.name] ?? '○'}</Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="books" options={{ title: '책장' }} />
      <Tabs.Screen name="clubs" options={{ title: '클럽' }} />
      <Tabs.Screen name="profile" options={{ title: '프로필' }} />
    </Tabs>
  )
}
```

- [ ] **Step 6: 홈 화면**

`apps/mobile/app/(tabs)/index.tsx`:
```typescript
import { View, Text, StyleSheet } from 'react-native'

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>안녕하세요</Text>
      <Text style={styles.sub}>오늘도 좋은 책과 함께하세요.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', padding: 24, paddingTop: 60 },
  greeting: { fontSize: 24, fontWeight: '300', color: '#1C1C1C' },
  sub: { fontSize: 14, color: '#A8A49C', marginTop: 6 },
})
```

- [ ] **Step 7: 클럽 준비 중 화면**

`apps/mobile/app/(tabs)/clubs.tsx`:
```typescript
import { View, Text, StyleSheet } from 'react-native'

export default function ClubsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.icon}><Text style={styles.iconText}>◈</Text></View>
      <Text style={styles.title}>독서 클럽</Text>
      <Text style={styles.sub}>같은 책을 읽는 사람들과 함께하는 공간{'\n'}곧 만나볼 수 있어요</Text>
      <View style={styles.badge}><Text style={styles.badgeText}>Coming Soon</Text></View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#2A2A28', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconText: { fontSize: 32, color: 'white' },
  title: { fontSize: 20, fontWeight: '300', color: '#1C1C1C', marginBottom: 8 },
  sub: { fontSize: 14, color: '#A8A49C', textAlign: 'center', lineHeight: 22 },
  badge: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#E8E5E0' },
  badgeText: { fontSize: 12, color: '#A8A49C' },
})
```

- [ ] **Step 8: 프로필 화면**

`apps/mobile/app/(tabs)/profile.tsx`:
```typescript
import { View, Text, StyleSheet } from 'react-native'

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>프로필</Text>
      <View style={styles.card}>
        <View style={styles.avatar}><Text style={styles.avatarText}>○</Text></View>
        <View>
          <Text style={styles.name}>독자</Text>
          <Text style={styles.username}>@username</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', padding: 24, paddingTop: 60 },
  heading: { fontSize: 24, fontWeight: '300', color: '#1C1C1C', marginBottom: 20 },
  card: { backgroundColor: '#C8C5BC', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1C1C1C', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, color: 'white' },
  name: { fontSize: 16, fontWeight: '500', color: '#1C1C1C' },
  username: { fontSize: 13, color: '#6B6862', marginTop: 2 },
})
```

- [ ] **Step 9: 커밋**

```bash
cd /Users/cosmos/Desktop/Cosmos
git add apps/mobile/
git commit -m "feat: add mobile auth UI, 4-tab nav, and placeholder screens"
git push origin main
```

---

## Task 10: 모바일 — 책 기능

**Files:**
- Create: `apps/mobile/app/(tabs)/books/index.tsx`
- Create: `apps/mobile/app/(tabs)/books/new.tsx`
- Create: `apps/mobile/app/(tabs)/books/[id].tsx`

- [ ] **Step 1: 내 책장 화면**

`apps/mobile/app/(tabs)/books/index.tsx`:
```typescript
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { useBooks, type BookStatus, type UserBookWithBook } from '@cosmos/shared'
import { supabase } from '../../../lib/supabase'

const STATUS_TABS: { key: BookStatus | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'want_to_read', label: '읽고 싶음' },
  { key: 'reading', label: '읽는 중' },
  { key: 'finished', label: '읽음' },
]

export default function BooksScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<BookStatus | 'all'>('all')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
  }, [])

  const { data: books = [], isLoading } = useBooks(
    supabase,
    userId ?? '',
    activeTab === 'all' ? undefined : activeTab
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>내 책장</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/books/new')}>
          <Text style={styles.addBtnText}>+ 추가</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {STATUS_TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && <Text style={styles.muted}>불러오는 중...</Text>}

      <FlatList
        data={books as UserBookWithBook[]}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 80 }}
        ListEmptyComponent={
          !isLoading ? (
            <TouchableOpacity onPress={() => router.push('/(tabs)/books/new')}>
              <Text style={[styles.muted, { textAlign: 'center' }]}>
                아직 추가한 책이 없어요.{'\n'}첫 번째 책을 추가해보세요.
              </Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item: ub }) => (
          <TouchableOpacity
            style={styles.bookCard}
            onPress={() => router.push(`/(tabs)/books/${ub.book_id}`)}
          >
            <View style={styles.bookCover}>
              <Text style={styles.bookCoverText}>📖</Text>
            </View>
            <Text style={styles.bookTitle} numberOfLines={2}>{ub.book.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{ub.book.author}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: '300', color: '#1C1C1C' },
  addBtn: { backgroundColor: '#1C1C1C', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: 'white', fontSize: 13 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E8E5E0' },
  tabActive: { backgroundColor: '#1C1C1C' },
  tabText: { fontSize: 12, color: '#6B6862' },
  tabTextActive: { color: 'white' },
  muted: { fontSize: 13, color: '#A8A49C', marginTop: 40 },
  bookCard: { flex: 1, backgroundColor: '#C8C5BC', borderRadius: 16, padding: 12 },
  bookCover: { aspectRatio: 3 / 4, borderRadius: 8, backgroundColor: '#B8B4AC', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  bookCoverText: { fontSize: 32 },
  bookTitle: { fontSize: 13, fontWeight: '500', color: '#1C1C1C', marginBottom: 2 },
  bookAuthor: { fontSize: 11, color: '#6B6862' },
})
```

- [ ] **Step 2: 책 등록 화면**

`apps/mobile/app/(tabs)/books/new.tsx`:
```typescript
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { useAddBook } from '@cosmos/shared'
import { supabase } from '../../../lib/supabase'

export default function NewBookScreen() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [publisher, setPublisher] = useState('')
  const { mutateAsync, isPending } = useAddBook(supabase, userId ?? '')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
  }, [])

  async function handleSubmit() {
    if (!title.trim()) { Alert.alert('제목을 입력해주세요'); return }
    if (!author.trim()) { Alert.alert('저자를 입력해주세요'); return }
    if (!userId) return
    await mutateAsync({ title: title.trim(), author: author.trim(), publisher: publisher.trim() || undefined })
    router.back()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← 뒤로</Text>
      </TouchableOpacity>
      <Text style={styles.heading}>새 책 추가</Text>

      {[
        { label: '제목 *', value: title, set: setTitle, placeholder: '책 제목' },
        { label: '저자 *', value: author, set: setAuthor, placeholder: '저자 이름' },
        { label: '출판사', value: publisher, set: setPublisher, placeholder: '출판사 (선택)' },
      ].map(({ label, value, set, placeholder }) => (
        <View key={label} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={set}
            placeholder={placeholder}
            placeholderTextColor="#B8B4AC"
          />
        </View>
      ))}

      <TouchableOpacity
        style={[styles.submitBtn, (isPending || !userId) && styles.disabled]}
        onPress={handleSubmit}
        disabled={isPending || !userId}
      >
        <Text style={styles.submitText}>{isPending ? '추가 중...' : '추가하기'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE' },
  back: { marginBottom: 16 },
  backText: { fontSize: 14, color: '#A8A49C' },
  heading: { fontSize: 24, fontWeight: '300', color: '#1C1C1C', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 11, color: '#A8A49C', marginBottom: 6 },
  input: { backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#1C1C1C' },
  submitBtn: { backgroundColor: '#1C1C1C', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  disabled: { opacity: 0.5 },
  submitText: { color: 'white', fontSize: 14, fontWeight: '500' },
})
```

- [ ] **Step 3: 책 상세 화면**

`apps/mobile/app/(tabs)/books/[id].tsx`:
```typescript
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { useBookDetail, useUpdateProgress, useWriteReview, type BookStatus } from '@cosmos/shared'
import { supabase } from '../../../lib/supabase'

const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: '읽고 싶음', reading: '읽는 중', finished: '읽음',
}

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<BookStatus>('want_to_read')
  const [currentPage, setCurrentPage] = useState('')
  const [totalPages, setTotalPages] = useState('')
  const [rating, setRating] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
  }, [])

  const { data, isLoading } = useBookDetail(supabase, id, userId ?? '')
  const { mutateAsync: updateProgress } = useUpdateProgress(supabase, userId ?? '')
  const { mutateAsync: writeReview } = useWriteReview(supabase, userId ?? '')

  if (isLoading || !data) return (
    <View style={styles.center}><Text style={styles.muted}>불러오는 중...</Text></View>
  )

  const { book, userBook, reviews } = data

  async function handleProgressSave() {
    if (!userId) return
    await updateProgress({
      bookId: id,
      data: { status: selectedStatus, current_page: currentPage ? parseInt(currentPage) : undefined, total_pages: totalPages ? parseInt(totalPages) : undefined },
    })
    setShowProgress(false)
  }

  async function handleReviewSave() {
    if (!userId) return
    await writeReview({ bookId: id, data: { rating, content: reviewContent || undefined, is_public: isPublic } })
    setShowReview(false)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← 뒤로</Text>
      </TouchableOpacity>

      {/* 책 정보 */}
      <View style={styles.bookHeader}>
        <View style={styles.coverPlaceholder}><Text style={{ fontSize: 36 }}>📖</Text></View>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookAuthor}>{book.author}</Text>
          {book.publisher && <Text style={styles.bookPublisher}>{book.publisher}</Text>}
          <TouchableOpacity
            style={styles.statusBtn}
            onPress={() => {
              setSelectedStatus((userBook?.status as BookStatus) ?? 'want_to_read')
              setCurrentPage(userBook?.current_page?.toString() ?? '')
              setTotalPages(userBook?.total_pages?.toString() ?? '')
              setShowProgress(true)
            }}
          >
            <Text style={styles.statusBtnText}>{userBook ? STATUS_LABELS[userBook.status as BookStatus] : '+ 추가'}</Text>
          </TouchableOpacity>
          {userBook?.status === 'finished' && (
            <TouchableOpacity style={styles.reviewBtn} onPress={() => setShowReview(true)}>
              <Text style={styles.reviewBtnText}>리뷰 쓰기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 진행도 바 */}
      {userBook?.status === 'reading' && userBook.current_page && userBook.total_pages && (
        <View style={styles.progressBox}>
          <View style={styles.progressRow}>
            <Text style={styles.muted}>진행도</Text>
            <Text style={styles.progressNum}>{userBook.current_page} / {userBook.total_pages}p</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min((userBook.current_page / userBook.total_pages) * 100, 100)}%` }]} />
          </View>
        </View>
      )}

      {/* 리뷰 */}
      <Text style={styles.sectionTitle}>독자 리뷰</Text>
      {reviews.length === 0 && <Text style={styles.muted}>아직 리뷰가 없어요.</Text>}
      {reviews.map((r) => (
        <View key={r.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewAuthor}>{r.profile?.display_name ?? '독자'}</Text>
            <Text>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
          </View>
          {r.content && <Text style={styles.reviewContent}>{r.content}</Text>}
        </View>
      ))}

      {/* 진행도 모달 */}
      <Modal visible={showProgress} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>독서 상태</Text>
            <View style={styles.statusRow}>
              {(['want_to_read', 'reading', 'finished'] as BookStatus[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusChip, selectedStatus === s && styles.statusChipActive]}
                  onPress={() => setSelectedStatus(s)}
                >
                  <Text style={[styles.statusChipText, selectedStatus === s && { color: 'white' }]}>
                    {STATUS_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedStatus === 'reading' && (
              <View style={styles.pageRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>현재 페이지</Text>
                  <TextInput style={styles.modalInput} value={currentPage} onChangeText={setCurrentPage} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>전체 페이지</Text>
                  <TextInput style={styles.modalInput} value={totalPages} onChangeText={setTotalPages} keyboardType="number-pad" />
                </View>
              </View>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowProgress(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleProgressSave}>
                <Text style={styles.saveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 리뷰 모달 */}
      <Modal visible={showReview} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>리뷰 작성</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Text style={styles.star}>{n <= rating ? '★' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
              value={reviewContent}
              onChangeText={setReviewContent}
              placeholder="리뷰 (선택)"
              placeholderTextColor="#B8B4AC"
              multiline
            />
            <TouchableOpacity onPress={() => setIsPublic(!isPublic)} style={styles.publicRow}>
              <View style={[styles.checkbox, isPublic && styles.checkboxActive]} />
              <Text style={styles.muted}>공개 리뷰로 등록</Text>
            </TouchableOpacity>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReview(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleReviewSave}>
                <Text style={styles.saveText}>등록</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F1EE' },
  back: { marginBottom: 16 },
  backText: { fontSize: 14, color: '#A8A49C' },
  bookHeader: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  coverPlaceholder: { width: 100, height: 140, borderRadius: 12, backgroundColor: '#C8C5BC', alignItems: 'center', justifyContent: 'center' },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 18, fontWeight: '500', color: '#1C1C1C', marginBottom: 4 },
  bookAuthor: { fontSize: 14, color: '#6B6862', marginBottom: 2 },
  bookPublisher: { fontSize: 12, color: '#A8A49C', marginBottom: 12 },
  statusBtn: { backgroundColor: '#1C1C1C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 8 },
  statusBtnText: { color: 'white', fontSize: 13 },
  reviewBtn: { borderWidth: 1, borderColor: '#D0CEC6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' },
  reviewBtnText: { color: '#1C1C1C', fontSize: 13 },
  progressBox: { backgroundColor: '#E8E5E0', borderRadius: 16, padding: 16, marginBottom: 24 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressNum: { fontSize: 13, color: '#1C1C1C' },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: '#D0CEC6' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: '#1C1C1C' },
  sectionTitle: { fontSize: 16, fontWeight: '500', color: '#1C1C1C', marginBottom: 12 },
  muted: { fontSize: 13, color: '#A8A49C' },
  reviewCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reviewAuthor: { fontSize: 14, fontWeight: '500', color: '#1C1C1C' },
  reviewContent: { fontSize: 13, color: '#6B6862' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: '#1C1C1C', marginBottom: 16 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusChip: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#E8E5E0', alignItems: 'center' },
  statusChipActive: { backgroundColor: '#1C1C1C' },
  statusChipText: { fontSize: 12, color: '#6B6862' },
  pageRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  label: { fontSize: 11, color: '#A8A49C', marginBottom: 6 },
  modalInput: { backgroundColor: '#F5F4F1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1C1C1C' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E8E5E0', alignItems: 'center' },
  cancelText: { fontSize: 14, color: '#6B6862' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#1C1C1C', alignItems: 'center' },
  saveText: { fontSize: 14, color: 'white', fontWeight: '500' },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  star: { fontSize: 28, color: '#1C1C1C' },
  publicRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#D0CEC6' },
  checkboxActive: { backgroundColor: '#1C1C1C', borderColor: '#1C1C1C' },
})
```

- [ ] **Step 4: 커밋**

```bash
cd /Users/cosmos/Desktop/Cosmos
git add apps/mobile/app/\(tabs\)/books/
git commit -m "feat: add mobile book shelf, add book, and book detail screens"
git push origin main
```

---

## Task 11: 최종 빌드 검증

- [ ] **Step 1: 공유 패키지 테스트**

```bash
cd /Users/cosmos/Desktop/Cosmos/packages/shared
pnpm test
```

Expected: PASS — 7 tests (schemas + query functions)

- [ ] **Step 2: 웹 TypeScript 검증**

```bash
cd /Users/cosmos/Desktop/Cosmos/apps/web
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 웹 빌드**

```bash
cd /Users/cosmos/Desktop/Cosmos/apps/web
pnpm build
```

Expected: Build succeeded, 모든 라우트 생성 확인

- [ ] **Step 4: 웹 로컬 실행 확인**

```bash
pnpm dev
```

브라우저에서 `http://localhost:3000/login` → 로그인 UI 확인 → 버튼 클릭 시 `/` 이동 → 4탭 사이드바 확인 → `/books` → 책 추가 → 상세 페이지 진행도/리뷰 모달 확인

- [ ] **Step 5: 모바일 Expo 실행 확인**

```bash
cd /Users/cosmos/Desktop/Cosmos/apps/mobile
npx expo start
```

Expo Go 앱으로 QR 스캔 → 로그인 화면 확인 → 탭 하단 네비게이션 확인 → 책장 → 책 추가 → 상세 화면 확인

- [ ] **Step 6: 최종 커밋**

```bash
cd /Users/cosmos/Desktop/Cosmos
git add .
git commit -m "chore: Stage 1 complete — auth UI, 4-tab nav, book recording"
git push origin main
```
