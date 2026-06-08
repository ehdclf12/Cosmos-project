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
        id: data.user.id,
        nickname: nickname.trim(),
        phone: phone.trim(),
        username: nickname.trim(),
        display_name: nickname.trim(),
      })
      if (profileError) {
        setError(profileError.code === '23505' ? '이미 사용 중인 닉네임입니다.' : profileError.message)
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
