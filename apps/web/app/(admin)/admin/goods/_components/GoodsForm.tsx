'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface Category { id: string; name: string }

interface GoodsFormProps {
  categories: Category[]
  initial?: {
    id: string
    title: string
    description: string | null
    price: number
    discount_rate: number
    images: string[]
    status: 'active' | 'sold_out' | 'draft'
    category_id: string | null
    published_at: string | null
  }
}

export default function GoodsForm({ categories, initial }: GoodsFormProps) {
  const router = useRouter()
  const isEdit = !!initial?.id
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    price: initial?.price?.toString() ?? '',
    discount_rate: initial?.discount_rate?.toString() ?? '0',
    status: initial?.status ?? ('draft' as 'active' | 'sold_out' | 'draft'),
    category_id: initial?.category_id ?? '',
    published_at: initial?.published_at
      ? new Date(initial.published_at).toISOString().slice(0, 16)
      : '',
  })
  const [images, setImages] = useState<string[]>(initial?.images ?? [])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const price = Number(form.price) || 0
  const discountRate = Math.min(100, Math.max(0, Number(form.discount_rate) || 0))
  const finalPrice = Math.round(price * (1 - discountRate / 100))

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    setError('')
    const supabase = createClient()
    const uploaded: string[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('goods-images')
        .upload(path, file, { contentType: file.type })
      if (upErr) { setError(upErr.message); setUploading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('goods-images').getPublicUrl(path)
      uploaded.push(publicUrl)
    }

    setImages((prev) => [...prev, ...uploaded].slice(0, 10))
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function removeImage(url: string) {
    const supabase = createClient()
    const path = url.split('/goods-images/')[1]
    if (path) await supabase.storage.from('goods-images').remove([path])
    setImages((prev) => prev.filter((u) => u !== url))
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
      discount_rate: discountRate,
      images,
      status: form.status,
      category_id: form.category_id || null,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
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
  const lbl = "block text-xs mb-1.5 font-medium"

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <label className={lbl} style={{ color: '#1C1C1C' }}>상품명 *</label>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className={field}
          style={{ color: '#1C1C1C' }}
          required
        />
      </div>

      <div>
        <label className={lbl} style={{ color: '#1C1C1C' }}>설명</label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className={field}
          style={{ color: '#1C1C1C' }}
          rows={3}
        />
      </div>

      {/* 가격 + 할인율 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl} style={{ color: '#1C1C1C' }}>정가 (원) *</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            className={field}
            style={{ color: '#1C1C1C' }}
            required
            min={0}
          />
        </div>
        <div>
          <label className={lbl} style={{ color: '#1C1C1C' }}>할인율 (%)</label>
          <input
            type="number"
            value={form.discount_rate}
            onChange={(e) => set('discount_rate', e.target.value)}
            className={field}
            style={{ color: '#1C1C1C' }}
            min={0}
            max={100}
          />
        </div>
      </div>
      {price > 0 && (
        <div className="text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: '#E8E5E0', color: '#1C1C1C' }}>
          고객 노출 최종가: <strong>₩{finalPrice.toLocaleString()}</strong>
          {discountRate > 0 && <span className="ml-2 text-xs">({discountRate}% 할인)</span>}
        </div>
      )}

      <div>
        <label className={lbl} style={{ color: '#1C1C1C' }}>카테고리</label>
        <select
          value={form.category_id}
          onChange={(e) => set('category_id', e.target.value)}
          className={field}
          style={{ color: '#1C1C1C' }}
        >
          <option value="">카테고리 없음</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* 이미지 업로드 */}
      <div>
        <label className={lbl} style={{ color: '#1C1C1C' }}>이미지 (최대 10장)</label>

        {/* 미리보기 썸네일 */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {images.map((url, i) => (
              <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden" style={{ backgroundColor: '#E8E5E0' }}>
                <Image src={url} alt={`이미지 ${i + 1}`} fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: 'rgba(28,28,28,0.7)' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className="flex items-center justify-center w-full py-4 border-2 border-dashed rounded-xl cursor-pointer text-sm transition-colors hover:border-gray-400"
          style={{
            borderColor: '#E8E5E0',
            color: '#1C1C1C',
            opacity: uploading || images.length >= 10 ? 0.5 : 1,
            pointerEvents: uploading || images.length >= 10 ? 'none' : 'auto',
          }}
        >
          {uploading ? '업로드 중...' : images.length >= 10 ? '최대 10장' : '+ 이미지 추가'}
        </label>
      </div>

      <div>
        <label className={lbl} style={{ color: '#1C1C1C' }}>노출 시작 시간 (비워두면 즉시 노출)</label>
        <input
          type="datetime-local"
          value={form.published_at}
          onChange={(e) => set('published_at', e.target.value)}
          className={field}
          style={{ color: '#1C1C1C' }}
        />
      </div>

      <div>
        <label className={lbl} style={{ color: '#1C1C1C' }}>상태</label>
        <select
          value={form.status}
          onChange={(e) => set('status', e.target.value as any)}
          className={field}
          style={{ color: '#1C1C1C' }}
        >
          <option value="draft">임시저장</option>
          <option value="active">판매중</option>
          <option value="sold_out">품절</option>
        </select>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/admin/goods')}
          className="flex-1 py-3 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
          style={{ color: '#1C1C1C' }}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading || uploading}
          className="flex-1 py-3 rounded-xl text-sm text-white disabled:opacity-50"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          {loading ? '저장 중...' : isEdit ? '수정 완료' : '등록하기'}
        </button>
      </div>
    </form>
  )
}
