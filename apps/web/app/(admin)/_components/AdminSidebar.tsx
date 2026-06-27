'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/goods', label: '상품 관리' },
  { href: '/admin/orders', label: '주문 관리' },
  { href: '/admin/customers', label: '고객 관리' },
  { href: '/admin/clubs', label: '독서클럽' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside
      className="w-52 shrink-0 border-r flex flex-col pt-8 px-4 min-h-screen"
      style={{ borderColor: '#E8E5E0', backgroundColor: '#EDEBE7' }}
    >
      <span
        className="text-xs tracking-widest uppercase mb-8 block"
        style={{ color: '#1C1C1C' }}
      >
        Cosmos Admin
      </span>
      <nav className="space-y-1">
        {NAV.map(({ href, label }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="block px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: active ? '#1C1C1C' : 'transparent',
                color: active ? 'white' : '#1C1C1C',
              }}
            >
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
