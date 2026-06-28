import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function MyOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total_amount, created_at, order_items(id, title, quantity)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const rows = orders ?? []

  const STATUS_LABEL: Record<string, string> = {
    paid: '결제완료',
    preparing: '상품준비중',
    shipping: '배송중',
    delivered: '배송완료',
    cancelled: '취소됨',
  }

  return (
    <div>
      <h2 className="text-xl font-light mb-8" style={{ color: '#1C1C1C' }}>주문 내역</h2>

      {rows.length === 0 ? (
        <div>
          <p className="text-sm mb-4" style={{ color: '#A8A49C' }}>주문 내역이 없습니다.</p>
          <Link
            href="/goods"
            className="text-xs tracking-widest uppercase underline underline-offset-4"
            style={{ color: '#1C1C1C' }}
          >
            쇼핑하러 가기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((order) => {
            const items = order.order_items ?? []
            const firstTitle = items[0]?.title ?? '상품'
            const extraCount = items.length - 1
            const label = extraCount > 0 ? `${firstTitle} 외 ${extraCount}건` : firstTitle
            const orderDate = new Date(order.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block p-5 rounded-xl transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#E8E5E0' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#A8A49C' }}>
                      {orderDate} · {order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-sm font-light" style={{ color: '#1C1C1C' }}>{label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium mb-1" style={{ color: '#1C1C1C' }}>
                      ₩{order.total_amount.toLocaleString()}
                    </p>
                    <p className="text-xs" style={{ color: '#6B6862' }}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
