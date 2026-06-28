import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: '대시보드 — Cosmos Admin' }

export default async function AdminDashboard() {
  const supabase = await createClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const sixDaysAgo = new Date()
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
  sixDaysAgo.setHours(0, 0, 0, 0)

  const [
    { count: todayVisitors },
    { count: newMembers7d },
    { data: hourlyRaw },
    { data: salesRaw },
  ] = await Promise.all([
    supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString()),
    supabase
      .from('page_views')
      .select('created_at')
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('orders')
      .select('total_amount, created_at')
      .in('status', ['paid', 'delivered'])
      .gte('created_at', sixDaysAgo.toISOString()),
  ])

  // 시간대별 방문 집계
  const hourlyCounts = Array(24).fill(0)
  ;(hourlyRaw ?? []).forEach((row) => {
    hourlyCounts[new Date(row.created_at).getHours()]++
  })
  const maxHourly = Math.max(...hourlyCounts, 1)

  // 7일 매출 집계 (index 0 = 6일 전, index 6 = 오늘)
  const dailySales = Array(7).fill(0)
  ;(salesRaw ?? []).forEach((row) => {
    const rowDate = new Date(row.created_at)
    rowDate.setHours(0, 0, 0, 0)
    const diff = Math.round((rowDate.getTime() - sixDaysAgo.getTime()) / 86400000)
    if (diff >= 0 && diff < 7) dailySales[diff] += row.total_amount ?? 0
  })
  const totalSales7d = dailySales.reduce((s, v) => s + v, 0)
  const maxSales = Math.max(...dailySales, 1)

  const stats = [
    { label: '오늘 방문자', value: todayVisitors ?? 0 },
    { label: '신규 회원 (7일)', value: newMembers7d ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl font-light mb-8" style={{ color: '#1C1C1C' }}>대시보드</h1>

      {/* 지표 카드 */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
            <p className="text-xs mb-1" style={{ color: '#1C1C1C' }}>{label}</p>
            <p className="text-3xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
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
                  height: `${Math.round((count / maxHourly) * 100)}%`,
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

      {/* 7일 매출 차트 */}
      <h2 className="text-sm font-medium mb-4" style={{ color: '#1C1C1C' }}>최근 7일 매출</h2>
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
        <div className="flex items-end gap-2" style={{ height: 80 }}>
          {dailySales.map((amount, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${Math.round((amount / maxSales) * 100)}%`,
                  minHeight: amount > 0 ? 4 : 0,
                  backgroundColor: '#1C1C1C',
                  opacity: amount > 0 ? 0.8 : 0.1,
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex mt-2">
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(sixDaysAgo)
            d.setDate(d.getDate() + i)
            return (
              <span key={i} className="flex-1 text-xs text-center" style={{ color: '#1C1C1C', opacity: 0.5 }}>
                {d.getMonth() + 1}/{d.getDate()}
              </span>
            )
          })}
        </div>
        <p className="text-xs mt-3 text-right" style={{ color: '#1C1C1C', opacity: 0.7 }}>
          7일 총 매출: <strong>₩{totalSales7d.toLocaleString()}</strong>
        </p>
      </div>
    </div>
  )
}
