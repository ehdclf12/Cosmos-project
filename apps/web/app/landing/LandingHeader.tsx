'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCartStore } from '@/lib/cart-store'

interface Props {
  onMenuClick: () => void
  nickname: string | null
  onLogout: () => void
}

export default function LandingHeader({ onMenuClick, nickname, onLogout }: Props) {
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    setCartCount(useCartStore.getState().totalCount())
    return useCartStore.subscribe((state) => setCartCount(state.totalCount()))
  }, [])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14"
      style={{ backgroundColor: '#F2F1EE' }}
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex flex-col gap-1.5 p-1"
          style={{ color: '#1C1C1C' }}
        >
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
        </button>
        <Link href="/" className="text-sm font-light tracking-widest" style={{ color: '#1C1C1C' }}>
          COSMOS
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* 장바구니 아이콘 */}
        <Link
          href={cartCount > 0 ? '/checkout' : '/goods'}
          className="relative flex items-center justify-center w-8 h-8 transition-opacity hover:opacity-60"
          aria-label="장바구니"
          style={{ color: '#1C1C1C' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {cartCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center"
              style={{ backgroundColor: '#1C1C1C', fontSize: '9px' }}
            >
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </Link>

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
