# Cosmos Stage 2 — 독서 클럽 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 독서 클럽 기능(생성/탐색/가입 + 피드 + 오프라인 모임 관리)을 웹과 모바일 앱에 구현한다.

**Architecture:** `packages/shared`에 Supabase 쿼리 함수와 React Query 훅을 추가하고, 웹(Next.js)과 모바일(Expo)이 이를 공유한다. 피드는 pull-to-refresh 방식이며 Realtime을 사용하지 않는다.

**Tech Stack:** Supabase (PostgreSQL + RLS), React Query v5, Zod, react-hook-form, Next.js 15 App Router, Expo Router v3

---

## File Structure

**New files:**
- `packages/shared/src/types/clubs.ts` — Club 관련 TypeScript 타입
- `packages/shared/src/schemas/clubs.ts` — Club 관련 Zod 스키마
- `packages/shared/src/queries/clubs.ts` — Supabase 쿼리 함수
- `packages/shared/src/hooks/clubs.ts` — React Query 훅
- `packages/shared/src/__tests__/clubs.schemas.test.ts` — 스키마 단위 테스트
- `packages/shared/src/__tests__/clubs.queries.test.ts` — 쿼리 함수 단위 테스트
- `apps/web/app/(main)/clubs/new/page.tsx` — 클럽 생성 폼
- `apps/web/app/(main)/clubs/[id]/page.tsx` — 클럽 상세 (피드/모임/멤버 탭)
- `apps/web/app/(main)/clubs/[id]/meetups/new/page.tsx` — 모임 생성 폼
- `apps/mobile/app/(tabs)/clubs/index.tsx` — 클럽 탐색 화면
- `apps/mobile/app/(tabs)/clubs/new.tsx` — 클럽 생성 화면
- `apps/mobile/app/(tabs)/clubs/[id].tsx` — 클럽 상세 화면

**Modified files:**
- `packages/shared/src/types/index.ts` — club 타입 re-export 추가
- `packages/shared/src/schemas/index.ts` — club 스키마 re-export 추가
- `packages/shared/src/index.ts` — clubs queries/hooks export 추가
- `apps/web/app/(main)/clubs/page.tsx` — Coming Soon → 실제 탐색 페이지
- `apps/mobile/app/(tabs)/_layout.tsx` — clubs/[id], clubs/new 히든 스크린 추가
- `apps/mobile/app/(tabs)/clubs.tsx` — 삭제 (clubs/index.tsx로 대체)

---

## Task 1: Supabase DB Migration

**Files:**
- Supabase 대시보드 SQL 에디터에서 직접 실행

- [ ] **Step 1: Supabase 대시보드에서 SQL 에디터 열기**

  https://app.supabase.com → 프로젝트 선택 → SQL Editor

- [ ] **Step 2: 아래 SQL 전체를 붙여넣고 실행**

```sql
-- Enums
CREATE TYPE club_access_type AS ENUM ('public', 'private', 'invite_only');
CREATE TYPE club_member_role AS ENUM ('leader', 'admin', 'member');
CREATE TYPE club_member_status AS ENUM ('active', 'pending');
CREATE TYPE meetup_attendance_status AS ENUM ('going', 'maybe', 'not_going');

-- clubs
CREATE TABLE clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  access_type club_access_type NOT NULL DEFAULT 'public',
  max_members int,
  invite_code text UNIQUE,
  cover_url text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- club_members
CREATE TABLE club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role club_member_role NOT NULL DEFAULT 'member',
  status club_member_status NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- club_posts
CREATE TABLE club_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  image_urls text[],
  book_id uuid REFERENCES books(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- club_meetups
CREATE TABLE club_meetups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  location_text text,
  location_map_id text,
  location_url text,
  max_attendees int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- club_meetup_attendees
CREATE TABLE club_meetup_attendees (
  meetup_id uuid NOT NULL REFERENCES club_meetups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status meetup_attendance_status NOT NULL DEFAULT 'going',
  PRIMARY KEY (meetup_id, user_id)
);

-- invite_code 자동 생성 트리거
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_club_invite_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.access_type = 'invite_only' AND NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clubs_set_invite_code
BEFORE INSERT OR UPDATE ON clubs
FOR EACH ROW EXECUTE FUNCTION set_club_invite_code();

-- RLS 활성화
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_meetup_attendees ENABLE ROW LEVEL SECURITY;

-- clubs RLS
CREATE POLICY "clubs_select" ON clubs FOR SELECT USING (true);
CREATE POLICY "clubs_insert" ON clubs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "clubs_update" ON clubs FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "clubs_delete" ON clubs FOR DELETE USING (auth.uid() = created_by);

-- club_members RLS (본인 + 같은 클럽 active 멤버)
CREATE POLICY "club_members_select" ON club_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_members.club_id AND cm.user_id = auth.uid() AND cm.status = 'active')
  );
CREATE POLICY "club_members_insert" ON club_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "club_members_update" ON club_members FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_members.club_id AND cm.user_id = auth.uid() AND cm.role IN ('leader','admin') AND cm.status = 'active')
  );
CREATE POLICY "club_members_delete" ON club_members FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_members.club_id AND cm.user_id = auth.uid() AND cm.role IN ('leader','admin') AND cm.status = 'active')
  );

-- club_posts RLS
CREATE POLICY "club_posts_select" ON club_posts FOR SELECT
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_posts.club_id AND cm.user_id = auth.uid() AND cm.status = 'active'));
CREATE POLICY "club_posts_insert" ON club_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_posts.club_id AND cm.user_id = auth.uid() AND cm.status = 'active'));
CREATE POLICY "club_posts_delete" ON club_posts FOR DELETE
  USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_posts.club_id AND cm.user_id = auth.uid() AND cm.role IN ('leader','admin') AND cm.status = 'active'));

-- club_meetups RLS
CREATE POLICY "club_meetups_select" ON club_meetups FOR SELECT
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_meetups.club_id AND cm.user_id = auth.uid() AND cm.status = 'active'));
CREATE POLICY "club_meetups_insert" ON club_meetups FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_meetups.club_id AND cm.user_id = auth.uid() AND cm.role IN ('leader','admin') AND cm.status = 'active'));
CREATE POLICY "club_meetups_update" ON club_meetups FOR UPDATE
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_meetups.club_id AND cm.user_id = auth.uid() AND cm.role IN ('leader','admin') AND cm.status = 'active'));
CREATE POLICY "club_meetups_delete" ON club_meetups FOR DELETE
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_meetups.club_id AND cm.user_id = auth.uid() AND cm.role IN ('leader','admin') AND cm.status = 'active'));

-- club_meetup_attendees RLS
CREATE POLICY "cma_select" ON club_meetup_attendees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM club_members cm JOIN club_meetups mt ON mt.id = club_meetup_attendees.meetup_id
    WHERE mt.club_id = cm.club_id AND cm.user_id = auth.uid() AND cm.status = 'active'
  ));
CREATE POLICY "cma_insert" ON club_meetup_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cma_update" ON club_meetup_attendees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cma_delete" ON club_meetup_attendees FOR DELETE USING (auth.uid() = user_id);
```

- [ ] **Step 3: 실행 결과 확인**

  에러 없이 완료되면 Table Editor에서 clubs, club_members, club_posts, club_meetups, club_meetup_attendees 테이블이 생성됐는지 확인한다.

---

## Task 2: TypeScript 타입 정의

**Files:**
- Create: `packages/shared/src/types/clubs.ts`
- Modify: `packages/shared/src/types/index.ts`

- [ ] **Step 1: `packages/shared/src/types/clubs.ts` 생성**

```typescript
export type ClubAccessType = 'public' | 'private' | 'invite_only'
export type ClubMemberRole = 'leader' | 'admin' | 'member'
export type ClubMemberStatus = 'active' | 'pending'
export type MeetupAttendanceStatus = 'going' | 'maybe' | 'not_going'

export type Club = {
  id: string
  name: string
  description: string | null
  tags: string[]
  access_type: ClubAccessType
  max_members: number | null
  invite_code: string | null
  cover_url: string | null
  created_by: string
  created_at: string
}

export type ClubMember = {
  id: string
  club_id: string
  user_id: string
  role: ClubMemberRole
  status: ClubMemberStatus
  joined_at: string
  profile?: {
    username: string
    display_name: string
    avatar_url: string | null
  }
}

export type ClubPost = {
  id: string
  club_id: string
  author_id: string
  content: string | null
  image_urls: string[] | null
  book_id: string | null
  created_at: string
  author?: {
    username: string
    display_name: string
    avatar_url: string | null
  }
  book?: {
    title: string
    author: string
    cover_url: string | null
  } | null
}

export type ClubMeetup = {
  id: string
  club_id: string
  created_by: string
  title: string
  description: string | null
  scheduled_at: string
  location_text: string | null
  location_map_id: string | null
  location_url: string | null
  max_attendees: number | null
  created_at: string
}

export type ClubDetailResult = {
  club: Club
  myMembership: ClubMember | null
  memberCount: number
}
```

- [ ] **Step 2: `packages/shared/src/types/index.ts` 맨 아래에 export 추가**

```typescript
export * from './clubs'
```

- [ ] **Step 3: 타입 컴파일 확인**

