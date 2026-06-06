'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClubSchema, useCreateClub } from '@cosmos/shared'
import type { CreateClubInput } from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

const ACCESS_OPTIONS = [
  { value: 'public', label: '공개', desc: '누구나 바로 참여' },
  { value: 'private', label: '비공개', desc: '클럽장 승인 후 가입' },
  { value: 'invite_only', label: '초대 전용', desc: '초대 코드로만 참여' },
] as const

export default function NewClubPage() {
  const router = useRouter()
  const { userId, supabase } = useSupabaseUser()
  const { mutateAsync, isPending } = useCreateClub(supabase, userId ?? '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateClubInput>({
    resolver: zodResolver(createClubSchema),
    defaultValues: { tags: [], access_type: 'public' },
  })
  const accessType = watch('access_type')

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t) && tags.length < 5) {
      const next = [...tags, t]
      setTags(next)
      setValue('tags', next)
      setTagInput('')
    }
  }

  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t)
    setTags(next)
    setValue('tags', next)
  }

  async function onSubmit(data: CreateClubInput) {
    if (!userId) return
    const club = await mutateAsync(data)
    router.push(`/clubs/${club.id}`)
  }

  const field = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 bg-white"
  const label = "block text-xs mb-1.5"

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>새 클럽 만들기</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className={label} style={{ color: '#A8A49C' }}>클럽 이름 *</label>
          <input {...register('name')} className={field} placeholder="우리 독서 모임" />
          {errors.name && <p className="text-xs mt-1 text-red-400">{errors.name.message}</p>}
        </div>

        <div>
          <label className={label} style={{ color: '#A8A49C' }}>소개</label>
          <textarea {...register('description')} className={field} rows={3} placeholder="클럽을 소개해주세요" />
        </div>

        <div>
          <label className={label} style={{ color: '#A8A49C' }}>태그 (최대 5개)</label>
          <div className="flex gap-2">
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              className={field} placeholder="소설, SF, 고전..." />
            <button type="button" onClick={addTag}
              className="px-4 rounded-xl text-sm text-white shrink-0" style={{ backgroundColor: '#1C1C1C' }}>
              추가
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full cursor-pointer"
                style={{ backgroundColor: '#E8E5E0', color: '#6B6862' }}
                onClick={() => removeTag(t)}>
                {t} ✕
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className={label} style={{ color: '#A8A49C' }}>가입 방식 *</label>
          <div className="grid grid-cols-3 gap-2">
            {ACCESS_OPTIONS.map(({ value, label: l, desc }) => (
              <button key={value} type="button"
                onClick={() => setValue('access_type', value)}
                className="p-3 rounded-xl border text-left transition-colors"
                style={{
                  borderColor: accessType === value ? '#1C1C1C' : '#E8E5E0',
                  backgroundColor: accessType === value ? '#F2F1EE' : 'white',
                }}>
                <p className="text-xs font-medium" style={{ color: '#1C1C1C' }}>{l}</p>
                <p className="text-xs mt-0.5" style={{ color: '#A8A49C' }}>{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={label} style={{ color: '#A8A49C' }}>인원 제한 (선택, 최소 2명)</label>
          <input {...register('max_members', { valueAsNumber: true })} type="number"
            className={field} placeholder="제한 없음" min={2} max={100} />
          {errors.max_members && <p className="text-xs mt-1 text-red-400">{errors.max_members.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
            style={{ color: '#6B6862' }}>취소</button>
          <button type="submit" disabled={isPending || !userId}
            className="flex-1 py-3 rounded-xl text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: '#1C1C1C' }}>
            {isPending ? '생성 중...' : '클럽 만들기'}
          </button>
        </div>
      </form>
    </div>
  )
}
