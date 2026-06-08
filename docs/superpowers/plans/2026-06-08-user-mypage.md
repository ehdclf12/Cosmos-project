# User Identity & Mypage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회원가입 시 닉네임·전화번호를 받고, 헤더에 닉네임을 표시하며, 마이페이지(/mypage)에서 프로필·찜·클럽·책을 확인할 수 있게 한다.

**Architecture:** Supabase `profiles` 테이블로 사용자 신원을 관리한다. `LandingClient`에서 세션을 감지해 `LandingHeader`에 닉네임을 내려준다. 마이페이지는 서버 컴포넌트 layout에서 인증을 검사하고, 각 탭은 서버 컴포넌트로 Supabase에서 직접 조회한다.

**Tech Stack:** Next.js 16 (App Router), Supabase (SSR + browser client), TypeScript, Tailwind CSS

---

## File Map

| 상태 | 경로 | 역할 |
|------|------|------|
| 수동 SQL | Supabase | profiles 테이블 + RLS |
| 수정 | `apps/web/app/(auth)/register/page.tsx` | 닉네임·전화번호 필드 추가, profiles insert |
| 수정 | `apps/web/app/landing/LandingClient.tsx` | 세션·닉네임 fetch, LandingHeader에 전달 |
| 수정 | `apps/web/app/landing/LandingHeader.tsx` | 로그인 상태에 따라 닉네임/버튼 분기 |
| 생성 | `apps/web/app/mypage/layout.tsx` | 인증 체크 + 랜딩 헤더 + 사이드바 래퍼 |
| 생성 | `apps/web/app/mypage/_components/MypageSidebar.tsx` | 좌측 메뉴 + 로그아웃 |
| 생성 | `apps/web/app/mypage/_components/ProfileForm.tsx` | 닉네임·전화번호 수정 폼 |
| 생성 | `apps/web/app/mypage/page.tsx` | 프로필 수정 페이지 |
| 생성 | `apps/web/app/mypage/wishlist/page.tsx` | 찜한 상품 목록 |
| 생성 | `apps/web/app/mypage/clubs/page.tsx` | 가입한 클럽 목록 |
| 생성 | `apps/web/app/mypage/books/page.tsx` | 읽은 책 목록 |

---

## Task 1: Supabase SQL 마이그레이션 (수동)

- [ ] **Step 1: Supabase SQL 에디터에서 아래 SQL 실행**

```sql
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text unique not null,
  phone text not null,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = user_id);
```

- [ ] **Step 2: 완료 확인**

Supabase 대시보드 → Table Editor → `profiles` 테이블이 생성됐는지 확인.

---

## Task 2: 회원가입 폼 수정

**Files:**
- Modify: `apps/web/app/(auth)/register/page.tsx`

- [ ] **Step 1: 파일 전체를 아래 내용으로 교체**

```tsx
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    setError('')
    if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); return }
    if (!phone.trim()) { setError('휴대폰 번호를 입력해주세요.'); return }
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }

    setLoading(true)
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: data.user.id,
        nickname: nickname.trim(),
        phone: phone.trim(),
        username: nickname.trim(),
        display_name: nickname.trim(),
      })
      if (profileError) {
        if (profileError.code === '23505') {
          setError('이미 사용 중인 닉네임입니다.')
        } else {
          setError(profileError.message)
        }
        setLoading(false)
        return
      }
    }

    setLoading(false)
    router.push('/')
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors"

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-light tracking-widest" style={{ color: '#1C1C1C' }}>COSMOS</h1>
        <p className="mt-2 text-sm" style={{ color: '#A8A49C' }}>새로운 독자로 시작하기</p>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>닉네임</label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputClass} placeholder="사용할 닉네임" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>휴대폰 번호</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="010-0000-0000" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>비밀번호 (6자 이상)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>비밀번호 확인</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRegister()} className={inputClass} placeholder="••••••••" />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <button onClick={handleRegister} disabled={loading}
          className="w-full mt-6 py-3 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#1C1C1C' }}>
          {loading ? '가입 중...' : '가입하기'}
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

- [ ] **Step 2: 커밋**

```bash
git add apps/web/app/\(auth\)/register/page.tsx
git commit -m "feat: add nickname and phone fields to register form"
```

---

## Task 3: LandingClient + LandingHeader 인증 연동

**Files:**
- Modify: `apps/web/app/landing/LandingClient.tsx`
- Modify: `apps/web/app/landing/LandingHeader.tsx`

- [ ] **Step 1: LandingHeader.tsx 전체 교체**

```tsx
'use client'
import Link from 'next/link'

