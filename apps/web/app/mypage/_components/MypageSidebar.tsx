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