```bash
cd packages/shared && npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/
git commit -m "feat(shared): add club TypeScript types"
```

---

## Task 3: Zod 스키마 + 테스트

**Files:**
- Create: `packages/shared/src/schemas/clubs.ts`
- Create: `packages/shared/src/__tests__/clubs.schemas.test.ts`
- Modify: `packages/shared/src/schemas/index.ts`

- [ ] **Step 1: 스키마 테스트 파일 작성 (failing)**

`packages/shared/src/__tests__/clubs.schemas.test.ts`:

```typescript
import { createClubSchema, createPostSchema, createMeetupSchema, joinByInviteSchema } from '../schemas'

describe('createClubSchema', () => {
  it('accepts valid public club', () => {
    expect(createClubSchema.safeParse({ name: '책 읽는 모임', tags: [], access_type: 'public' }).success).toBe(true)
  })
  it('rejects empty name', () => {
    expect(createClubSchema.safeParse({ name: '', tags: [], access_type: 'public' }).success).toBe(false)
  })
  it('rejects invalid access_type', () => {
    expect(createClubSchema.safeParse({ name: '모임', tags: [], access_type: 'secret' }).success).toBe(false)
  })
  it('rejects max_members below 2', () => {
    expect(createClubSchema.safeParse({ name: '모임', tags: [], access_type: 'public', max_members: 1 }).success).toBe(false)
  })
})

describe('createPostSchema', () => {
  it('accepts text-only post', () => {
    expect(createPostSchema.safeParse({ content: '안녕하세요' }).success).toBe(true)
  })
  it('accepts image-only post', () => {
    expect(createPostSchema.safeParse({ image_urls: ['https://example.com/img.jpg'] }).success).toBe(true)
  })
  it('rejects empty post (no content, image, or book)', () => {
    expect(createPostSchema.safeParse({}).success).toBe(false)
  })
})

describe('createMeetupSchema', () => {
  it('accepts valid meetup', () => {
    expect(createMeetupSchema.safeParse({ title: '5월 모임', scheduled_at: '2026-05-10T14:00:00Z' }).success).toBe(true)
  })
  it('rejects empty title', () => {
    expect(createMeetupSchema.safeParse({ title: '', scheduled_at: '2026-05-10T14:00:00Z' }).success).toBe(false)
  })
})

describe('joinByInviteSchema', () => {
  it('accepts non-empty code', () => {
    expect(joinByInviteSchema.safeParse({ invite_code: 'ABC12345' }).success).toBe(true)
  })
  it('rejects empty code', () => {
    expect(joinByInviteSchema.safeParse({ invite_code: '' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실행 — fail 확인**

```bash
cd packages/shared && npx jest clubs.schemas --no-coverage
```

Expected: FAIL (모듈 not found)

- [ ] **Step 3: `packages/shared/src/schemas/clubs.ts` 생성**

```typescript
import { z } from 'zod'

export const createClubSchema = z.object({
  name: z.string().min(1, '클럽 이름을 입력해주세요').max(50),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).max(5),
  access_type: z.enum(['public', 'private', 'invite_only']),
  max_members: z.number().int().min(2).max(100).optional(),
})

export const createPostSchema = z.object({
  content: z.string().max(2000).optional(),
  image_urls: z.array(z.string().url()).max(4).optional(),
  book_id: z.string().uuid().optional(),
}).refine(
  (d) => d.content || (d.image_urls && d.image_urls.length > 0) || d.book_id,
  { message: '텍스트, 이미지, 책 중 하나 이상 입력해주세요' }
)

export const createMeetupSchema = z.object({
  title: z.string().min(1, '모임 제목을 입력해주세요').max(100),
  description: z.string().max(500).optional(),
  scheduled_at: z.string().min(1, '일시를 선택해주세요'),
  location_text: z.string().max(200).optional(),
  location_map_id: z.string().optional(),
  location_url: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  max_attendees: z.number().int().min(2).max(100).optional(),
})

export const joinByInviteSchema = z.object({
  invite_code: z.string().min(1, '초대 코드를 입력해주세요'),
})

export type CreateClubInput = z.infer<typeof createClubSchema>
export type CreatePostInput = z.infer<typeof createPostSchema>
export type CreateMeetupInput = z.infer<typeof createMeetupSchema>
export type JoinByInviteInput = z.infer<typeof joinByInviteSchema>
```

- [ ] **Step 4: `packages/shared/src/schemas/index.ts` 맨 아래에 export 추가**

```typescript
export * from './clubs'
```

- [ ] **Step 5: 테스트 실행 — pass 확인**

```bash
cd packages/shared && npx jest clubs.schemas --no-coverage
```

Expected: PASS (4 suites, 10 tests)

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/schemas/ packages/shared/src/__tests__/clubs.schemas.test.ts
git commit -m "feat(shared): add club Zod schemas"
```

---

## Task 4: Club Read Query 함수 + 테스트

**Files:**
- Create: `packages/shared/src/queries/clubs.ts`
- Create: `packages/shared/src/__tests__/clubs.queries.test.ts`

- [ ] **Step 1: 쿼리 테스트 파일 작성 (failing)**

`packages/shared/src/__tests__/clubs.queries.test.ts`:

```typescript
import { fetchClubs, fetchMyClubs, fetchClub, fetchClubMembers, fetchClubPosts, fetchClubMeetups } from '../queries/clubs'

const makeChain = (resolved: { data: unknown; error: unknown; count?: number }) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  overlaps: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue(resolved),
  range: jest.fn().mockResolvedValue(resolved),
  single: jest.fn().mockResolvedValue(resolved),
  maybeSingle: jest.fn().mockResolvedValue(resolved),
})

const makeMock = (resolved: { data: unknown; error: unknown; count?: number }) => {
  const chain = makeChain(resolved)
  return { from: jest.fn().mockReturnValue(chain), _chain: chain }
}

describe('fetchClubs', () => {
  it('returns club list', async () => {
    const clubs = [{ id: 'c1', name: '코스모스 클럽' }]
    const { _chain, ...supabase } = makeMock({ data: clubs, error: null })
    const result = await fetchClubs(supabase as any)
    expect(result).toEqual(clubs)
  })
  it('throws on error', async () => {
    const { _chain, ...supabase } = makeMock({ data: null, error: new Error('DB error') })
    await expect(fetchClubs(supabase as any)).rejects.toThrow('DB error')
  })
})

describe('fetchClub', () => {
  it('returns club detail with membership and count', async () => {
    const club = { id: 'c1', name: '테스트 클럽' }
    const supabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: club, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }
    const result = await fetchClub(supabase as any, 'c1', 'u1')
    expect(result.club).toEqual(club)
    expect(result.myMembership).toBeNull()
  })
})

describe('fetchClubPosts', () => {
  it('returns posts for club', async () => {
    const posts = [{ id: 'p1', content: '안녕' }]
    const { _chain, ...supabase } = makeMock({ data: posts, error: null })
    const result = await fetchClubPosts(supabase as any, 'c1')
    expect(result).toEqual(posts)
  })
})
```

- [ ] **Step 2: 테스트 실행 — fail 확인**

```bash
cd packages/shared && npx jest clubs.queries --no-coverage
```

Expected: FAIL (모듈 not found)

- [ ] **Step 3: `packages/shared/src/queries/clubs.ts` 생성**

```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import type { Club, ClubMember, ClubPost, ClubMeetup, ClubDetailResult, ClubMemberRole, MeetupAttendanceStatus } from '../types/clubs'
import type { CreateClubInput, CreatePostInput, CreateMeetupInput } from '../schemas/clubs'

const PAGE_SIZE = 20

export async function fetchClubs(
  supabase: SupabaseClient,
  filter?: { keyword?: string; tags?: string[] }
): Promise<Club[]> {
  let query = supabase.from('clubs').select('*')
  if (filter?.keyword) query = query.ilike('name', `%${filter.keyword}%`)
  if (filter?.tags?.length) query = query.overlaps('tags', filter.tags)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data as Club[]
}

export async function fetchMyClubs(
  supabase: SupabaseClient,
  userId: string
): Promise<Club[]> {
  const { data, error } = await supabase
    .from('club_members')
    .select('club:clubs(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row: any) => row.club).filter(Boolean) as Club[]
}

export async function fetchClub(
  supabase: SupabaseClient,
  clubId: string,
  userId: string
): Promise<ClubDetailResult> {
  const from = supabase.from.bind(supabase)
  const [clubRes, myMemberRes, countRes] = await Promise.all([
    from('clubs').select('*').eq('id', clubId).single(),
    from('club_members').select('*').eq('club_id', clubId).eq('user_id', userId).maybeSingle(),
    from('club_members').select('*', { count: 'exact', head: true } as any).eq('club_id', clubId).eq('status', 'active'),
  ])
  if (clubRes.error) throw clubRes.error
  return {
    club: clubRes.data as Club,
    myMembership: (myMemberRes.data ?? null) as ClubMember | null,
    memberCount: (countRes as any).count ?? 0,
  }
}

export async function fetchClubMembers(
  supabase: SupabaseClient,
  clubId: string
): Promise<ClubMember[]> {
  const { data, error } = await supabase
    .from('club_members')
    .select('*, profile:profiles(username, display_name, avatar_url)')
    .eq('club_id', clubId)
    .order('joined_at', { ascending: true })
  if (error) throw error
  return data as ClubMember[]
}

export async function fetchClubPosts(
  supabase: SupabaseClient,
  clubId: string,
  page = 0
): Promise<ClubPost[]> {
  const { data, error } = await supabase
    .from('club_posts')
    .select('*, author:profiles(username, display_name, avatar_url), book:books(title, author, cover_url)')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  if (error) throw error
  return data as ClubPost[]
}

export async function fetchClubMeetups(
  supabase: SupabaseClient,
  clubId: string
): Promise<ClubMeetup[]> {
  const { data, error } = await supabase
    .from('club_meetups')
    .select('*')
    .eq('club_id', clubId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return data as ClubMeetup[]
}
```

