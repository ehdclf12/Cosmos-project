'use client'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AddressSearchInput from '@/app/checkout/_components/AddressSearchInput'

interface Props {
  userId: string
  initialNickname: string
  initialPhone: string
  initialZonecode: string
  initialBaseAddress: string
  initialDetailAddress: string
}

export default function ProfileForm({
  userId,
  initialNickname,
  initialPhone,
  initialZonecode,
  initialBaseAddress,
  initialDetailAddress,
}: Props) {
  const router = useRouter()
  const [nickname, setNickname] = useState(initialNickname)
  const [nicknameTaken, setNicknameTaken] = useState(false)
  const [phone, setPhone] = useState(initialPhone)
  const [zonecode, setZonecode] = useState(initialZonecode)
  const [baseAddress, setBaseAddress] = useState(initialBaseAddress)
  const [detailAddress, setDetailAddress] = useState(initialDetailAddress)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const inputClass = "w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-black outline-none focus:border-gray-400 transition-colors"

  const handleAddressSelect = useCallback((zc: string, addr: string) => {
    setZonecode(zc)
    setBaseAddress(addr)
  }, [])

  async function checkNickname(value: string) {
    setNicknameTaken(false)
    if (!value.trim() || value.trim() === initialNickname) return
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', value.trim())
      .neq('id', userId)
      .maybeSingle()
    if (data) setNicknameTaken(true)
  }

  async function handleSave() {
    setError('')
    setSuccess(false)
    if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); return }
    if (nicknameTaken) { setError('이미 사용 중인 닉네임입니다.'); return }

    setLoading(true)
    const supabase = createClient()

    // 제출 시 한 번 더 중복 확인 (자기 자신 제외)
    if (nickname.trim() !== initialNickname) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', nickname.trim())
        .neq('id', userId)
        .maybeSingle()
      if (existing) {
        setNicknameTaken(true)
        setError('이미 사용 중인 닉네임입니다.')
        setLoading(false)
        return
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        nickname: nickname.trim(),
        phone: phone.trim() || null,
        username: nickname.trim(),
        display_name: nickname.trim(),
        default_zonecode: zonecode || null,
        default_base_address: baseAddress || null,
        default_detail_address: detailAddress.trim() || null,
      })
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
          <input
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); setNicknameTaken(false) }}
            onBlur={(e) => checkNickname(e.target.value)}
            className={inputClass + (nicknameTaken ? ' border-red-400' : '')}
          />
          {nicknameTaken && (
            <p className="mt-1 text-xs text-red-400">이미 사용 중인 닉네임입니다.</p>
          )}
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>휴대폰 번호 (선택)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="010-0000-0000" />
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>기본 배송지</label>
          <AddressSearchInput
            zonecode={zonecode}
            baseAddress={baseAddress}
            detailAddress={detailAddress}
            onAddressSelect={handleAddressSelect}
            onDetailChange={setDetailAddress}
            inputClass={inputClass}
          />
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {success && <p className="mt-3 text-xs" style={{ color: '#6B6862' }}>저장되었습니다.</p>}
      <button
        onClick={handleSave}
        disabled={loading || nicknameTaken}
        className="mt-6 px-8 py-3 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#1C1C1C' }}
      >
        {loading ? '저장 중...' : '저장하기'}
      </button>
    </div>
  )
}
