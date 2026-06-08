'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push('/')
  }

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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400">{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full mt-6 py-3 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          {loading ? '로그인 중...' : '로그인'}
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
