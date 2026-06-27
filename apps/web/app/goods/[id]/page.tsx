import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import LandingClient from '@/app/landing/LandingClient'
import { createClient } from '@/lib/supabase/server'
import AddToCartButton from '../_components/AddToCartButton'
import WishlistButton from '../_components/WishlistButton'
import GoodsCard from '../_components/GoodsCard'
import GoodsImageSlider from '../_components/GoodsImageSlider'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('goods').select('title').eq('id', id).single()
  return { title: data ? `${data.title} — Cosmos` : 'Goods — Cosmos' }
}

export default async function GoodsDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: item } = await supabase
    .from('goods')
    .select('*, categories(id, name, slug)')
    .eq('id', id)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .neq('status', 'draft')
    .single()

  if (!item) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  let isWished = false
  if (user) {
    const { data: wl } = await supabase
      .from('goods_wishlist')
      .select('id')
      .eq('goods_id', id)
      .eq('user_id', user.id)
      .single()
    isWished = !!wl
  }

  const { data: relatedData } = await supabase
    .from('goods')
    .select('id, title, description, price, discount_rate, images, status, categories(name, slug)')
    .eq('category_id', item.category_id)
    .neq('id', id)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .neq('status', 'draft')
    .limit(4)
  const related = relatedData ?? []

  const finalPrice = Math.round(item.price * (1 - (item.discount_rate ?? 0) / 100))
  const images: string[] = item.images ?? []

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />

      <main className="pt-14">
        <div className="px-6 md:px-12 py-4">
          <Link
            href="/goods"
            className="text-xs tracking-widest uppercase hover:underline underline-offset-4"
            style={{ color: '#1C1C1C' }}
          >
            ← Goods & Tickets
          </Link>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* 좌: 이미지 슬라이더 */}
          <div className="w-full md:w-3/5 relative" style={{ minHeight: '60vh' }}>
            <GoodsImageSlider images={images} title={item.title} />
          </div>

          {/* 우: 상품 정보 */}
          <div className="w-full md:w-2/5 px-6 md:px-12 py-10 flex flex-col gap-6">
            {item.categories && (
              <p className="text-xs tracking-widest uppercase" style={{ color: '#1C1C1C' }}>
                {item.categories.name}
              </p>
            )}

            <h1 className="text-2xl font-light leading-snug" style={{ color: '#1C1C1C' }}>
              {item.title}
            </h1>

            <div className="h-px" style={{ backgroundColor: '#E8E5E0' }} />

            <div className="flex items-baseline gap-3">
              <span className="text-xl font-medium" style={{ color: '#1C1C1C' }}>
                ₩{finalPrice.toLocaleString()}
              </span>
              {(item.discount_rate ?? 0) > 0 && (
                <>
                  <span className="text-sm line-through" style={{ color: '#1C1C1C', opacity: 0.4 }}>
                    ₩{item.price.toLocaleString()}
                  </span>
                  <span className="text-sm" style={{ color: '#1C1C1C' }}>
                    {item.discount_rate}% OFF
                  </span>
                </>
              )}
            </div>

            <div className="h-px" style={{ backgroundColor: '#E8E5E0' }} />

            {item.detail_content && (
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#1C1C1C' }}>
                {item.detail_content}
              </p>
            )}

            {item.status === 'active' ? (
              <div className="flex flex-col gap-3">
                <AddToCartButton
                  goodsId={item.id}
                  title={item.title}
                  price={finalPrice}
                  imageUrl={images[0] ?? null}
                />
                <WishlistButton goodsId={item.id} initialWished={isWished} />
              </div>
            ) : (
              <span className="text-sm tracking-widest uppercase" style={{ color: '#1C1C1C' }}>
                Sold Out
              </span>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="px-6 md:px-12 py-16 border-t" style={{ borderColor: '#E8E5E0' }}>
            <h2 className="text-xs tracking-widest uppercase mb-8" style={{ color: '#1C1C1C' }}>
              Related Items
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
              {related.map((rel) => (
                <GoodsCard key={rel.id} item={rel as any} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
