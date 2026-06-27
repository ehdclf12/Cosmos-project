import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: '상품 상세 — Cosmos Admin' }

interface Props { params: Promise<{ id: string }> }

export default async function AdminGoodsDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: item },
    { count: wishlistCount },
    { data: orderItems },
  ] = await Promise.all([
    supabase
      .from('goods')
      .select('id, title, price, discount_rate, status, images, published_at, categories(name)')
      .eq('id', id)
      .single(),
    supabase
      .from('goods_wishlist')
      .select('*', { count: 'exact', head: true })
      .eq('goods_id', id),
    supabase
      .from('order_items')
      .select('id, quantity, unit_price, orders(id, status, created_at, profiles(display_name))')
      .eq('goods_id', id),
  ])

  if (!item) notFound()

  const paidItems = (orderItems ?? []).filter((oi) => (oi.orders as any)?.status === 'paid')
  const totalQty = paidItems.reduce((s, i) => s + (i.quantity ?? 0), 0)
  const totalRevenue = paidItems.reduce((s, i) => s + (i.quantity ?? 0) * (i.unit_price ?? 0), 0)
  const finalPrice = Math.round(item.price * (1 - (item.discount_rate ?? 0) / 100))

  const STATUS_LABEL: Record<string, string> = {
    active: '판매중', sold_out: '품절', draft: '임시저장',
  }
  const ORDER_STATUS: Record<string, string> = {
    paid: '결제 완료', cancelled: '취소됨',
  }

  return (
    <div>
      <Link href="/admin/goods" className="text-xs mb-6 inline-block hover:opacity-70" style={{ color: '#1C1C1C' }}>
        ← 상품 목록
      </Link>

      {/* 헤더 */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          {(item.images as string[])?.[0] && (
            <img
              src={(item.images as string[])[0]}
              alt=""
              className="w-16 h-16 rounded-xl object-cover"
            />
          )}
          <div>
            <h1 className="text-2xl font-light" style={{ color: '#1C1C1C' }}>{item.title}</h1>
            <p className="text-sm mt-1" style={{ color: '#1C1C1C' }}>
              ₩{finalPrice.toLocaleString()}
              {(item.discount_rate ?? 0) > 0 && (
                <span className="ml-1">({item.discount_rate}% 할인)</span>
              )}
              {' · '}
              <span>{STATUS_LABEL[item.status] ?? item.status}</span>
              {item.published_at && (
                <span className="ml-1">
                  · {new Date(item.published_at) > new Date() ? '예약 노출: ' : '노출 시작: '}
                  {new Date(item.published_at).toLocaleString('ko-KR')}
                </span>
              )}
            </p>
          </div>
        </div>
        <Link
          href={`/admin/goods/${id}/edit`}
          className="px-4 py-2 rounded-xl text-sm text-white"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          수정
        </Link>
      </div>

      {/* 지표 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: '총 판매 수량', value: `${totalQty}개` },
          { label: '총 판매 금액', value: `₩${totalRevenue.toLocaleString()}` },
          { label: '찜 수', value: `${wishlistCount ?? 0}명` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
            <p className="text-xs mb-1" style={{ color: '#1C1C1C' }}>{label}</p>
            <p className="text-2xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* 주문 목록 */}
      <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>
        주문 내역 ({orderItems?.length ?? 0}건)
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#1C1C1C' }}>
            <th className="pb-2 font-normal">주문번호</th>
            <th className="pb-2 font-normal">고객</th>
            <th className="pb-2 font-normal">수량</th>
            <th className="pb-2 font-normal">금액</th>
            <th className="pb-2 font-normal">상태</th>
            <th className="pb-2 font-normal">일시</th>
          </tr>
        </thead>
        <tbody>
          {(orderItems ?? []).map((oi) => {
            const order = oi.orders as any
            return (
              <tr key={oi.id ?? order?.id} style={{ borderTop: '1px solid #E8E5E0' }}>
                <td className="py-2" style={{ color: '#1C1C1C' }}>{order?.id?.slice(0, 8).toUpperCase() ?? '-'}</td>
                <td className="py-2" style={{ color: '#1C1C1C' }}>{order?.profiles?.display_name ?? '-'}</td>
                <td className="py-2" style={{ color: '#1C1C1C' }}>{oi.quantity}</td>
                <td className="py-2" style={{ color: '#1C1C1C' }}>{((oi.quantity ?? 0) * (oi.unit_price ?? 0)).toLocaleString()}원</td>
                <td className="py-2" style={{ color: '#1C1C1C' }}>
                  {ORDER_STATUS[order?.status as string] ?? order?.status ?? '-'}
                </td>
                <td className="py-2" style={{ color: '#1C1C1C' }}>
                  {order?.created_at ? new Date(order.created_at).toLocaleDateString('ko-KR') : '-'}
                </td>
              </tr>
            )
          })}
          {(orderItems ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-sm" style={{ color: '#1C1C1C' }}>주문이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
