import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import LandingClient from '@/app/landing/LandingClient'
import CancelOrderButton from './_components/CancelOrderButton'
import CancelItemButton from './_components/CancelItemButton'
import { courierLabel, trackingUrl } from '@cosmos/shared'

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
        {/* 상태 헤더 */}
        <div className="py-10 text-center border-b mb-10" style={{ borderColor: '#E8E5E0' }}>
          {order.status === 'cancelled' ? (
            <>
              <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#A8A49C' }}>
                Order Cancelled
              </p>
              <h1 className="text-2xl font-light tracking-widest mb-2" style={{ color: '#1C1C1C' }}>
                주문이 취소되었습니다
              </h1>
            </>
          ) : (
            <>
              <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#A8A49C' }}>
                Order Confirmed
              </p>
              <h1 className="text-2xl font-light tracking-widest mb-2" style={{ color: '#1C1C1C' }}>
                주문이 완료되었습니다
              </h1>
            </>
          )}
          <p className="text-sm" style={{ color: '#6B6862' }}>
            주문번호: {shortId} · {orderDate}
          </p>
        </div>

        {/* 주문 상품 */}
        <section className="mb-10">
          <h2 className="text-xs tracking-widest uppercase mb-6" style={{ color: '#A8A49C' }}>
            주문 상품
          </h2>
          {(() => {
            type OrderItem = { id: string; title: string; price: number; quantity: number; image_url: string | null; status: string }
            const allItems: OrderItem[] = order.order_items
            const activeItems = allItems.filter((i) => i.status !== 'cancelled')
            const canCancelItem = ['paid', 'preparing'].includes(order.status) && activeItems.length > 0
            return (
              <div className="space-y-4">
                {allItems.map((item) => {
                  const isCancelled = item.status === 'cancelled'
                  return (
                    <div key={item.id} className="flex gap-4 items-center" style={{ opacity: isCancelled ? 0.45 : 1 }}>
                      <div
                        className="relative w-14 shrink-0 overflow-hidden"
                        style={{ backgroundColor: '#E8E5E0', height: '72px' }}
                      >
                        {item.image_url && (
                          <Image src={item.image_url} alt={item.title} fill className="object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm" style={{ color: '#1C1C1C', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                            {item.title}
                          </p>
                          {isCancelled && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F2F1EE', color: '#A8A49C' }}>
                              취소됨
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: '#6B6862' }}>
                          ₩{item.price.toLocaleString()} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-sm font-medium" style={{ color: '#1C1C1C' }}>
                          ₩{(item.price * item.quantity).toLocaleString()}
                        </p>
                        {canCancelItem && !isCancelled && (
                          <CancelItemButton orderId={order.id} itemId={item.id} itemTitle={item.title} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </section>

        {/* 합계 */}
        {(() => {
          type OrderItem = { price: number; quantity: number; status: string }
          const allItems: OrderItem[] = order.order_items
          const activeTotal = allItems
            .filter((i) => i.status !== 'cancelled')
            .reduce((sum, i) => sum + i.price * i.quantity, 0)
          const isFullyCancelled = order.status === 'cancelled'
          const hasPartialCancel = !isFullyCancelled && activeTotal !== order.total_amount
          const showStrikethrough = isFullyCancelled || hasPartialCancel
          return (
            <div className="border-t pt-4 mb-10" style={{ borderColor: '#E8E5E0' }}>
              {showStrikethrough && (
                <div className="flex justify-between mb-1">
                  <span className="text-xs line-through" style={{ color: '#A8A49C' }}>기존 결제금액</span>
                  <span className="text-xs line-through" style={{ color: '#A8A49C' }}>
                    ₩{order.total_amount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: '#6B6862' }}>총 결제금액</span>
                <span className="text-base font-medium" style={{ color: '#1C1C1C' }}>
                  {isFullyCancelled ? '₩0' : `₩${(hasPartialCancel ? activeTotal : order.total_amount).toLocaleString()}`}
                </span>
              </div>
            </div>
          )
        })()}

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
          {(order.status === 'shipping' || order.status === 'delivered') && order.tracking_number && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#D8D5CF' }}>
              <p className="text-sm mb-1" style={{ color: '#1C1C1C' }}>
                {courierLabel(order.courier)} · {order.tracking_number}
              </p>
              {trackingUrl(order.courier, order.tracking_number) && (
                <a
                  href={trackingUrl(order.courier, order.tracking_number)!}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-1 text-xs px-3 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: '#1C1C1C' }}
                >
                  배송조회
                </a>
              )}
            </div>
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

        {/* 전체 주문 취소 버튼 — paid/preparing이고 active 아이템이 있을 때만 */}
        {['paid', 'preparing'].includes(order.status) &&
          order.order_items.some((i: { status: string }) => i.status !== 'cancelled') && (
          <div className="mt-4">
            <CancelOrderButton orderId={order.id} />
          </div>
        )}
      </main>
    </div>
  )
}
