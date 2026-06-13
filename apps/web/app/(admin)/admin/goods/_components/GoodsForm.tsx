'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Category { id: string; name: string }

interface GoodsFormProps {
  categories: Category[]
  initial?: {
    id: string
    title: string
    description: string | null
    price: number
    original_price: number | null
    images: string[]
    status: 'active' | 'sold_out' | 'draft'
    category_id: string | null
  }
}

export default function GoodsForm({ categories, initial }: GoodsFormProps) {
  const router = useRouter()
  const isEdit = !!initial?.id
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    price: initial?.price?.toString() ?? '',
    original_price: initial?.original_price?.toString() ?? '',
    images: (initial?.images ?? []).join('\n'),
    status: initial?.status ?? 'draft' as 'active' | 'sold_out' | 'draft',
    category_id: initial?.category_id ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const payload = {
      title: form.title,
      description: form.description || null,
      price: Number(form.price),
      original_price: form.original_price ? Number(form.original_price) : null,
      images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
      status: form.status,
      category_id: form.category_id || null,
    }

    const { error: err } = isEdit
      ? await supabase.from('goods').update(payload).eq('id', initial!.id)
      : await supabase.from('goods').insert(payload)

    setLoading(false)
    if (err) { setError(err.message); return }
    router.push('/admin/goods')
    router.refresh()
  }

  const field = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 bg-white"
  const lbl = "block text-xs mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <label className={lbl} style={{ color: '#A8A49C' }}>상품명 *</label>
        <input value={form.title} onChange={(e) => set('title', e.target.value)} className={field} required />
      </div>

      <div>
        <label className={lbl} style={{ color: '#A8A49C' }}>설명</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} className={field} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>가격 *</label>
          <input
            type="number" value={form.price}
            onChange={(e) => set('price', e.target.value)}
            className={field} required min={0}
          />
        </div>
        <div>
          <label className={lbl} style={{ color: '#A8A49C' }}>원가</label>
          <input
            type="number" value={form.original_price}
            onChange={(e) => set('original_price', e.target.value)}
            className={field} min={0}
          />
        </div>
      </div>

      <div>
        <label className={lbl} style={{ color: '#A8A49C' }}>카테고리</label>
        <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} className={field}>
          <option value="">카테고리 없음</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className={lbl} style={{ color: '#A8A49C' }}>이미지 URL (줄바꿈으로 구분)</label>
        <textarea
          value={form.images}
          onChange={(e) => set('images', e.target.value)}
          className={field} rows={3}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div>
        <label className={lbl} style={{ color: '#A8A49C' }}>상태</label>
        <select value={form.status} onChange={(e) => set('status', e.target.value)} className={field}>
          <option value="draft">임시저장</option>
          <option value="active">판매중</option>
          <option value="sold_out">품절</option>
        </select>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button" onClick={() => router.push('/admin/goods')}
          className="flex-1 py-3 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
          style={{ color: '#6B6862' }}
        >
          취소
        </button>
        <button
          type="submit" disabled={loading}
          className="flex-1 py-3 rounded-xl text-sm text-white disabled:opacity-50"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          {loading ? '저장 중...' : isEdit ? '수정 완료' : '등록하기'}
        </button>
      </div>
    </form>
  )
}
