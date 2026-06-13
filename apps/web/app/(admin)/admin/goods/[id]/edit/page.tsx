import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GoodsForm from '../../_components/GoodsForm'

export const metadata: Metadata = { title: '상품 수정 — Cosmos Admin' }

interface Props { params: Promise<{ id: string }> }

export default async function AdminGoodsEditPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: item }, { data: categories }] = await Promise.all([
    supabase
      .from('goods')
      .select('id, title, description, price, original_price, images, status, category_id')
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
          original_price: item.original_price,
          images: (item.images as string[]) ?? [],
          status: item.status as 'active' | 'sold_out' | 'draft',
          category_id: item.category_id,
        }}
      />
    </div>
  )
}
