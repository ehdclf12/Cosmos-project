import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import OrderStatusSelect from '../_components/OrderStatusSelect'

export const metadata: Metadata = { title: '주문 상세 — Cosmos Admin' }

interface Props { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, status, total_amount, created_at, user_id,
      order_items(id, title, quantity, price)
    `)
    .eq('id', id)
    .single()

  if (!order) notFound()

  const [{ data: authData }, { data: profileData }] = await Promise.all([
    adminClient.auth.admin.getUserById(order.user_id),
    supabase.from('profiles').select('id, display_name').eq('id', order.user_id).single(),
  ])
  const authUser = authData?.user ?? null
  const profile = profileData

  const items = (order.order_items as { id: string; title: string; quantity: number; price: number }[]) ?? []

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
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid rgba(28,28,28,0.1)' }}>
                  <td className="px-4 py-3" style={{ color: '#1C1C1C' }}>{item.title}</td>
                  <td className="px-4 py-3 text-right" style={{ color: '#1C1C1C' }}>{item.quantity}</td>
                  <td className="px-4 py-3 text-right" style={{ color: '#1C1C1C' }}>
                    {(item.price ?? 0).toLocaleString()}원
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: '#1C1C1C' }}>
                    {((item.quantity ?? 0) * (item.price ?? 0)).toLocaleString()}원
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid rgba(28,28,28,0.15)' }}>
                <td colSpan={3} className="px-4 py-3 text-right font-medium" style={{ color: '#1C1C1C' }}>합계</td>
                <td className="px-4 py-3 text-right font-medium" style={{ color: '#1C1C1C' }}>
                  {(order.total_amount ?? 0).toLocaleString()}원
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 주문자 정보 */}
      <section>
        <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>주문자 정보</h2>
        <div className="rounded-2xl p-5 space-y-2" style={{ backgroundColor: '#E8E5E0' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#1C1C1C', opacity: 0.6 }}>이름</span>
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
        </div>
      </section>
    </div>
  )
}
