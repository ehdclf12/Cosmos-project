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

  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')
  const categories = categoriesData ?? []

  const now = new Date().toISOString()

  let query = supabase
    .from('goods')
    .select('id, title, description, price, discount_rate, images, status, categories(name, slug)')
    .or(`published_at.is.null,published_at.lte.${now}`)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })

  if (category) {
    const cat = categories.find((c) => c.slug === category)
    if (cat) query = query.eq('category_id', cat.id)
  }

  const { data: goodsData } = await query
  const goods = goodsData ?? []

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />

      <main className="pt-20 px-6 md:px-12 pb-20">
        <div className="py-12 border-b mb-10" style={{ borderColor: '#E8E5E0' }}>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#1C1C1C' }}>Cosmos</p>
          <h1 className="text-3xl font-light tracking-widest" style={{ color: '#1C1C1C' }}>
            GOODS & TICKETS
          </h1>
        </div>

        <CategoryFilter categories={categories} activeSlug={category ?? null} />

        {goods.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: '#1C1C1C' }}>상품이 없습니다.</p>
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
