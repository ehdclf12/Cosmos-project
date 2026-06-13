import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import GoodsForm from '../_components/GoodsForm'

export const metadata: Metadata = { title: '상품 등록 — Cosmos Admin' }

export default async function AdminGoodsNewPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>상품 등록</h1>
      <GoodsForm categories={categories ?? []} />
    </div>
  )
}
