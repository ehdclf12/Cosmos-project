import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import OrderStatusSelect from './_components/OrderStatusSelect'

export const metadata: Metadata = { title: '주문 관리 — Cosmos Admin' }

export default async function AdminOrdersPage() {
  const supabase = await createClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total_amount, created_at, profiles(display_name), order_items(title, quantity)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>주문 관리</h1>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#1C1C1C' }}>
            <th className="pb-2 font-normal">주문번호</th>
            <th className="pb-2 font-normal">회원</th>
            <th className="pb-2 font-normal">상품</th>
            <th className="pb-2 font-normal">금액</th>
            <th className="pb-2 font-normal">상태</th>
            <th className="pb-2 font-normal">일시</th>
          </tr>
        </thead>
        <tbody>
          {(orders ?? []).map((order) => {
            const items = (order.order_items as { title: string; quantity: number }[]) ?? []
            const itemLabel = items.map((i) => `${i.title} x${i.quantity}`).join(', ')
            return (
              <tr key={order.id} style={{ borderTop: '1px solid #E8E5E0' }}>
                <td className="py-3" style={{ color: '#1C1C1C' }}>{order.id.slice(0, 8).toUpperCase()}</td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {(order.profiles as any)?.display_name ?? '-'}
                </td>
                <td className="py-3 max-w-xs truncate" style={{ color: '#1C1C1C' }}>{itemLabel || '-'}</td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>{(order.total_amount ?? 0).toLocaleString()}원</td>
                <td className="py-3">
                  <OrderStatusSelect id={order.id} status={order.status} />
                </td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {new Date(order.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            )
          })}
          {(orders ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-sm" style={{ color: '#1C1C1C' }}>주문이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
