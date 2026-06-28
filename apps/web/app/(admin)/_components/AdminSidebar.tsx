'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const GOODS_SUB = [
  { href: '/admin/goods', label: '상품 목록' },
  { href: '/admin/goods/new', label: '상품 등록' },
]

const NAV_ITEMS = [
  { href: '/admin/orders', label: '주문관리' },
  { href: '/admin/customers', label: '고객관리' },
  { href: '/admin/clubs', label: '독서클럽' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const goodsActive = pathname.startsWith('/admin/goods')
  const [open, setOpen] = useState(goodsActive)
  const dashActive = pathname === '/admin'

  return (
    <aside
      className="w-52 shrink-0 border-r flex flex-col pt-8 px-4 min-h-screen"
      style={{ borderColor: '#E8E5E0', backgroundColor: '#EDEBE7' }}
    >
      <span className="text-xs tracking-widest uppercase mb-8 block" style={{ color: '#1C1C1C' }}>
        Cosmos Admin
      </span>
      <nav className="space-y-1">
        {/* 대시보드 */}
        <Link
          href="/admin"
          className="block px-3 py-2 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: dashActive ? '#1C1C1C' : 'transparent',
            color: dashActive ? 'white' : '#1C1C1C',
          }}
        >
          대시보드
        </Link>

        {/* 상품관리 아코디언 */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left"
          style={{
            backgroundColor: goodsActive ? 'rgba(28,28,28,0.08)' : 'transparent',
            color: '#1C1C1C',
          }}
        >
          <span>상품관리</span>
          <span style={{ opacity: 0.45, fontSize: 10 }}>{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <div className="ml-3 space-y-0.5 pb-1">
            {GOODS_SUB.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className="block px-3 py-1.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: active ? '#1C1C1C' : 'transparent',
                    color: active ? 'white' : '#1C1C1C',
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        )}

        {/* 나머지 메뉴 */}
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href)
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
