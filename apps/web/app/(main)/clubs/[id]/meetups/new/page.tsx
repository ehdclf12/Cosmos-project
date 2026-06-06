'use client'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createMeetupSchema, useCreateMeetup } from '@cosmos/shared'
import type { CreateMeetupInput } from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

export default function NewMeetupPage() {
  const { id: clubId } = useParams<{ id: string }>()
  const router = useRouter()
  const { userId, supabase } = useSupabaseUser()
  const { mutateAsync, isPending } = useCreateMeetup(supabase, clubId, userId ?? '')
  const { register, handleSubmit, formState: { errors } } = useForm<CreateMeetupInput>({
    resolver: zodResolver(createMeetupSchema),
  })

  async function onSubmit(data: CreateMeetupInput) {
    if (!userId) return
    await mutateAsync(data)
    router.push(`/clubs/${clubId}`)
  }

  const field = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 bg-white"
  const lbl = "block text-xs mb-1.5"

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>모임 만들기</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>모임 제목 *</label>
          <input {...register('title')} className={field} placeholder="5월 정기 모임" />
          {errors.title && <p className="text-xs mt-1 text-red-400">{errors.title.message}</p>}
        </div>

        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>일시 *</label>
          <input {...register('scheduled_at')} type="datetime-local" className={field} />
          {errors.scheduled_at && <p className="text-xs mt-1 text-red-400">{errors.scheduled_at.message}</p>}
        </div>

        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>장소 (텍스트)</label>
          <input {...register('location_text')} className={field} placeholder="서울 마포구 카페 이름" />
        </div>

        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>지도 링크 (카카오맵 등 URL)</label>
          <input {...register('location_url')} className={field} placeholder="https://kko.to/..." />
          {errors.location_url && <p className="text-xs mt-1 text-red-400">올바른 URL을 입력해주세요</p>}
        </div>

        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>설명</label>
          <textarea {...register('description')} className={field} rows={3} placeholder="모임에 대해 알려주세요" />
        </div>

        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>최대 참석 인원 (선택)</label>
          <input {...register('max_attendees', { valueAsNumber: true })} type="number"
            className={field} placeholder="제한 없음" min={2} max={100} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
            style={{ color: '#6B6862' }}>취소</button>
          <button type="submit" disabled={isPending || !userId}
            className="flex-1 py-3 rounded-xl text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: '#1C1C1C' }}>
            {isPending ? '생성 중...' : '모임 만들기'}
          </button>
        </div>
      </form>
    </div>
  )
}
