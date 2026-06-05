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
