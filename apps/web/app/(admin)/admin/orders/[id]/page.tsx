import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import OrderStatusSelect from '../_components/OrderStatusSelect'
import AdminCancelItemButton from './_components/AdminCancelItemButton'
import { classifyRecipient, courierLabel, trackingUrl } from '@cosmos/shared'
import ShipmentForm from './_components/ShipmentForm'
import WaybillInfo from './_components/WaybillInfo'

export const metadata: Metadata = { title: '주문 상세 — Cosmos Admin' }

type OrderDetail = {
  id: string
  status: string
  total_amount: number | null
  created_at: string
  user_id: string
  recipient_name: string | null
  recipient_phone: string | null
  shipping_address: string | null
  memo: string | null
  courier: string | null
  tracking_number: string | null
  order_items: { id: string; title: string; quantity: number; price: number; status: string }[]
}

interface Props { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data } = await supabase
    .from('orders')
    .select(`
      id, status, total_amount, created_at, user_id,
      recipient_name, recipient_phone, shipping_address, memo,
      courier, tracking_number,
      order_items(id, title, quantity, price, status)
    `)
    .eq('id', id)
    .single()

  if (!data) notFound()
  const order = data as unknown as OrderDetail

  const [{ data: authData }, { data: profileData }] = await Promise.all([
    adminClient.auth.admin.getUserById(order.user_id),
    supabase.from('profiles').select('id, display_name, phone').eq('id', order.user_id).single(),
  ])
  const authUser = authData?.user ?? null
  const profile = profileData

  // 등록 휴대폰: profiles.phone 우선, 없으면 auth metadata fallback
  const registeredPhone: string | null =
    profile?.phone ?? (authUser?.user_metadata?.phone as string | undefined) ?? null

  const relation = classifyRecipient({
    ordererName: profile?.display_name ?? null,
    ordererPhone: registeredPhone,
    recipientName: order.recipient_name,
    recipientPhone: order.recipient_phone,
  })
  const relationBadge =
    relation === 'other'
      ? { label: '타인 수령 (선물·대리)', bg: '#dbeafe', color: '#2563eb' }
      : relation === 'unknown'
      ? { label: '수령인 확인 필요', bg: '#FEF9C3', color: '#854D0E' }
      : { label: '본인 수령', bg: '#E8E5E0', color: '#6B6862' }

  const items = order.order_items ?? []
  const activeItems = items.filter((i) => i.status !== 'cancelled')
  const activeTotal = activeItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const hasPartialCancel = items.some((i) => i.status === 'cancelled') && order.status !== 'cancelled'

  return (
    <div>
      <Link href="/admin/orders" className="text-xs mb-6 inline-block hover:opacity-70" style={{ color: '#1C1C1C' }}>
        ← 주문 목록
      </Link>

      {/* 헤더 */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light font-mono" style={{ color: '#1C1C1C' }}>
            {order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#1C1C1C', opacity: 0.6 }}>
            {new Date(order.created_at).toLocaleString('ko-KR')}
          </p>
        </div>
        <OrderStatusSelect id={order.id} status={order.status} />
      </div>

      {/* 주문 상품 */}
      <section className="mb-8">
        <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>주문 상품</h2>
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#E8E5E0' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: '#1C1C1C' }}>
                <th className="px-4 py-3 font-normal">상품명</th>
                <th className="px-4 py-3 font-normal text-right">수량</th>
                <th className="px-4 py-3 font-normal text-right">단가</th>
                <th className="px-4 py-3 font-normal text-right">소계</th>
                <th className="px-4 py-3 font-normal text-center">상태</th>
                <th className="px-4 py-3 font-normal text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isCancelled = item.status === 'cancelled'
                const canCancel = !isCancelled && order.status !== 'cancelled' && order.status !== 'delivered'
                return (
                  <tr key={item.id} style={{ borderTop: '1px solid rgba(28,28,28,0.1)', opacity: isCancelled ? 0.5 : 1 }}>
                    <td className="px-4 py-3" style={{ color: '#1C1C1C', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                      {item.title}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: '#1C1C1C' }}>{item.quantity}</td>
                    <td className="px-4 py-3 text-right" style={{ color: '#1C1C1C' }}>
                      {(item.price ?? 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: '#1C1C1C' }}>
                      {((item.quantity ?? 0) * (item.price ?? 0)).toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isCancelled ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                          취소됨
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                          정상
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {canCancel && (
                        <AdminCancelItemButton
                          orderId={order.id}
                          itemId={item.id}
                          itemTitle={item.title}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
              <tr style={{ borderTop: '1px solid rgba(28,28,28,0.15)' }}>
                <td colSpan={3} className="px-4 py-3 text-right font-medium" style={{ color: '#1C1C1C' }}>
                  {hasPartialCancel ? '실 결제금액' : '합계'}
                </td>
                <td className="px-4 py-3 text-right font-medium" style={{ color: '#1C1C1C' }}>
                  {(hasPartialCancel ? activeTotal : (order.total_amount ?? 0)).toLocaleString()}원
                </td>
                <td /><td />
              </tr>
              {hasPartialCancel && (
                <tr>
                  <td colSpan={3} className="px-4 py-1 text-right text-xs line-through" style={{ color: '#A8A49C' }}>
                    원 결제금액
                  </td>
                  <td className="px-4 py-1 text-right text-xs line-through" style={{ color: '#A8A49C' }}>
                    {(order.total_amount ?? 0).toLocaleString()}원
                  </td>
                  <td /><td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 주문자 정보 */}
      <section className="mb-8">
        <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>주문자 정보</h2>
        <div className="rounded-2xl p-5 space-y-2" style={{ backgroundColor: '#E8E5E0' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#1C1C1C', opacity: 0.6 }}>주문자명</span>
            <Link
              href={`/admin/customers/${profile?.id}`}
              className="text-sm hover:underline"
              style={{ color: '#1C1C1C' }}
            >
              {profile?.display_name ?? '-'}
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#1C1C1C', opacity: 0.6 }}>이메일</span>
            <span className="text-sm" style={{ color: '#1C1C1C' }}>{authUser?.email ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#1C1C1C', opacity: 0.6 }}>등록 휴대폰</span>
            <span className="text-sm" style={{ color: '#1C1C1C' }}>{registeredPhone ?? '-'}</span>
          </div>
        </div>
      </section>

      {/* 배송 정보 */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>배송 정보</h2>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: relationBadge.bg, color: relationBadge.color }}
          >
            {relationBadge.label}
          </span>
        </div>
        <div className="rounded-2xl p-5 space-y-2" style={{ backgroundColor: '#E8E5E0' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#1C1C1C', opacity: 0.6 }}>수령인명</span>
            <span className="text-sm" style={{ color: '#1C1C1C' }}>{order.recipient_name ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#1C1C1C', opacity: 0.6 }}>연락처</span>
            <span className="text-sm" style={{ color: '#1C1C1C' }}>{order.recipient_phone ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#1C1C1C', opacity: 0.6 }}>배송지</span>
            <span className="text-sm text-right max-w-xs" style={{ color: '#1C1C1C' }}>{order.shipping_address ?? '-'}</span>
          </div>
          {order.memo && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#1C1C1C', opacity: 0.6 }}>메모</span>
              <span className="text-sm" style={{ color: '#1C1C1C' }}>{order.memo}</span>
            </div>
          )}
        </div>
      </section>

      {/* 배송 처리 */}
      {order.status !== 'cancelled' && (
        <section className="mt-8">
          <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>배송 처리</h2>
          <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
            {(order.status === 'paid' || order.status === 'preparing') ? (
              <ShipmentForm orderId={order.id} mode="ship" />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: '#1C1C1C' }}>
                  <span>택배사: <strong>{courierLabel(order.courier)}</strong></span>
                  <span>송장번호: <strong>{order.tracking_number ?? '-'}</strong></span>
                  {trackingUrl(order.courier, order.tracking_number) && (
                    <a
                      href={trackingUrl(order.courier, order.tracking_number)!}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-3 py-1 rounded-lg text-white"
                      style={{ backgroundColor: '#1C1C1C' }}
                    >
                      배송조회
                    </a>
                  )}
                </div>
                <details>
                  <summary className="text-xs cursor-pointer" style={{ color: '#6B6862' }}>송장 수정</summary>
                  <div className="mt-2">
                    <ShipmentForm orderId={order.id} mode="edit" initialCourier={order.courier} initialTracking={order.tracking_number} />
                  </div>
                </details>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 송장용 정보 */}
      {order.status !== 'cancelled' && (
        <section className="mt-8">
          <WaybillInfo
            recipientName={order.recipient_name}
            recipientPhone={order.recipient_phone}
            shippingAddress={order.shipping_address}
            items={activeItems.map((i) => ({ title: i.title, quantity: i.quantity }))}
            orderNo={order.id.slice(0, 8).toUpperCase()}
            isOther={relation === 'other'}
          />
        </section>
      )}
    </div>
  )
}
