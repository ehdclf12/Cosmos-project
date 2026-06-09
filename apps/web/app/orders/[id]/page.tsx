import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import LandingClient from '@/app/landing/LandingClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const shortId = order.id.slice(0, 8).toUpperCase()
  const orderDate = new Date(order.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />

      <main className="pt-20 px-6 md:px-12 pb-20 max-w-2xl mx-auto">
        {/* 완료 헤더 */}
        <div className="py-10 text-center border-b mb-10" style={{ borderColor: '#E8E5E0' }}>
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#A8A49C' }}>
            Order Confirmed
          </p>
          <h1 className="text-2xl font-light tracking-widest mb-2" style={{ color: '#1C1C1C' }}>
            주문이 완료되었습니다
          </h1>
          <p className="text-sm" style={{ color: '#6B6862' }}>
            주문번호: {shortId} · {orderDate}
          </p>
        </div>

        {/* 주문 상품 */}
        <section className="mb-10">
          <h2 className="text-xs tracking-widest uppercase mb-6" style={{ color: '#A8A49C' }}>
            주문 상품
          </h2>
          <div className="space-y-4">
            {order.order_items.map((item: { id: string; title: string; price: number; quantity: number; image_url: string | null }) => (
              <div key={item.id} className="flex gap-4 items-center">
                <div
                  className="relative w-14 shrink-0 overflow-hidden"
                  style={{ backgroundColor: '#E8E5E0', height: '72px' }}
                >
                  {item.image_url && (
                    <Image src={item.image_url} alt={item.title} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm mb-1" style={{ color: '#1C1C1C' }}>{item.title}</p>
                  <p className="text-xs" style={{ color: '#6B6862' }}>
                    ₩{item.price.toLocaleString()} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-medium" style={{ color: '#1C1C1C' }}>
                  ₩{(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 합계 */}
        <div className="border-t pt-4 mb-10" style={{ borderColor: '#E8E5E0' }}>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: '#6B6862' }}>총 결제금액</span>
            <span className="text-base font-medium" style={{ color: '#1C1C1C' }}>
              ₩{order.total_amount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 배송지 */}
        <section className="mb-10 p-5 rounded-xl" style={{ backgroundColor: '#E8E5E0' }}>
          <h2 className="text-xs tracking-widest uppercase mb-3" style={{ color: '#A8A49C' }}>
            배송 정보
          </h2>
          <p className="text-sm mb-1" style={{ color: '#1C1C1C' }}>{order.recipient_name}</p>
          <p className="text-sm mb-1" style={{ color: '#6B6862' }}>{order.recipient_phone}</p>
          <p className="text-sm" style={{ color: '#6B6862' }}>{order.shipping_address}</p>
          {order.memo && (
            <p className="text-xs mt-2" style={{ color: '#A8A49C' }}>{order.memo}</p>
          )}
        </section>

        {/* 액션 버튼 */}
        <div className="flex gap-4">
          <Link
            href="/goods"
            className="flex-1 py-3 text-center text-sm border transition-colors hover:bg-black hover:text-white"
            style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
          >
            계속 쇼핑하기
          </Link>
          <Link
            href="/mypage/orders"
            className="flex-1 py-3 text-center text-sm text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1C1C1C' }}
          >
            주문 내역 보기
          </Link>
        </div>
      </main>
    </div>
  )
}
