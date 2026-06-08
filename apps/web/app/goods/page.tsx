import type { Metadata } from 'next'
import LandingClient from '@/app/landing/LandingClient'
import { createClient } from '@/lib/supabase/server'
import GoodsCard from './_components/GoodsCard'
import CategoryFilter from './_components/CategoryFilter'

export const metadata: Metadata = { title: 'Goods & Tickets — Cosmos' }

interface Props {
  searchParams: Promise<{ category?: string }>
}

export default async function GoodsPage({ searchParams }: Props) {
  const { category } = await searchParams
  const supabase = await createClient()

  const { data: categories = [] } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  let query = supabase
    .from('goods')
    .select('id, title, description, price, original_price, images, status, categories(name, slug)')
    .order('created_at', { ascending: false })

  if (category) {
    const cat = categories.find((c) => c.slug === category)
    if (cat) query = query.eq('category_id', cat.id)
  }

  const { data: goods = [] } = await query

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />

      <main className="pt-20 px-6 md:px-12 pb-20">
        {/* 타이틀 */}
        <div className="py-12 border-b mb-10" style={{ borderColor: '#E8E5E0' }}>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#A8A49C' }}>Cosmos</p>
          <h1 className="text-3xl font-light tracking-widest" style={{ color: '#1C1C1C' }}>
            GOODS & TICKETS
          </h1>
        </div>

        {/* 카테고리 필터 */}
        <CategoryFilter categories={categories} activeSlug={category ?? null} />

        {/* 상품 그리드 */}
        {goods.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: '#A8A49C' }}>상품이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
            {goods.map((item) => (
              <GoodsCard key={item.id} item={item as any} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
