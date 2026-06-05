'use client'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addBookSchema, useAddBook } from '@cosmos/shared'
import type { AddBookInput } from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

export default function NewBookPage() {
  const router = useRouter()
  const { userId, supabase } = useSupabaseUser()
  const { mutateAsync, isPending } = useAddBook(supabase, userId ?? '')
  const { register, handleSubmit, formState: { errors } } = useForm<AddBookInput>({
    resolver: zodResolver(addBookSchema),
  })

  async function onSubmit(data: AddBookInput) {
    if (!userId) return
    await mutateAsync(data)
    router.push('/books')
  }

  const fieldStyle = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors bg-white"

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>새 책 추가</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>제목 *</label>
          <input {...register('title')} className={fieldStyle} placeholder="책 제목" />
          {errors.title && <p className="text-xs mt-1 text-red-400">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>저자 *</label>
          <input {...register('author')} className={fieldStyle} placeholder="저자 이름" />
          {errors.author && <p className="text-xs mt-1 text-red-400">{errors.author.message}</p>}
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>출판사</label>
          <input {...register('publisher')} className={fieldStyle} placeholder="출판사 (선택)" />
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>출판 연도</label>
          <input
            {...register('published_year', { valueAsNumber: true })}
            type="number"
            className={fieldStyle}
            placeholder="2024"
          />
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>표지 이미지 URL</label>
          <input {...register('cover_url')} className={fieldStyle} placeholder="https://..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            style={{ color: '#6B6862' }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isPending || !userId}
            className="flex-1 py-3 rounded-xl text-sm text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1C1C1C' }}
          >
            {isPending ? '추가 중...' : '추가하기'}
          </button>
        </div>
      </form>
    </div>
  )
}
