'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const GOODS_SUB = [
  { href: '/admin/goods', label: '상품 목록' },
  { href: '/admin/goods/new', label: '상품 등록' },
  { href: '/admin/orders', label: '주문관리' },
]

const NAV_ITEMS = [
  { href: '/admin/customers', label: '고객관리' },
  { href: '/admin/content', label: '콘텐츠 관리' },
  { href: '/admin/clubs', label: '독서클럽' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const goodsActive = pathname.startsWith('/admin/goods') || pathname.startsWith('/admin/orders')
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

      {/* 하단: 메인 사이트 이동 */}
      <div className="mt-auto pb-8 pt-4 border-t" style={{ borderColor: '#E8E5E0' }}>
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-black hover:text-white"
          style={{ color: '#6B6862' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Cosmos 홈
        </Link>
      </div>
    </aside>
  )
}
