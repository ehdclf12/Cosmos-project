import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import LandingClient from '@/app/landing/LandingClient'
import { createClient } from '@/lib/supabase/server'
import WishlistButton from '../_components/WishlistButton'
import GoodsCard from '../_components/GoodsCard'

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

  const { data: item } = await supabase
    .from('goods')
    .select('*, categories(id, name, slug)')
    .eq('id', id)
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

  const { data: related = [] } = await supabase
    .from('goods')
    .select('id, title, description, price, original_price, images, status, categories(name, slug)')
    .eq('category_id', item.category_id)
    .neq('id', id)
    .limit(4)

  const discount = item.original_price
    ? Math.round((1 - item.price / item.original_price) * 100)
    : null

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />

      <main className="pt-14">
        {/* 뒤로가기 */}
        <div className="px-6 md:px-12 py-4">
          <Link
            href="/goods"
            className="text-xs tracking-widest uppercase hover:underline underline-offset-4"
            style={{ color: '#6B6862' }}
          >
            ← Goods & Tickets
          </Link>
        </div>

        {/* 메인 섹션: 이미지 + 정보 */}
        <div className="flex flex-col md:flex-row">
          {/* 좌: 이미지 */}
          <div className="w-full md:w-3/5 relative" style={{ minHeight: '60vh' }}>
            {item.images[0] ? (
              <Image
                src={item.images[0]}
                alt={item.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#E8E5E0' }}>
                <span className="text-xs" style={{ color: '#A8A49C' }}>No Image</span>
              </div>
            )}
          </div>

          {/* 우: 상품 정보 */}
          <div className="w-full md:w-2/5 px-6 md:px-12 py-10 flex flex-col gap-6">
            {item.categories && (
              <p className="text-xs tracking-widest uppercase" style={{ color: '#A8A49C' }}>
                {item.categories.name}
              </p>
            )}

            <h1 className="text-2xl font-light leading-snug" style={{ color: '#1C1C1C' }}>
              {item.title}
            </h1>

            <div className="h-px" style={{ backgroundColor: '#E8E5E0' }} />

            <div className="flex items-baseline gap-3">
              <span className="text-xl font-medium" style={{ color: '#1C1C1C' }}>
                ₩{item.price.toLocaleString()}
              </span>
              {item.original_price && (
                <>
                  <span className="text-sm line-through" style={{ color: '#A8A49C' }}>
                    ₩{item.original_price.toLocaleString()}
                  </span>
                  <span className="text-sm" style={{ color: '#6B6862' }}>
                    {discount}% OFF
                  </span>
                </>
              )}
            </div>

            <div className="h-px" style={{ backgroundColor: '#E8E5E0' }} />

            {item.detail_content && (
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#6B6862' }}>
                {item.detail_content}
              </p>
            )}

            {item.status === 'available' ? (
              <WishlistButton goodsId={item.id} initialWished={isWished} />
            ) : (
              <span className="text-sm tracking-widest uppercase" style={{ color: '#A8A49C' }}>
                Sold Out
              </span>
            )}
          </div>
        </div>

        {/* 관련 상품 */}
        {related.length > 0 && (
          <section className="px-6 md:px-12 py-16 border-t" style={{ borderColor: '#E8E5E0' }}>
            <h2 className="text-xs tracking-widest uppercase mb-8" style={{ color: '#A8A49C' }}>
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
