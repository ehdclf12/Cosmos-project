import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: '대시보드 — Cosmos Admin' }

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: goodsCount },
    { count: paidCount },
    { count: cancelledCount },
    { count: customerCount },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('goods').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('orders')
      .select('id, status, total_amount, created_at, profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { label: '전체 상품', value: goodsCount ?? 0 },
    { label: '완료 주문', value: paidCount ?? 0, sub: `취소: ${cancelledCount ?? 0}건` },
    { label: '전체 회원', value: customerCount ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl font-light mb-8" style={{ color: '#1C1C1C' }}>대시보드</h1>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {stats.map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
            <p className="text-xs mb-1" style={{ color: '#A8A49C' }}>{label}</p>
            <p className="text-3xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
            {sub && <p className="text-xs mt-1" style={{ color: '#A8A49C' }}>{sub}</p>}
          </div>
        ))}
      </div>

      <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>최근 주문</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#A8A49C' }}>
            <th className="pb-2 font-normal">주문번호</th>
            <th className="pb-2 font-normal">회원</th>
            <th className="pb-2 font-normal">금액</th>
            <th className="pb-2 font-normal">상태</th>
            <th className="pb-2 font-normal">일시</th>
          </tr>
        </thead>
        <tbody>
          {(recentOrders ?? []).map((order) => (
            <tr key={order.id} style={{ borderTop: '1px solid #E8E5E0' }}>
              <td className="py-2" style={{ color: '#6B6862' }}>{order.id.slice(0, 8).toUpperCase()}</td>
              <td className="py-2" style={{ color: '#1C1C1C' }}>
                {(order.profiles as any)?.display_name ?? '-'}
              </td>
              <td className="py-2" style={{ color: '#1C1C1C' }}>{(order.total_amount ?? 0).toLocaleString()}원</td>
              <td className="py-2" style={{ color: order.status === 'paid' ? '#1C1C1C' : '#A8A49C' }}>
                {{ paid: '결제 완료', cancelled: '취소됨' }[order.status as string] ?? order.status}
              </td>
              <td className="py-2" style={{ color: '#6B6862' }}>
                {new Date(order.created_at).toLocaleDateString('ko-KR')}
              </td>
            </tr>
          ))}
          {(recentOrders ?? []).length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm" style={{ color: '#A8A49C' }}>주문이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