- [ ] **Step 4: 테스트 실행 — pass 확인**

```bash
cd packages/shared && npx jest clubs.queries --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/queries/clubs.ts packages/shared/src/__tests__/clubs.queries.test.ts
git commit -m "feat(shared): add club read query functions"
```

---

## Task 5: Club Mutation Query 함수

**Files:**
- Modify: `packages/shared/src/queries/clubs.ts`

- [ ] **Step 1: `packages/shared/src/queries/clubs.ts` 파일 끝에 추가 (import 불필요 — Task 4에서 이미 선언됨)**

```typescript
export async function createClub(
  supabase: SupabaseClient,
  userId: string,
  data: CreateClubInput
): Promise<Club> {
  const { data: club, error } = await supabase
    .from('clubs')
    .insert({ ...data, created_by: userId })
    .select()
    .single()
  if (error) throw error
  const { error: memberError } = await supabase
    .from('club_members')
    .insert({ club_id: (club as Club).id, user_id: userId, role: 'leader', status: 'active' })
  if (memberError) throw memberError
  return club as Club
}

export async function joinClub(
  supabase: SupabaseClient,
  userId: string,
  clubId: string
): Promise<ClubMember> {
  const { data, error } = await supabase
    .from('club_members')
    .insert({ club_id: clubId, user_id: userId, role: 'member', status: 'active' })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('이미 가입된 클럽입니다')
    throw error
  }
  return data as ClubMember
}

export async function requestJoinClub(
  supabase: SupabaseClient,
  userId: string,
  clubId: string
): Promise<ClubMember> {
  const { data, error } = await supabase
    .from('club_members')
    .insert({ club_id: clubId, user_id: userId, role: 'member', status: 'pending' })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('승인 대기 중입니다')
    throw error
  }
  return data as ClubMember
}

export async function joinByInviteCode(
  supabase: SupabaseClient,
  userId: string,
  inviteCode: string
): Promise<ClubMember> {
  const { data: club, error: clubErr } = await supabase
    .from('clubs')
    .select('id')
    .eq('invite_code', inviteCode)
    .single()
  if (clubErr) throw new Error('유효하지 않은 초대 코드입니다')
  return joinClub(supabase, userId, (club as { id: string }).id)
}

export async function approveMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from('club_members')
    .update({ status: 'active' })
    .eq('id', memberId)
  if (error) throw error
}

export async function rejectMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  const { error } = await supabase.from('club_members').delete().eq('id', memberId)
  if (error) throw error
}

export async function updateMemberRole(
  supabase: SupabaseClient,
  memberId: string,
  role: ClubMemberRole
): Promise<void> {
  const { error } = await supabase
    .from('club_members')
    .update({ role })
    .eq('id', memberId)
  if (error) throw error
}

export async function removeMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  const { error } = await supabase.from('club_members').delete().eq('id', memberId)
  if (error) throw error
}

export async function createPost(
  supabase: SupabaseClient,
  clubId: string,
  authorId: string,
  data: CreatePostInput
): Promise<ClubPost> {
  const { data: post, error } = await supabase
    .from('club_posts')
    .insert({ club_id: clubId, author_id: authorId, ...data })
    .select('*, author:profiles(username, display_name, avatar_url), book:books(title, author, cover_url)')
    .single()
  if (error) throw error
  return post as ClubPost
}

export async function deletePost(
  supabase: SupabaseClient,
  postId: string
): Promise<void> {
  const { error } = await supabase.from('club_posts').delete().eq('id', postId)
  if (error) throw error
}

export async function createMeetup(
  supabase: SupabaseClient,
  clubId: string,
  createdBy: string,
  data: CreateMeetupInput
): Promise<ClubMeetup> {
  const { data: meetup, error } = await supabase
    .from('club_meetups')
    .insert({ club_id: clubId, created_by: createdBy, ...data })
    .select()
    .single()
  if (error) throw error
  return meetup as ClubMeetup
}

export async function updateAttendance(
  supabase: SupabaseClient,
  meetupId: string,
  userId: string,
  status: MeetupAttendanceStatus
): Promise<void> {
  const { error } = await supabase
    .from('club_meetup_attendees')
    .upsert({ meetup_id: meetupId, user_id: userId, status }, { onConflict: 'meetup_id,user_id' })
  if (error) throw error
}
```

- [ ] **Step 2: 컴파일 확인**

```bash
cd packages/shared && npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/queries/clubs.ts
git commit -m "feat(shared): add club mutation query functions"
```

---

## Task 6: Club React Query 훅 + 패키지 Export

**Files:**
- Create: `packages/shared/src/hooks/clubs.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: `packages/shared/src/hooks/clubs.ts` 생성**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchClubs, fetchMyClubs, fetchClub, fetchClubMembers, fetchClubPosts, fetchClubMeetups,
  createClub, joinClub, requestJoinClub, joinByInviteCode,
  approveMember, rejectMember, updateMemberRole, removeMember,
  createPost, deletePost, createMeetup, updateAttendance,
} from '../queries/clubs'
import type { CreateClubInput, CreatePostInput, CreateMeetupInput } from '../schemas/clubs'
import type { ClubMemberRole, MeetupAttendanceStatus } from '../types/clubs'

export const clubKeys = {
  all: ['clubs'] as const,
  lists: () => [...clubKeys.all, 'list'] as const,
  list: (filter?: { keyword?: string; tags?: string[] }) => [...clubKeys.lists(), filter] as const,
  myList: (userId: string) => [...clubKeys.all, 'my', userId] as const,
  detail: (clubId: string) => [...clubKeys.all, 'detail', clubId] as const,
  members: (clubId: string) => [...clubKeys.all, 'members', clubId] as const,
  posts: (clubId: string) => [...clubKeys.all, 'posts', clubId] as const,
  meetups: (clubId: string) => [...clubKeys.all, 'meetups', clubId] as const,
}

export function useClubs(supabase: SupabaseClient, filter?: { keyword?: string; tags?: string[] }) {
  return useQuery({ queryKey: clubKeys.list(filter), queryFn: () => fetchClubs(supabase, filter) })
}

export function useMyClubs(supabase: SupabaseClient, userId: string) {
  return useQuery({ queryKey: clubKeys.myList(userId), queryFn: () => fetchMyClubs(supabase, userId), enabled: !!userId })
}

export function useClub(supabase: SupabaseClient, clubId: string, userId: string) {
  return useQuery({ queryKey: clubKeys.detail(clubId), queryFn: () => fetchClub(supabase, clubId, userId), enabled: !!clubId && !!userId })
}

export function useClubMembers(supabase: SupabaseClient, clubId: string) {
  return useQuery({ queryKey: clubKeys.members(clubId), queryFn: () => fetchClubMembers(supabase, clubId), enabled: !!clubId })
}

export function useClubPosts(supabase: SupabaseClient, clubId: string) {
  return useQuery({ queryKey: clubKeys.posts(clubId), queryFn: () => fetchClubPosts(supabase, clubId), enabled: !!clubId })
}

export function useClubMeetups(supabase: SupabaseClient, clubId: string) {
  return useQuery({ queryKey: clubKeys.meetups(clubId), queryFn: () => fetchClubMeetups(supabase, clubId), enabled: !!clubId })
}

export function useCreateClub(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateClubInput) => createClub(supabase, userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.lists() })
      qc.invalidateQueries({ queryKey: clubKeys.myList(userId) })
    },
  })
}

export function useJoinClub(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clubId: string) => joinClub(supabase, userId, clubId),
    onSuccess: (_, clubId) => {
      qc.invalidateQueries({ queryKey: clubKeys.detail(clubId) })
      qc.invalidateQueries({ queryKey: clubKeys.myList(userId) })
    },
  })
}

export function useRequestJoinClub(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clubId: string) => requestJoinClub(supabase, userId, clubId),
    onSuccess: (_, clubId) => qc.invalidateQueries({ queryKey: clubKeys.detail(clubId) }),
  })
}

export function useJoinByInviteCode(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteCode: string) => joinByInviteCode(supabase, userId, inviteCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.lists() })
      qc.invalidateQueries({ queryKey: clubKeys.myList(userId) })
    },
  })
}

export function useApproveMember(supabase: SupabaseClient, clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => approveMember(supabase, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.members(clubId) }),
  })
}

export function useRejectMember(supabase: SupabaseClient, clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => rejectMember(supabase, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.members(clubId) }),
  })
}

export function useUpdateMemberRole(supabase: SupabaseClient, clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: ClubMemberRole }) => updateMemberRole(supabase, memberId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.members(clubId) }),
  })
}

export function useRemoveMember(supabase: SupabaseClient, clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => removeMember(supabase, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.members(clubId) })
      qc.invalidateQueries({ queryKey: clubKeys.detail(clubId) })
    },
  })
}

export function useCreatePost(supabase: SupabaseClient, clubId: string, authorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePostInput) => createPost(supabase, clubId, authorId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.posts(clubId) }),
  })
}

export function useDeletePost(supabase: SupabaseClient, clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => deletePost(supabase, postId),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.posts(clubId) }),
  })
}

export function useCreateMeetup(supabase: SupabaseClient, clubId: string, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMeetupInput) => createMeetup(supabase, clubId, userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.meetups(clubId) }),
  })
}

export function useUpdateAttendance(supabase: SupabaseClient, clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ meetupId, userId, status }: { meetupId: string; userId: string; status: MeetupAttendanceStatus }) =>
      updateAttendance(supabase, meetupId, userId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.meetups(clubId) }),
  })
}
```