interface Props {
  onMenuClick: () => void
  nickname: string | null
  onLogout: () => void
}

export default function LandingHeader({ onMenuClick, nickname, onLogout }: Props) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14"
      style={{ backgroundColor: '#F2F1EE' }}
    >
      <div className="flex items-center gap-4">
        <button type="button" onClick={onMenuClick} aria-label="Open menu" className="flex flex-col gap-1.5 p-1" style={{ color: '#1C1C1C' }}>
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
        </button>
        <Link href="/" className="text-sm font-light tracking-widest" style={{ color: '#1C1C1C' }}>
          COSMOS
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {nickname ? (
          <>
            <Link
              href="/mypage"
              className="text-xs tracking-widest uppercase px-4 py-2 border transition-colors hover:bg-black hover:text-white"
              style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
            >
              {nickname}
            </Link>
            <button
              onClick={onLogout}
              className="text-xs tracking-widest uppercase px-4 py-2 text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#1C1C1C' }}
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-xs tracking-widest uppercase px-4 py-2 border transition-colors hover:bg-black hover:text-white"
              style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="text-xs tracking-widest uppercase px-4 py-2 text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#1C1C1C' }}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 2: LandingClient.tsx 전체 교체**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LandingHeader from './LandingHeader'
import LandingSidebar from './LandingSidebar'

export default function LandingClient() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setNickname(null); return }
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('user_id', session.user.id)
        .single()
      setNickname(data?.nickname ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) { setNickname(null); return }
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('user_id', session.user.id)
        .single()
      setNickname(data?.nickname ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setNickname(null)
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <LandingHeader
        onMenuClick={() => setSidebarOpen(true)}
        nickname={nickname}
        onLogout={handleLogout}
      />
      <LandingSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/web/app/landing/LandingHeader.tsx apps/web/app/landing/LandingClient.tsx
git commit -m "feat: show nickname in header when logged in"
```

---

## Task 4: MypageSidebar 컴포넌트

**Files:**
- Create: `apps/web/app/mypage/_components/MypageSidebar.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/mypage', label: '프로필 수정', group: '내 정보' },
  { href: '/mypage/wishlist', label: '찜한 상품', group: '찜한 목록' },
  { href: '/mypage/clubs', label: '가입한 클럽', group: null },
  { href: '/mypage/books', label: '읽은 책', group: null },
]

interface Props {
  nickname: string
}

export default function MypageSidebar({ nickname }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside
      className="shrink-0 py-10 px-6"
      style={{ width: '240px', borderRight: '1px solid #E8E5E0', minHeight: 'calc(100vh - 56px)' }}
    >
      <p className="text-sm font-medium mb-8" style={{ color: '#1C1C1C' }}>
        {nickname} 님
      </p>

      <nav className="flex flex-col">
        {NAV.map(({ href, label, group }) => {
          const isActive = pathname === href
          return (
            <div key={href}>
              {group && (
                <p className="text-xs tracking-widest uppercase mt-6 mb-2" style={{ color: '#A8A49C' }}>
                  {group}
                </p>
              )}
              <Link
                href={href}
                className="block text-sm py-1.5 transition-colors hover:opacity-60"
                style={{ color: isActive ? '#1C1C1C' : '#6B6862', fontWeight: isActive ? 500 : 400 }}
              >
                {label}
              </Link>
            </div>
          )
        })}
      </nav>

      <div className="mt-10 pt-6" style={{ borderTop: '1px solid #E8E5E0' }}>
        <button
          onClick={handleLogout}
          className="text-sm transition-opacity hover:opacity-60"
          style={{ color: '#A8A49C' }}
        >
          로그아웃
        </button>
      </div>
    </aside>
  )
}
```

---

## Task 5: Mypage 레이아웃

**Files:**
- Create: `apps/web/app/mypage/layout.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingClient from '@/app/landing/LandingClient'
import MypageSidebar from './_components/MypageSidebar'

