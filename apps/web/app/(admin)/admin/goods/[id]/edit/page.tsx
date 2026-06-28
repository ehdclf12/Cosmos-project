import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GoodsForm from '../../_components/GoodsForm'

export const metadata: Metadata = { title: '상품 수정 — Cosmos Admin' }

interface Props { params: Promise<{ id: string }> }

export default async function EditGoodsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: item }, { data: categories }] = await Promise.all([
    supabase
      .from('goods')
      .select('id, title, description, price, discount_rate, stock_quantity, images, status, category_id, published_at')
      .eq('id', id)
      .single(),
    supabase.from('categories').select('id, name').order('name'),
  ])

  if (!item) notFound()

  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>상품 수정</h1>
      <GoodsForm
        categories={categories ?? []}
        initial={{
          id: item.id,
          title: item.title,
          description: item.description,
          price: item.price,
          discount_rate: item.discount_rate ?? 0,
          stock_quantity: item.stock_quantity ?? 0,
          images: item.images ?? [],
          status: item.status,
          category_id: item.category_id,
          published_at: item.published_at ?? null,
        }}
      />
    </div>
  )
}