- [ ] **Step 2: `packages/shared/src/index.ts` 에 export 추가**

기존 파일 끝에 아래 두 줄 추가:

```typescript
export * from './queries/clubs'
export * from './hooks/clubs'
```

- [ ] **Step 3: 컴파일 확인**

```bash
cd packages/shared && npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/hooks/clubs.ts packages/shared/src/index.ts
git commit -m "feat(shared): add club hooks and export"
```

---

## Task 7: Web — 클럽 탐색 페이지

**Files:**
- Modify: `apps/web/app/(main)/clubs/page.tsx`

- [ ] **Step 1: `apps/web/app/(main)/clubs/page.tsx` 전체 교체**

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useClubs, useMyClubs } from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import type { Club } from '@cosmos/shared'

const ACCESS_LABELS = { public: '공개', private: '비공개', invite_only: '초대 전용' } as const

export default function ClubsPage() {
  const { userId, supabase } = useSupabaseUser()
  const [view, setView] = useState<'explore' | 'my'>('explore')
  const [searchInput, setSearchInput] = useState('')
  const [keyword, setKeyword] = useState('')

  const { data: allClubs = [], isLoading: loadingAll } = useClubs(supabase, keyword ? { keyword } : undefined)
  const { data: myClubs = [], isLoading: loadingMy } = useMyClubs(supabase, userId ?? '')

  const clubs = view === 'my' ? myClubs : allClubs
  const isLoading = view === 'my' ? loadingMy : loadingAll

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light" style={{ color: '#1C1C1C' }}>독서 클럽</h1>
        <Link href="/clubs/new" className="px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>
          + 클럽 만들기
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {(['explore', 'my'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className="px-4 py-2 rounded-full text-sm transition-colors"
            style={{ backgroundColor: view === v ? '#1C1C1C' : '#E8E5E0', color: view === v ? 'white' : '#6B6862' }}>
            {v === 'explore' ? '탐색' : '내 클럽'}
          </button>
        ))}
      </div>

      {view === 'explore' && (
        <form className="flex gap-2 mb-6" onSubmit={(e) => { e.preventDefault(); setKeyword(searchInput) }}>
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-gray-400 bg-white"
            placeholder="클럽 이름 검색" />
          <button type="submit" className="px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>
            검색
          </button>
        </form>
      )}

      {isLoading && <p className="text-sm" style={{ color: '#A8A49C' }}>불러오는 중...</p>}

      {!isLoading && clubs.length === 0 && (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: '#A8A49C' }}>
            {view === 'my' ? '아직 가입한 클럽이 없어요.' : '클럽이 없어요.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clubs.map((club: Club) => (
          <Link key={club.id} href={`/clubs/${club.id}`}>
            <div className="rounded-2xl p-5 cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundColor: '#C8C5BC' }}>
              <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-xl"
                style={{ backgroundColor: '#2A2A28', color: 'white' }}>◈</div>
              <h3 className="font-medium mb-1 truncate" style={{ color: '#1C1C1C' }}>{club.name}</h3>
              {club.description && (
                <p className="text-xs line-clamp-2 mb-2" style={{ color: '#6B6862' }}>{club.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mb-2">
                {club.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E8E5E0', color: '#6B6862' }}>
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs" style={{ color: '#A8A49C' }}>{ACCESS_LABELS[club.access_type]}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 개발 서버 실행 후 `/clubs` 접속 확인**

```bash
cd apps/web && npm run dev
```

브라우저에서 `http://localhost:3000/clubs` — 탐색/내 클럽 탭, 검색 폼, 카드 그리드가 보이는지 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(main)/clubs/page.tsx
git commit -m "feat(web): implement club explore page"
```

---

## Task 8: Web — 클럽 생성 페이지

**Files:**
- Create: `apps/web/app/(main)/clubs/new/page.tsx`

- [ ] **Step 1: `apps/web/app/(main)/clubs/new/page.tsx` 생성**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClubSchema, useCreateClub } from '@cosmos/shared'
import type { CreateClubInput } from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

const ACCESS_OPTIONS = [
  { value: 'public', label: '공개', desc: '누구나 바로 참여' },
  { value: 'private', label: '비공개', desc: '클럽장 승인 후 가입' },
  { value: 'invite_only', label: '초대 전용', desc: '초대 코드로만 참여' },
] as const

export default function NewClubPage() {
  const router = useRouter()
  const { userId, supabase } = useSupabaseUser()
  const { mutateAsync, isPending } = useCreateClub(supabase, userId ?? '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateClubInput>({
    resolver: zodResolver(createClubSchema),
    defaultValues: { tags: [], access_type: 'public' },
  })
  const accessType = watch('access_type')

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t) && tags.length < 5) {
      const next = [...tags, t]
      setTags(next)
      setValue('tags', next)
      setTagInput('')
    }
  }

  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t)
    setTags(next)
    setValue('tags', next)
  }

  async function onSubmit(data: CreateClubInput) {
    if (!userId) return
    const club = await mutateAsync(data)
    router.push(`/clubs/${club.id}`)
  }

  const field = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 bg-white"
  const label = "block text-xs mb-1.5"

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>새 클럽 만들기</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className={label} style={{ color: '#A8A49C' }}>클럽 이름 *</label>
          <input {...register('name')} className={field} placeholder="우리 독서 모임" />
          {errors.name && <p className="text-xs mt-1 text-red-400">{errors.name.message}</p>}
        </div>

        <div>
          <label className={label} style={{ color: '#A8A49C' }}>소개</label>
          <textarea {...register('description')} className={field} rows={3} placeholder="클럽을 소개해주세요" />
        </div>

        <div>
          <label className={label} style={{ color: '#A8A49C' }}>태그 (최대 5개)</label>
          <div className="flex gap-2">
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              className={field} placeholder="소설, SF, 고전..." />
            <button type="button" onClick={addTag}
              className="px-4 rounded-xl text-sm text-white shrink-0" style={{ backgroundColor: '#1C1C1C' }}>
              추가
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full cursor-pointer"
                style={{ backgroundColor: '#E8E5E0', color: '#6B6862' }}
                onClick={() => removeTag(t)}>
                {t} ✕
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className={label} style={{ color: '#A8A49C' }}>가입 방식 *</label>
          <div className="grid grid-cols-3 gap-2">
            {ACCESS_OPTIONS.map(({ value, label: l, desc }) => (
              <button key={value} type="button"
                onClick={() => setValue('access_type', value)}
                className="p-3 rounded-xl border text-left transition-colors"
                style={{
                  borderColor: accessType === value ? '#1C1C1C' : '#E8E5E0',
                  backgroundColor: accessType === value ? '#F2F1EE' : 'white',
                }}>
                <p className="text-xs font-medium" style={{ color: '#1C1C1C' }}>{l}</p>
                <p className="text-xs mt-0.5" style={{ color: '#A8A49C' }}>{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={label} style={{ color: '#A8A49C' }}>인원 제한 (선택, 최소 2명)</label>
          <input {...register('max_members', { valueAsNumber: true })} type="number"
            className={field} placeholder="제한 없음" min={2} max={100} />
          {errors.max_members && <p className="text-xs mt-1 text-red-400">{errors.max_members.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
            style={{ color: '#6B6862' }}>취소</button>
          <button type="submit" disabled={isPending || !userId}
            className="flex-1 py-3 rounded-xl text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: '#1C1C1C' }}>
            {isPending ? '생성 중...' : '클럽 만들기'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 `/clubs/new` 확인**

  폼 렌더링, 태그 추가/제거, 가입 방식 선택 토글 동작 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(main)/clubs/new/page.tsx
git commit -m "feat(web): add club creation page"
```

---

## Task 9: Web — 클럽 상세 페이지 (쉘 + 멤버십 처리)

**Files:**
- Create: `apps/web/app/(main)/clubs/[id]/page.tsx`

- [ ] **Step 1: `apps/web/app/(main)/clubs/[id]/page.tsx` 생성**

```tsx
'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  useClub, useJoinClub, useRequestJoinClub, useJoinByInviteCode,
  useClubPosts, useCreatePost, useDeletePost,
  useClubMeetups, useUpdateAttendance,
  useClubMembers, useApproveMember, useRejectMember, useUpdateMemberRole, useRemoveMember,
} from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import type { ClubPost, ClubMeetup, ClubMember, MeetupAttendanceStatus } from '@cosmos/shared'
import Link from 'next/link'

type Tab = 'feed' | 'meetups' | 'members'

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { userId, supabase } = useSupabaseUser()
  const [tab, setTab] = useState<Tab>('feed')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [postContent, setPostContent] = useState('')

  const { data, isLoading } = useClub(supabase, id, userId ?? '')
  const joinClub = useJoinClub(supabase, userId ?? '')
  const requestJoin = useRequestJoinClub(supabase, userId ?? '')
  const joinByCode = useJoinByInviteCode(supabase, userId ?? '')

  const { data: posts = [] } = useClubPosts(supabase, id)
  const createPost = useCreatePost(supabase, id, userId ?? '')
  const deletePostMutation = useDeletePost(supabase, id)

  const { data: meetups = [] } = useClubMeetups(supabase, id)
  const updateAttendance = useUpdateAttendance(supabase, id)

  const { data: members = [] } = useClubMembers(supabase, id)
  const approveMember = useApproveMember(supabase, id)
  const rejectMember = useRejectMember(supabase, id)
  const updateRole = useUpdateMemberRole(supabase, id)
  const removeMember = useRemoveMember(supabase, id)

  if (isLoading) return <p className="text-sm" style={{ color: '#A8A49C' }}>불러오는 중...</p>
  if (!data) return <p className="text-sm text-red-400">클럽을 찾을 수 없습니다.</p>

  const { club, myMembership, memberCount } = data
  const myRole = myMembership?.role
  const isActive = myMembership?.status === 'active'
  const isPending = myMembership?.status === 'pending'
  const canManage = myRole === 'leader' || myRole === 'admin'

  async function handleJoin() {
    try {
      if (club.access_type === 'public') await joinClub.mutateAsync(id)
      else await requestJoin.mutateAsync(id)
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleInviteJoin() {
    setInviteError('')
    try {
      await joinByCode.mutateAsync(inviteCode)
    } catch (e: any) {
      setInviteError(e.message)
    }
  }

  async function handleCreatePost() {
    if (!postContent.trim()) return
    await createPost.mutateAsync({ content: postContent })
    setPostContent('')
  }

  if (!isActive) {
    return (
      <div className="max-w-lg">
        <button onClick={() => router.back()} className="text-sm mb-4" style={{ color: '#A8A49C' }}>← 뒤로</button>
        <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: '#C8C5BC' }}>
          <h1 className="text-xl font-medium mb-2" style={{ color: '#1C1C1C' }}>{club.name}</h1>
          {club.description && <p className="text-sm mb-3" style={{ color: '#6B6862' }}>{club.description}</p>}
          <p className="text-xs" style={{ color: '#A8A49C' }}>멤버 {memberCount}명</p>
        </div>

        {isPending ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: '#A8A49C' }}>가입 신청 승인 대기 중입니다.</p>
          </div>
        ) : club.access_type === 'invite_only' ? (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: '#1C1C1C' }}>초대 코드를 입력해주세요</p>
            <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 bg-white uppercase tracking-widest"
              placeholder="ABCD1234" maxLength={8} />
            {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}
            <button onClick={handleInviteJoin} disabled={joinByCode.isPending}
              className="w-full py-3 rounded-xl text-sm text-white disabled:opacity-50"
              style={{ backgroundColor: '#1C1C1C' }}>
              {joinByCode.isPending ? '확인 중...' : '참여하기'}
            </button>
          </div>
        ) : (
          <button onClick={handleJoin}
            disabled={joinClub.isPending || requestJoin.isPending}
            className="w-full py-3 rounded-xl text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: '#1C1C1C' }}>
            {club.access_type === 'public' ? '참여하기' : '가입 신청'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="text-sm" style={{ color: '#A8A49C' }}>← 뒤로</button>
        {canManage && club.access_type === 'invite_only' && club.invite_code && (
          <span className="text-xs px-3 py-1 rounded-full font-mono" style={{ backgroundColor: '#E8E5E0', color: '#1C1C1C' }}>
            초대 코드: {club.invite_code}
          </span>
        )}
      </div>

      <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: '#C8C5BC' }}>
        <h1 className="text-xl font-medium mb-1" style={{ color: '#1C1C1C' }}>{club.name}</h1>
        {club.description && <p className="text-sm mb-2" style={{ color: '#6B6862' }}>{club.description}</p>}
        <div className="flex flex-wrap gap-1 mb-2">
          {club.tags.map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E8E5E0', color: '#6B6862' }}>{t}</span>
          ))}
        </div>
        <p className="text-xs" style={{ color: '#A8A49C' }}>멤버 {memberCount}명</p>
      </div>

      <div className="flex gap-2 mb-6">
        {(['feed', 'meetups', 'members'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-full text-sm transition-colors"
            style={{ backgroundColor: tab === t ? '#1C1C1C' : '#E8E5E0', color: tab === t ? 'white' : '#6B6862' }}>
            {t === 'feed' ? '피드' : t === 'meetups' ? '모임' : '멤버'}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <FeedTab
          posts={posts} userId={userId ?? ''} canManage={canManage}
          postContent={postContent} setPostContent={setPostContent}
          onSubmit={handleCreatePost} isPending={createPost.isPending}
          onDelete={(postId) => deletePostMutation.mutate(postId)}
        />
      )}
      {tab === 'meetups' && (
        <MeetupsTab
          clubId={id} meetups={meetups} userId={userId ?? ''} canManage={canManage}
          onAttend={(meetupId, status) => updateAttendance.mutate({ meetupId, userId: userId ?? '', status })}
        />
      )}
      {tab === 'members' && (
        <MembersTab
          members={members} myRole={myRole} userId={userId ?? ''}
          onApprove={(id) => approveMember.mutate(id)}
          onReject={(id) => rejectMember.mutate(id)}
          onRoleChange={(id, role) => updateRole.mutate({ memberId: id, role })}
          onRemove={(id) => removeMember.mutate(id)}
        />
      )}
    </div>
  )
}

function FeedTab({ posts, userId, canManage, postContent, setPostContent, onSubmit, isPending, onDelete }: {
  posts: ClubPost[]; userId: string; canManage: boolean
  postContent: string; setPostContent: (v: string) => void
  onSubmit: () => void; isPending: boolean
  onDelete: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#E8E5E0' }}>
        <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)}
          className="w-full bg-transparent text-sm outline-none resize-none" rows={3}
          placeholder="클럽 멤버들과 이야기를 나눠보세요..." />
        <div className="flex justify-end mt-2">
          <button onClick={onSubmit} disabled={isPending || !postContent.trim()}
            className="px-4 py-1.5 rounded-lg text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: '#1C1C1C' }}>
            {isPending ? '올리는 중...' : '올리기'}
          </button>
        </div>
      </div>

      {posts.map((post: ClubPost) => (
        <div key={post.id} className="rounded-2xl p-4" style={{ backgroundColor: '#C8C5BC' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: '#1C1C1C' }}>
              {post.author?.display_name ?? post.author?.username ?? '알 수 없음'}
            </span>
            <span className="text-xs" style={{ color: '#A8A49C' }}>
              {new Date(post.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
          {post.content && <p className="text-sm mb-2" style={{ color: '#1C1C1C' }}>{post.content}</p>}
          {post.book && (
            <div className="flex items-center gap-2 p-2 rounded-xl mt-1" style={{ backgroundColor: '#B8B4AC' }}>
              <span className="text-lg">📖</span>
              <div>
                <p className="text-xs font-medium" style={{ color: '#1C1C1C' }}>{post.book.title}</p>
                <p className="text-xs" style={{ color: '#6B6862' }}>{post.book.author}</p>
              </div>
            </div>
          )}
          {(post.author_id === userId || canManage) && (
            <button onClick={() => onDelete(post.id)} className="text-xs mt-2" style={{ color: '#A8A49C' }}>
              삭제
            </button>
          )}
        </div>
      ))}

      {posts.length === 0 && (
        <p className="text-center py-12 text-sm" style={{ color: '#A8A49C' }}>아직 게시물이 없어요.</p>
      )}
    </div>
  )
}

function MeetupsTab({ clubId, meetups, userId, canManage, onAttend }: {
  clubId: string; meetups: ClubMeetup[]; userId: string; canManage: boolean
  onAttend: (meetupId: string, status: MeetupAttendanceStatus) => void
}) {
  const ATTEND_LABELS: Record<MeetupAttendanceStatus, string> = { going: '갈게요', maybe: '미정', not_going: '못 가요' }
  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Link href={`/clubs/${clubId}/meetups/new`}
            className="px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>
            + 모임 만들기
          </Link>
        </div>
      )}

      {meetups.map((meetup: ClubMeetup) => (
        <div key={meetup.id} className="rounded-2xl p-5" style={{ backgroundColor: '#C8C5BC' }}>
          <h3 className="font-medium mb-1" style={{ color: '#1C1C1C' }}>{meetup.title}</h3>
          <p className="text-sm mb-2" style={{ color: '#6B6862' }}>
            {new Date(meetup.scheduled_at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          {meetup.location_text && <p className="text-xs mb-1" style={{ color: '#6B6862' }}>📍 {meetup.location_text}</p>}
          {meetup.location_url && (
            <a href={meetup.location_url} target="_blank" rel="noopener noreferrer"
              className="text-xs underline mb-2 inline-block" style={{ color: '#6B6862' }}>지도 보기</a>
          )}
          {meetup.description && <p className="text-xs mt-1 mb-3" style={{ color: '#6B6862' }}>{meetup.description}</p>}
          <div className="flex gap-2">
            {(['going', 'maybe', 'not_going'] as MeetupAttendanceStatus[]).map((s) => (
              <button key={s} onClick={() => onAttend(meetup.id, s)}
                className="px-3 py-1 rounded-full text-xs transition-colors"
                style={{ backgroundColor: '#E8E5E0', color: '#1C1C1C' }}>
                {ATTEND_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      ))}

      {meetups.length === 0 && (
        <p className="text-center py-12 text-sm" style={{ color: '#A8A49C' }}>예정된 모임이 없어요.</p>
      )}
    </div>
  )
}

function MembersTab({ members, myRole, userId, onApprove, onReject, onRoleChange, onRemove }: {
  members: ClubMember[]; myRole: string | undefined; userId: string
  onApprove: (id: string) => void; onReject: (id: string) => void
  onRoleChange: (id: string, role: any) => void; onRemove: (id: string) => void
}) {
  const ROLE_LABELS = { leader: '클럽장', admin: '운영진', member: '멤버' }
  const pending = members.filter((m) => m.status === 'pending')
  const active = members.filter((m) => m.status === 'active')

  return (
    <div className="space-y-6">
      {pending.length > 0 && (myRole === 'leader' || myRole === 'admin') && (
        <div>
          <h3 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>가입 신청 ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: '#E8E5E0' }}>
                <span className="text-sm" style={{ color: '#1C1C1C' }}>{m.profile?.display_name ?? m.user_id}</span>
                <div className="flex gap-2">
                  <button onClick={() => onApprove(m.id)} className="text-xs px-3 py-1 rounded-lg text-white" style={{ backgroundColor: '#1C1C1C' }}>승인</button>
                  <button onClick={() => onReject(m.id)} className="text-xs px-3 py-1 rounded-lg border border-gray-300" style={{ color: '#6B6862' }}>거절</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>멤버 ({active.length})</h3>
        <div className="space-y-2">
          {active.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: '#E8E5E0' }}>
              <div>
                <span className="text-sm" style={{ color: '#1C1C1C' }}>{m.profile?.display_name ?? m.user_id}</span>
                <span className="text-xs ml-2" style={{ color: '#A8A49C' }}>{ROLE_LABELS[m.role]}</span>
              </div>
              {myRole === 'leader' && m.user_id !== userId && (
                <div className="flex gap-2">
                  {m.role === 'member' && (
                    <button onClick={() => onRoleChange(m.id, 'admin')} className="text-xs" style={{ color: '#6B6862' }}>운영진 임명</button>
                  )}
                  {m.role === 'admin' && (
                    <button onClick={() => onRoleChange(m.id, 'member')} className="text-xs" style={{ color: '#6B6862' }}>운영진 해제</button>
                  )}
                  <button onClick={() => onRemove(m.id)} className="text-xs" style={{ color: '#A8A49C' }}>강퇴</button>
                </div>
              )}
              {m.user_id === userId && m.role !== 'leader' && (
                <button onClick={() => onRemove(m.id)} className="text-xs" style={{ color: '#A8A49C' }}>탈퇴</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 클럽 상세 테스트**

  클럽 탐색에서 카드 클릭 → 상세 진입. 미가입 상태에서 참여 버튼, 가입 후 피드/모임/멤버 탭 전환 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(main)/clubs/[id]/page.tsx
git commit -m "feat(web): add club detail page with feed, meetups, members tabs"
```

---

## Task 10: Web — 모임 생성 페이지

**Files:**
- Create: `apps/web/app/(main)/clubs/[id]/meetups/new/page.tsx`

- [ ] **Step 1: `apps/web/app/(main)/clubs/[id]/meetups/new/page.tsx` 생성**

```tsx
'use client'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createMeetupSchema, useCreateMeetup } from '@cosmos/shared'
import type { CreateMeetupInput } from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

export default function NewMeetupPage() {
  const { id: clubId } = useParams<{ id: string }>()
  const router = useRouter()
  const { userId, supabase } = useSupabaseUser()
  const { mutateAsync, isPending } = useCreateMeetup(supabase, clubId, userId ?? '')
  const { register, handleSubmit, formState: { errors } } = useForm<CreateMeetupInput>({
    resolver: zodResolver(createMeetupSchema),
  })

  async function onSubmit(data: CreateMeetupInput) {
    if (!userId) return
    await mutateAsync(data)
    router.push(`/clubs/${clubId}`)
  }

  const field = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 bg-white"
  const lbl = "block text-xs mb-1.5"

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>모임 만들기</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>모임 제목 *</label>
          <input {...register('title')} className={field} placeholder="5월 정기 모임" />
          {errors.title && <p className="text-xs mt-1 text-red-400">{errors.title.message}</p>}
        </div>

        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>일시 *</label>
          <input {...register('scheduled_at')} type="datetime-local" className={field} />
          {errors.scheduled_at && <p className="text-xs mt-1 text-red-400">{errors.scheduled_at.message}</p>}
        </div>

        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>장소 (텍스트)</label>
          <input {...register('location_text')} className={field} placeholder="서울 마포구 카페 이름" />
        </div>

        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>지도 링크 (카카오맵 등 URL)</label>
          <input {...register('location_url')} className={field} placeholder="https://kko.to/..." />
          {errors.location_url && <p className="text-xs mt-1 text-red-400">올바른 URL을 입력해주세요</p>}
        </div>

        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>설명</label>
          <textarea {...register('description')} className={field} rows={3} placeholder="모임에 대해 알려주세요" />
        </div>

        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>최대 참석 인원 (선택)</label>
          <input {...register('max_attendees', { valueAsNumber: true })} type="number"
            className={field} placeholder="제한 없음" min={2} max={100} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
            style={{ color: '#6B6862' }}>취소</button>
          <button type="submit" disabled={isPending || !userId}
            className="flex-1 py-3 rounded-xl text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: '#1C1C1C' }}>
            {isPending ? '생성 중...' : '모임 만들기'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 `/clubs/[id]/meetups/new` 확인**

  클럽 상세 → 모임 탭 → '+ 모임 만들기' 클릭 → 폼 동작 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(main)/clubs/[id]/meetups/new/page.tsx
git commit -m "feat(web): add meetup creation page"
```

---

## Task 11: Mobile — 클럽 탭 구조 변경 + 탐색 화면

**Files:**
- Create: `apps/mobile/app/(tabs)/clubs/index.tsx`
- Delete: `apps/mobile/app/(tabs)/clubs.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: `apps/mobile/app/(tabs)/clubs/index.tsx` 생성**

```tsx
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { useClubs, useMyClubs } from '@cosmos/shared'
import type { Club } from '@cosmos/shared'
import { supabase } from '../../../../lib/supabase'

const ACCESS_LABELS = { public: '공개', private: '비공개', invite_only: '초대 전용' } as const

export default function ClubsScreen() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [view, setView] = useState<'explore' | 'my'>('explore')
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
  }, [])

  const { data: allClubs = [], isLoading: loadingAll, refetch: refetchAll } = useClubs(supabase, keyword ? { keyword } : undefined)
  const { data: myClubs = [], isLoading: loadingMy, refetch: refetchMy } = useMyClubs(supabase, userId ?? '')

  const clubs = view === 'my' ? myClubs : allClubs
  const isLoading = view === 'my' ? loadingMy : loadingAll

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.heading}>독서 클럽</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/(tabs)/clubs/new')}>
          <Text style={s.addBtnText}>+ 만들기</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabs}>
        {(['explore', 'my'] as const).map((v) => (
          <TouchableOpacity key={v} style={[s.tab, view === v && s.tabActive]} onPress={() => setView(v)}>
            <Text style={[s.tabText, view === v && s.tabTextActive]}>{v === 'explore' ? '탐색' : '내 클럽'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'explore' && (
        <View style={s.searchRow}>
          <TextInput value={searchText} onChangeText={setSearchText}
            style={s.searchInput} placeholder="클럽 이름 검색" placeholderTextColor="#A8A49C" />
          <TouchableOpacity style={s.searchBtn} onPress={() => setKeyword(searchText)}>
            <Text style={s.searchBtnText}>검색</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={clubs as Club[]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 80 }}
        refreshing={isLoading}
        onRefresh={view === 'my' ? refetchMy : refetchAll}
        ListEmptyComponent={
          !isLoading ? <Text style={[s.muted, { textAlign: 'center', marginTop: 60 }]}>클럽이 없어요.</Text> : null
        }
        renderItem={({ item: club }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/(tabs)/clubs/${club.id}` as any)}>
            <View style={s.cardIcon}><Text style={{ fontSize: 20, color: 'white' }}>◈</Text></View>
            <Text style={s.cardName} numberOfLines={1}>{club.name}</Text>
            {club.description ? <Text style={s.cardDesc} numberOfLines={2}>{club.description}</Text> : null}
            <View style={s.tagRow}>
              {club.tags.slice(0, 3).map((t) => (
                <View key={t} style={s.tag}><Text style={s.tagText}>{t}</Text></View>
              ))}
            </View>
            <Text style={s.accessLabel}>{ACCESS_LABELS[club.access_type]}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: '300', color: '#1C1C1C' },
  addBtn: { backgroundColor: '#1C1C1C', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: 'white', fontSize: 13 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E8E5E0' },
  tabActive: { backgroundColor: '#1C1C1C' },
  tabText: { fontSize: 12, color: '#6B6862' },
  tabTextActive: { color: 'white' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#1C1C1C', borderWidth: 1, borderColor: '#E8E5E0' },
  searchBtn: { backgroundColor: '#1C1C1C', paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center' },
  searchBtnText: { color: 'white', fontSize: 13 },
  muted: { fontSize: 13, color: '#A8A49C' },
  card: { backgroundColor: '#C8C5BC', borderRadius: 16, padding: 16 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#2A2A28', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardName: { fontSize: 15, fontWeight: '500', color: '#1C1C1C', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#6B6862', marginBottom: 8, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  tag: { backgroundColor: '#E8E5E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tagText: { fontSize: 11, color: '#6B6862' },
  accessLabel: { fontSize: 11, color: '#A8A49C' },
})
```

- [ ] **Step 2: `apps/mobile/app/(tabs)/clubs.tsx` 삭제**

```bash
rm apps/mobile/app/(tabs)/clubs.tsx
```

- [ ] **Step 3: `apps/mobile/app/(tabs)/_layout.tsx` 수정 — 히든 스크린 추가**

기존 파일에서 `</Tabs>` 닫는 태그 바로 앞에 아래 두 줄 추가:

```tsx
<Tabs.Screen name="clubs/[id]" options={{ href: null }} />
<Tabs.Screen name="clubs/new" options={{ href: null }} />
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(tabs)/clubs/ apps/mobile/app/(tabs)/_layout.tsx
git rm apps/mobile/app/(tabs)/clubs.tsx
git commit -m "feat(mobile): restructure clubs tab and add explore screen"
```

---

## Task 12: Mobile — 클럽 생성 화면

**Files:**
- Create: `apps/mobile/app/(tabs)/clubs/new.tsx`

- [ ] **Step 1: `apps/mobile/app/(tabs)/clubs/new.tsx` 생성**

```tsx
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { useCreateClub } from '@cosmos/shared'
import type { CreateClubInput } from '@cosmos/shared'
import { supabase } from '../../../../lib/supabase'

const ACCESS_OPTIONS = [
  { value: 'public', label: '공개', desc: '누구나 바로 참여' },
  { value: 'private', label: '비공개', desc: '승인 후 가입' },
  { value: 'invite_only', label: '초대 전용', desc: '초대 코드 필요' },
] as const

export default function NewClubScreen() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [accessType, setAccessType] = useState<'public' | 'private' | 'invite_only'>('public')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const { mutateAsync, isPending } = useCreateClub(supabase, userId ?? '')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
  }, [])

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t) && tags.length < 5) { setTags([...tags, t]); setTagInput('') }
  }

  async function handleSubmit() {
    if (!userId || !name.trim()) return
    const data: CreateClubInput = { name: name.trim(), description: description.trim() || undefined, tags, access_type: accessType }
    try {
      const club = await mutateAsync(data)
      router.replace(`/(tabs)/clubs/${club.id}` as any)
    } catch (e: any) {
      Alert.alert('오류', e.message)
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.heading}>새 클럽 만들기</Text>

      <Text style={s.label}>클럽 이름 *</Text>
      <TextInput value={name} onChangeText={setName} style={s.input} placeholder="우리 독서 모임" placeholderTextColor="#A8A49C" />

      <Text style={s.label}>소개</Text>
      <TextInput value={description} onChangeText={setDescription} style={[s.input, { height: 80 }]}
        placeholder="클럽을 소개해주세요" placeholderTextColor="#A8A49C" multiline />

      <Text style={s.label}>태그 (최대 5개)</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <TextInput value={tagInput} onChangeText={setTagInput} style={[s.input, { flex: 1, marginBottom: 0 }]}
          placeholder="소설, SF..." placeholderTextColor="#A8A49C"
          onSubmitEditing={addTag} returnKeyType="done" />
        <TouchableOpacity style={s.tagAddBtn} onPress={addTag}><Text style={{ color: 'white', fontSize: 13 }}>추가</Text></TouchableOpacity>
      </View>
      <View style={s.tagRow}>
        {tags.map((t) => (
          <TouchableOpacity key={t} style={s.tag} onPress={() => setTags(tags.filter((x) => x !== t))}>
            <Text style={s.tagText}>{t} ✕</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>가입 방식 *</Text>
      <View style={{ gap: 8, marginBottom: 20 }}>
        {ACCESS_OPTIONS.map(({ value, label, desc }) => (
          <TouchableOpacity key={value} style={[s.accessOption, accessType === value && s.accessOptionActive]}
            onPress={() => setAccessType(value)}>
            <Text style={[s.accessLabel, accessType === value && { color: '#1C1C1C' }]}>{label}</Text>
            <Text style={s.accessDesc}>{desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[s.submitBtn, (!userId || !name.trim() || isPending) && { opacity: 0.5 }]}
        onPress={handleSubmit} disabled={!userId || !name.trim() || isPending}>
        <Text style={s.submitText}>{isPending ? '생성 중...' : '클럽 만들기'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', paddingHorizontal: 20, paddingTop: 60 },
  heading: { fontSize: 22, fontWeight: '300', color: '#1C1C1C', marginBottom: 24 },
  label: { fontSize: 12, color: '#A8A49C', marginBottom: 6 },
  input: { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1C1C1C', borderWidth: 1, borderColor: '#E8E5E0', marginBottom: 16 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  tag: { backgroundColor: '#E8E5E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12, color: '#6B6862' },
  tagAddBtn: { backgroundColor: '#1C1C1C', paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  accessOption: { backgroundColor: 'white', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E8E5E0' },
  accessOptionActive: { borderColor: '#1C1C1C', backgroundColor: '#F2F1EE' },
  accessLabel: { fontSize: 14, fontWeight: '500', color: '#6B6862', marginBottom: 2 },
  accessDesc: { fontSize: 12, color: '#A8A49C' },
  submitBtn: { backgroundColor: '#1C1C1C', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 15, fontWeight: '500' },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/clubs/new.tsx
git commit -m "feat(mobile): add club creation screen"
```

---

## Task 13: Mobile — 클럽 상세 화면

**Files:**
- Create: `apps/mobile/app/(tabs)/clubs/[id].tsx`

- [ ] **Step 1: `apps/mobile/app/(tabs)/clubs/[id].tsx` 생성**

```tsx
import { View, Text, FlatList, TouchableOpacity, TextInput, ScrollView, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import {
  useClub, useJoinClub, useRequestJoinClub, useJoinByInviteCode,
  useClubPosts, useCreatePost, useDeletePost,
  useClubMeetups, useUpdateAttendance,
  useClubMembers, useApproveMember, useRejectMember, useUpdateMemberRole, useRemoveMember,
} from '@cosmos/shared'
import type { ClubPost, ClubMeetup, ClubMember, MeetupAttendanceStatus } from '@cosmos/shared'
import { supabase } from '../../../../lib/supabase'

type Tab = 'feed' | 'meetups' | 'members'

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('feed')
  const [inviteCode, setInviteCode] = useState('')
  const [postContent, setPostContent] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
  }, [])

  const { data, isLoading } = useClub(supabase, id ?? '', userId ?? '')
  const joinClubMut = useJoinClub(supabase, userId ?? '')
  const requestJoinMut = useRequestJoinClub(supabase, userId ?? '')
  const joinByCodeMut = useJoinByInviteCode(supabase, userId ?? '')

  const { data: posts = [], refetch: refetchPosts } = useClubPosts(supabase, id ?? '')
  const createPost = useCreatePost(supabase, id ?? '', userId ?? '')
  const deletePostMut = useDeletePost(supabase, id ?? '')

  const { data: meetups = [], refetch: refetchMeetups } = useClubMeetups(supabase, id ?? '')
  const updateAttendance = useUpdateAttendance(supabase, id ?? '')

  const { data: members = [], refetch: refetchMembers } = useClubMembers(supabase, id ?? '')
  const approveMut = useApproveMember(supabase, id ?? '')
  const rejectMut = useRejectMember(supabase, id ?? '')
  const updateRoleMut = useUpdateMemberRole(supabase, id ?? '')
  const removeMut = useRemoveMember(supabase, id ?? '')

  if (isLoading) return <View style={s.container}><Text style={s.muted}>불러오는 중...</Text></View>
  if (!data) return <View style={s.container}><Text style={s.muted}>클럽을 찾을 수 없습니다.</Text></View>

  const { club, myMembership, memberCount } = data
  const myRole = myMembership?.role
  const isActive = myMembership?.status === 'active'
  const isPendingMember = myMembership?.status === 'pending'
  const canManage = myRole === 'leader' || myRole === 'admin'

  async function handleJoin() {
    try {
      if (club.access_type === 'public') await joinClubMut.mutateAsync(id ?? '')
      else await requestJoinMut.mutateAsync(id ?? '')
    } catch (e: any) { Alert.alert('알림', e.message) }
  }

  async function handleInviteJoin() {
    try {
      await joinByCodeMut.mutateAsync(inviteCode)
    } catch (e: any) { Alert.alert('오류', e.message) }
  }

  async function handleCreatePost() {
    if (!postContent.trim()) return
    await createPost.mutateAsync({ content: postContent })
    setPostContent('')
  }

  if (!isActive) {
    return (
      <ScrollView style={s.container}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={s.muted}>← 뒤로</Text>
        </TouchableOpacity>
        <View style={s.clubCard}>
          <Text style={s.clubName}>{club.name}</Text>
          {club.description ? <Text style={s.clubDesc}>{club.description}</Text> : null}
          <Text style={s.muted}>멤버 {memberCount}명</Text>
        </View>

        {isPendingMember ? (
          <Text style={[s.muted, { textAlign: 'center', marginTop: 40 }]}>가입 신청 승인 대기 중입니다.</Text>
        ) : club.access_type === 'invite_only' ? (
          <View style={{ marginTop: 20, gap: 12 }}>
            <TextInput value={inviteCode} onChangeText={setInviteCode}
              style={s.input} placeholder="초대 코드 입력 (8자리)" placeholderTextColor="#A8A49C"
              autoCapitalize="characters" maxLength={8} />
            <TouchableOpacity style={s.primaryBtn} onPress={handleInviteJoin}>
              <Text style={s.primaryBtnText}>참여하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[s.primaryBtn, { marginTop: 20 }]} onPress={handleJoin}>
            <Text style={s.primaryBtnText}>{club.access_type === 'public' ? '참여하기' : '가입 신청'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    )
  }

  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
        <Text style={s.muted}>← 뒤로</Text>
      </TouchableOpacity>

      <View style={s.clubCard}>
        <Text style={s.clubName}>{club.name}</Text>
        {club.description ? <Text style={s.clubDesc}>{club.description}</Text> : null}
        <Text style={s.muted}>멤버 {memberCount}명</Text>
      </View>

      <View style={s.tabRow}>
        {(['feed', 'meetups', 'members'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'feed' ? '피드' : t === 'meetups' ? '모임' : '멤버'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'feed' && (
        <FlatList
          data={posts as ClubPost[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 80 }}
          refreshing={false}
          onRefresh={refetchPosts}
          ListHeaderComponent={
            <View style={s.postInput}>
              <TextInput value={postContent} onChangeText={setPostContent}
                style={{ fontSize: 13, color: '#1C1C1C', minHeight: 60 }}
                placeholder="클럽 멤버들과 이야기를 나눠보세요..." placeholderTextColor="#A8A49C"
                multiline />
              <TouchableOpacity style={[s.postBtn, !postContent.trim() && { opacity: 0.4 }]}
                onPress={handleCreatePost} disabled={!postContent.trim() || createPost.isPending}>
                <Text style={{ color: 'white', fontSize: 12 }}>올리기</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center', marginTop: 40 }]}>아직 게시물이 없어요.</Text>}
          renderItem={({ item: post }) => (
            <View style={s.postCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={s.postAuthor}>{post.author?.display_name ?? '알 수 없음'}</Text>
                <Text style={s.muted}>{new Date(post.created_at).toLocaleDateString('ko-KR')}</Text>
              </View>
              {post.content ? <Text style={s.postContent}>{post.content}</Text> : null}
              {post.book && (
                <View style={s.bookChip}>
                  <Text style={{ fontSize: 16 }}>📖</Text>
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#1C1C1C' }}>{post.book.title}</Text>
                    <Text style={{ fontSize: 11, color: '#6B6862' }}>{post.book.author}</Text>
                  </View>
                </View>
              )}
              {(post.author_id === userId || canManage) && (
                <TouchableOpacity onPress={() => deletePostMut.mutate(post.id)}>
                  <Text style={[s.muted, { marginTop: 6 }]}>삭제</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {tab === 'meetups' && (
        <FlatList
          data={meetups as ClubMeetup[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 80 }}
          refreshing={false}
          onRefresh={refetchMeetups}
          ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center', marginTop: 40 }]}>예정된 모임이 없어요.</Text>}
          renderItem={({ item: meetup }) => (
            <View style={s.meetupCard}>
              <Text style={s.meetupTitle}>{meetup.title}</Text>
              <Text style={s.muted}>
                {new Date(meetup.scheduled_at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
              {meetup.location_text ? <Text style={s.muted}>📍 {meetup.location_text}</Text> : null}
              {meetup.description ? <Text style={[s.muted, { marginTop: 4 }]}>{meetup.description}</Text> : null}
              <View style={s.attendRow}>
                {(['going', 'maybe', 'not_going'] as MeetupAttendanceStatus[]).map((st) => (
                  <TouchableOpacity key={st} style={s.attendBtn}
                    onPress={() => updateAttendance.mutate({ meetupId: meetup.id, userId: userId ?? '', status: st })}>
                    <Text style={s.attendBtnText}>{{ going: '갈게요', maybe: '미정', not_going: '못 가요' }[st]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        />
      )}

      {tab === 'members' && (
        <FlatList
          data={members as ClubMember[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8, paddingBottom: 80 }}
          refreshing={false}
          onRefresh={refetchMembers}
          renderItem={({ item: m }) => (
            <View style={s.memberRow}>
              <View>
                <Text style={{ fontSize: 14, color: '#1C1C1C' }}>{m.profile?.display_name ?? m.user_id}</Text>
                <Text style={s.muted}>{{ leader: '클럽장', admin: '운영진', member: '멤버' }[m.role]}{m.status === 'pending' ? ' (대기 중)' : ''}</Text>
              </View>
              {m.status === 'pending' && canManage && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={s.primaryBtn} onPress={() => approveMut.mutate(m.id)}>
                    <Text style={s.primaryBtnText}>승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => rejectMut.mutate(m.id)}>
                    <Text style={s.muted}>거절</Text>
                  </TouchableOpacity>
                </View>
              )}
              {m.status === 'active' && myRole === 'leader' && m.user_id !== userId && (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {m.role === 'member' && (
                    <TouchableOpacity onPress={() => updateRoleMut.mutate({ memberId: m.id, role: 'admin' })}>
                      <Text style={s.muted}>운영진 임명</Text>
                    </TouchableOpacity>
                  )}
                  {m.role === 'admin' && (
                    <TouchableOpacity onPress={() => updateRoleMut.mutate({ memberId: m.id, role: 'member' })}>
                      <Text style={s.muted}>해제</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => removeMut.mutate(m.id)}>
                    <Text style={s.muted}>강퇴</Text>
                  </TouchableOpacity>
                </View>
              )}
              {m.status === 'active' && m.user_id === userId && m.role !== 'leader' && (
                <TouchableOpacity onPress={() => removeMut.mutate(m.id)}>
                  <Text style={s.muted}>탈퇴</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', paddingHorizontal: 20, paddingTop: 60 },
  muted: { fontSize: 12, color: '#A8A49C' },
  clubCard: { backgroundColor: '#C8C5BC', borderRadius: 16, padding: 16, marginBottom: 16 },
  clubName: { fontSize: 20, fontWeight: '500', color: '#1C1C1C', marginBottom: 4 },
  clubDesc: { fontSize: 13, color: '#6B6862', marginBottom: 6, lineHeight: 20 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E8E5E0' },
  tabActive: { backgroundColor: '#1C1C1C' },
  tabText: { fontSize: 12, color: '#6B6862' },
  tabTextActive: { color: 'white' },
  postInput: { backgroundColor: '#E8E5E0', borderRadius: 14, padding: 14, marginBottom: 12 },
  postBtn: { alignSelf: 'flex-end', backgroundColor: '#1C1C1C', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginTop: 6 },
  postCard: { backgroundColor: '#C8C5BC', borderRadius: 14, padding: 14 },
  postAuthor: { fontSize: 13, fontWeight: '500', color: '#1C1C1C' },
  postContent: { fontSize: 13, color: '#1C1C1C', lineHeight: 20 },
  bookChip: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#B8B4AC', borderRadius: 10, padding: 8, marginTop: 6 },
  meetupCard: { backgroundColor: '#C8C5BC', borderRadius: 14, padding: 14 },
  meetupTitle: { fontSize: 15, fontWeight: '500', color: '#1C1C1C', marginBottom: 4 },
  attendRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  attendBtn: { backgroundColor: '#E8E5E0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  attendBtnText: { fontSize: 12, color: '#1C1C1C' },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E8E5E0', borderRadius: 12, padding: 12 },
  input: { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1C1C1C', borderWidth: 1, borderColor: '#E8E5E0' },
  primaryBtn: { backgroundColor: '#1C1C1C', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: 'white', fontSize: 13 },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/clubs/[id].tsx
git commit -m "feat(mobile): add club detail screen"
```

---

## 최종 확인

- [ ] **전체 테스트 실행**

```bash
cd packages/shared && npx jest --no-coverage
```

Expected: 모든 테스트 PASS

- [ ] **웹 빌드 타입 체크**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **공유 패키지 타입 체크**

```bash
cd packages/shared && npx tsc --noEmit
```

Expected: 에러 없음