export default async function MypageLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('user_id', user.id)
    .single()

  const nickname = profile?.nickname ?? '사용자'

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />
      <div className="pt-14 flex">
        <MypageSidebar nickname={nickname} />
        <main className="flex-1 px-8 md:px-12 py-10">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋 (Task 4 + 5 함께)**

```bash
git add apps/web/app/mypage/
git commit -m "feat: add mypage layout with sidebar"
```

---

## Task 6: ProfileForm + /mypage 프로필 페이지

**Files:**
- Create: `apps/web/app/mypage/_components/ProfileForm.tsx`
- Create: `apps/web/app/mypage/page.tsx`

- [ ] **Step 1: ProfileForm.tsx 생성**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  initialNickname: string
  initialPhone: string
}

export default function ProfileForm({ userId, initialNickname, initialPhone }: Props) {
  const router = useRouter()
  const [nickname, setNickname] = useState(initialNickname)
  const [phone, setPhone] = useState(initialPhone)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const inputClass = "w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors"

  async function handleSave() {
    setError('')
    setSuccess(false)
    if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); return }
    if (!phone.trim()) { setError('휴대폰 번호를 입력해주세요.'); return }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ nickname: nickname.trim(), phone: phone.trim(), username: nickname.trim(), display_name: nickname.trim() })
      .eq('user_id', userId)
    setLoading(false)

    if (updateError) {
      setError(updateError.code === '23505' ? '이미 사용 중인 닉네임입니다.' : updateError.message)
      return
    }
    setSuccess(true)
    router.refresh()
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-light mb-8" style={{ color: '#1C1C1C' }}>프로필 수정</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>닉네임</label>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>휴대폰 번호</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="010-0000-0000" />
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {success && <p className="mt-3 text-xs" style={{ color: '#6B6862' }}>저장되었습니다.</p>}
      <button
        onClick={handleSave}
        disabled={loading}
        className="mt-6 px-8 py-3 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#1C1C1C' }}
      >
        {loading ? '저장 중...' : '저장하기'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: apps/web/app/mypage/page.tsx 생성**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './_components/ProfileForm'

export default async function MypagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, phone')
    .eq('user_id', user.id)
    .single()

  return (
    <ProfileForm
      userId={user.id}
      initialNickname={profile?.nickname ?? ''}
      initialPhone={profile?.phone ?? ''}
    />
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/web/app/mypage/_components/ProfileForm.tsx apps/web/app/mypage/page.tsx
git commit -m "feat: add profile edit page"
```

---

## Task 7: /mypage/wishlist 찜한 상품 페이지

**Files:**
- Create: `apps/web/app/mypage/wishlist/page.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GoodsCard from '@/app/goods/_components/GoodsCard'

export default async function WishlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('goods_wishlist')
    .select('goods:goods(id, title, description, price, original_price, images, status, categories(name, slug))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const goods = (rows ?? []).map((r) => r.goods).filter(Boolean)

  return (
    <div>
      <h2 className="text-xl font-light mb-8" style={{ color: '#1C1C1C' }}>찜한 상품</h2>
      {goods.length === 0 ? (
        <p className="text-sm" style={{ color: '#A8A49C' }}>찜한 상품이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {goods.map((item) => (
            <GoodsCard key={item!.id} item={item as any} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/app/mypage/wishlist/
git commit -m "feat: add wishlist page to mypage"
```

---

## Task 8: /mypage/clubs 가입한 클럽 페이지

**Files:**
- Create: `apps/web/app/mypage/clubs/page.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MyClubsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('club_members')
    .select('club:clubs(id, name, description, tags, access_type)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })

  const clubs = (memberships ?? []).map((m) => m.club).filter(Boolean)

  return (
    <div>
      <h2 className="text-xl font-light mb-8" style={{ color: '#1C1C1C' }}>가입한 클럽</h2>
      {clubs.length === 0 ? (
        <p className="text-sm" style={{ color: '#A8A49C' }}>가입한 클럽이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((club) => (
            <Link key={club!.id} href={`/clubs/${club!.id}`}>
              <div className="rounded-2xl p-5 hover:opacity-90 transition-opacity" style={{ backgroundColor: '#C8C5BC' }}>
                <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-xl" style={{ backgroundColor: '#2A2A28', color: 'white' }}>◈</div>
                <h3 className="font-medium mb-1 truncate" style={{ color: '#1C1C1C' }}>{club!.name}</h3>
                {club!.description && (
                  <p className="text-xs line-clamp-2 mb-2" style={{ color: '#6B6862' }}>{club!.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {(club!.tags ?? []).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E8E5E0', color: '#6B6862' }}>{tag}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/app/mypage/clubs/
git commit -m "feat: add clubs page to mypage"
```

---

## Task 9: /mypage/books 읽은 책 페이지

**Files:**
- Create: `apps/web/app/mypage/books/page.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const STATUS_LABELS: Record<string, string> = {
  want_to_read: '읽고 싶음',
  reading: '읽는 중',
  finished: '읽음',
}

export default async function MyBooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('user_books')
    .select('status, book:books(id, title, author, cover_url)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const userBooks = rows ?? []

  return (
    <div>
      <h2 className="text-xl font-light mb-8" style={{ color: '#1C1C1C' }}>읽은 책</h2>
      {userBooks.length === 0 ? (
        <p className="text-sm" style={{ color: '#A8A49C' }}>등록한 책이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {userBooks.map((entry, idx) => entry.book && (
            <Link key={`${entry.book.id}-${idx}`} href={`/books/${entry.book.id}`}>
              <div className="group">
                <div className="relative aspect-[2/3] mb-3 overflow-hidden rounded" style={{ backgroundColor: '#E8E5E0' }}>
                  {entry.book.cover_url ? (
                    <Image src={entry.book.cover_url} alt={entry.book.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#A8A49C' }}>No Cover</div>
                  )}
                </div>
                <p className="text-sm font-light line-clamp-2 mb-1" style={{ color: '#1C1C1C' }}>{entry.book.title}</p>
                <p className="text-xs" style={{ color: '#A8A49C' }}>{entry.book.author}</p>
                <p className="text-xs mt-1" style={{ color: '#6B6862' }}>{STATUS_LABELS[entry.status] ?? entry.status}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/app/mypage/books/
git commit -m "feat: add books page to mypage"
```

---

## Task 10: 빌드 확인 및 최종 푸시

- [ ] **Step 1: 빌드 확인**

```bash
cd /Users/cosmos/Desktop/Cosmos && export PATH="$HOME/.local/node/bin:$PATH" && npx next build --app-dir apps/web
```
또는
```bash
cd /Users/cosmos/Desktop/Cosmos/apps/web && export PATH="$HOME/.local/node/bin:$PATH" && npx next build
```

Expected: 빌드 성공, 타입 에러 없음

- [ ] **Step 2: 확인 항목**

| 항목 | 확인 방법 |
|------|-----------|
| 비로그인 상태 헤더: Log In + Sign Up 버튼 | 로그아웃 후 메인 페이지 |
| 로그인 후 헤더: 닉네임 + Log Out 버튼 | 로그인 후 메인 페이지 |
| 닉네임 클릭 시 /mypage 이동 | 클릭 |
| Log Out 클릭 시 헤더가 Log In/Sign Up으로 변경 | 클릭 |
| /mypage 비로그인 접근 시 /login 리다이렉트 | 로그아웃 후 /mypage 직접 접속 |
| 회원가입 폼에 닉네임·전화번호 필드 표시 | /register 접속 |
| 마이페이지 좌측 메뉴 + 우측 콘텐츠 레이아웃 | /mypage 접속 |
| 찜한 상품 없을 때 빈 상태 메시지 | /mypage/wishlist |
| 가입한 클럽 없을 때 빈 상태 메시지 | /mypage/clubs |
| 읽은 책 없을 때 빈 상태 메시지 | /mypage/books |

- [ ] **Step 3: 최종 푸시**

```bash
git push origin main
```
