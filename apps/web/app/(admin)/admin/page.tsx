import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: '대시보드 — Cosmos Admin' }

export default async function AdminDashboard() {
  const supabase = await createClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    { count: goodsCount },
    { count: paidCount },
    { count: cancelledCount },
    { count: customerCount },
    { count: todayVisitors },
    { count: newMembers7d },
    { data: recentOrders },
    { data: hourlyRaw },
  ] = await Promise.all([
    supabase.from('goods').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString()),
    supabase
      .from('orders')
      .select('id, status, total_amount, created_at, profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('page_views')
      .select('created_at')
      .gte('created_at', todayStart.toISOString()),
  ])

  // 시간대별 집계 (0~23시)
  const hourlyCounts = Array(24).fill(0)
  ;(hourlyRaw ?? []).forEach((row) => {
    const h = new Date(row.created_at).getHours()
    hourlyCounts[h]++
  })
  const maxCount = Math.max(...hourlyCounts, 1)

  const stats = [
    { label: '전체 상품', value: goodsCount ?? 0 },
    { label: '완료 주문', value: paidCount ?? 0, sub: `취소: ${cancelledCount ?? 0}건` },
    { label: '전체 회원', value: customerCount ?? 0 },
    { label: '오늘 방문자', value: todayVisitors ?? 0 },
    { label: '신규 회원 (7일)', value: newMembers7d ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl font-light mb-8" style={{ color: '#1C1C1C' }}>대시보드</h1>

      {/* 지표 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {stats.map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
            <p className="text-xs mb-1" style={{ color: '#1C1C1C' }}>{label}</p>
            <p className="text-3xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
            {sub && <p className="text-xs mt-1" style={{ color: '#1C1C1C', opacity: 0.6 }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* 시간대별 방문 차트 */}
      <h2 className="text-sm font-medium mb-4" style={{ color: '#1C1C1C' }}>오늘 시간대별 방문</h2>
      <div className="rounded-2xl p-5 mb-10" style={{ backgroundColor: '#E8E5E0' }}>
        <div className="flex items-end gap-1" style={{ height: 80 }}>
          {hourlyCounts.map((count, h) => (
            <div key={h} className="flex flex-col items-center flex-1">
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${Math.round((count / maxCount) * 100)}%`,
                  minHeight: count > 0 ? 4 : 0,
                  backgroundColor: '#1C1C1C',
                  opacity: count > 0 ? 0.8 : 0.1,
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex mt-1" style={{ gap: 'calc(100% / 24 - 1px)' }}>
          {[0, 6, 12, 18, 23].map((h) => (
            <span
              key={h}
              className="text-xs"
              style={{
                color: '#1C1C1C',
                opacity: 0.5,
                flex: h === 0 ? '0 0 auto' : '1',
                textAlign: h === 23 ? 'right' : 'left',
              }}
            >
              {h}시
            </span>
          ))}
        </div>
      </div>

      {/* 최근 주문 */}
      <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>최근 주문</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#1C1C1C' }}>
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
              <td className="py-2" style={{ color: '#1C1C1C' }}>{order.id.slice(0, 8).toUpperCase()}</td>
              <td className="py-2" style={{ color: '#1C1C1C' }}>
                {(order.profiles as any)?.display_name ?? '-'}
              </td>
              <td className="py-2" style={{ color: '#1C1C1C' }}>{(order.total_amount ?? 0).toLocaleString()}원</td>
              <td className="py-2" style={{ color: '#1C1C1C' }}>
                {{ paid: '결제 완료', cancelled: '취소됨' }[order.status as string] ?? order.status}
              </td>
              <td className="py-2" style={{ color: '#1C1C1C' }}>
                {new Date(order.created_at).toLocaleDateString('ko-KR')}
              </td>
            </tr>
          ))}
          {(recentOrders ?? []).length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm" style={{ color: '#1C1C1C' }}>주문이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
