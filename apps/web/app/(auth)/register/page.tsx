'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [nicknameTaken, setNicknameTaken] = useState(false)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const SPECIAL_CHAR = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/

  async function checkNickname(value: string) {
    setNicknameTaken(false)
    if (!value.trim()) return
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', value.trim())
      .maybeSingle()
    if (data) setNicknameTaken(true)
  }

  async function handleRegister() {
    setError('')
    if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); return }
    if (nicknameTaken) { setError('이미 사용 중인 닉네임입니다.'); return }
    if (password.length < 10) { setError('비밀번호는 10자 이상이어야 합니다.'); return }
    if (!SPECIAL_CHAR.test(password)) { setError('비밀번호에 특수문자(!@#$ 등)를 포함해주세요.'); return }
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }

    setLoading(true)
    const supabase = createClient()

    // 제출 시 한 번 더 중복 확인
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', nickname.trim())
      .maybeSingle()
    if (existing) {
      setNicknameTaken(true)
      setError('이미 사용 중인 닉네임입니다.')
      setLoading(false)
      return
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname: nickname.trim(), phone: phone.trim() } },
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    setLoading(false)
    setDone(true)
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors"

  if (done) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-light tracking-widest mb-10" style={{ color: '#1C1C1C' }}>COSMOS</h1>
        <div className="bg-white rounded-2xl p-10 shadow-sm">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: '#F2F1EE' }}>
            <svg className="w-7 h-7" fill="none" stroke="#1C1C1C" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-base font-light mb-3" style={{ color: '#1C1C1C' }}>인증 메일을 발송했습니다</p>
          <p className="text-sm leading-relaxed" style={{ color: '#6B6862' }}>
            <span className="font-medium" style={{ color: '#1C1C1C' }}>{email}</span>로<br />
            인증 메일을 보냈습니다.<br />
            메일함을 확인하여 인증 링크를 클릭하면<br />
            가입이 완료됩니다.
          </p>
          <p className="text-xs mt-4" style={{ color: '#A8A49C' }}>
            메일이 보이지 않는다면 스팸함을 확인해 주세요.
          </p>
          <div className="mt-6 pt-6 border-t" style={{ borderColor: '#F2F1EE' }}>
            <p className="text-xs mb-3" style={{ color: '#A8A49C' }}>인증을 완료하셨나요?</p>
            <Link
              href="/login"
              className="block w-full py-3 rounded-lg text-sm font-medium text-white text-center"
              style={{ backgroundColor: '#1C1C1C' }}
            >
              로그인하러 가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

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
            <input
              type="text"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setNicknameTaken(false) }}
              onBlur={(e) => checkNickname(e.target.value)}
              className={inputClass + (nicknameTaken ? ' border-red-400' : '')}
              placeholder="사용할 닉네임"
            />
            {nicknameTaken && (
              <p className="mt-1 text-xs text-red-400">이미 사용 중인 닉네임입니다.</p>
            )}
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>휴대폰 번호 (선택)</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="010-0000-0000" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>비밀번호 (10자 이상, 특수문자 포함)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>비밀번호 확인</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRegister()} className={inputClass} placeholder="••••••••" />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <button onClick={handleRegister} disabled={loading || nicknameTaken}
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
