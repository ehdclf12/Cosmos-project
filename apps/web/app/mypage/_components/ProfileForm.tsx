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
      .eq('id', userId)
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
