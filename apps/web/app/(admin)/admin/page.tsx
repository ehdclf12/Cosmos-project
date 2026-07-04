import type { Metadata } from 'next'
import type { RangeKey } from '@cosmos/shared'
import { getDashboardData } from '@/lib/admin-dashboard'
import RangeToggle from './_components/RangeToggle'
import KpiCard from './_components/KpiCard'
import TrendChart from './_components/TrendChart'
import StatusDonut from './_components/StatusDonut'
import TopProducts from './_components/TopProducts'
import OpsSignals from './_components/OpsSignals'
import VisitCharts from './_components/VisitCharts'

export const metadata: Metadata = { title: '대시보드 — Cosmos Admin' }
export const dynamic = 'force-dynamic'

function parseRange(v: string | undefined): RangeKey {
  return v === 'today' || v === '30d' ? v : '7d'
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range: rangeParam } = await searchParams
  const range = parseRange(rangeParam)
  const d = await getDashboardData(range)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light" style={{ color: '#1C1C1C' }}>대시보드</h1>
        <RangeToggle range={range} />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="총 매출" value={`₩${d.kpis.revenue.value.toLocaleString()}`} change={d.kpis.revenue.change} />
        <KpiCard label="주문수" value={`${d.kpis.orders.value.toLocaleString()}건`} change={d.kpis.orders.change} />
        <KpiCard label="평균 주문가" value={`₩${d.kpis.aov.value.toLocaleString()}`} change={d.kpis.aov.change} />
        <KpiCard label="취소율" value={`${d.kpis.cancelRate.value.toFixed(1)}%`} change={d.kpis.cancelRate.change} higherIsBetter={false} />
      </div>

      {/* 매출 추세 */}
      <section>
        <h2 className="text-sm font-medium mb-4" style={{ color: '#1C1C1C' }}>매출 추세</h2>
        <TrendChart data={d.trend} />
      </section>

      {/* 랭킹 + 상태분포 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopProducts items={d.topProducts} />
        <StatusDonut data={d.statusDist} />
      </div>

      {/* 운영 신호 */}
      <section>
        <h2 className="text-sm font-medium mb-4" style={{ color: '#1C1C1C' }}>운영 신호</h2>
        <OpsSignals lowStock={d.ops.lowStock} pendingOrders={d.ops.pendingOrders} />
      </section>

      {/* 트래픽 (기존) */}
      <section>
        <h2 className="text-sm font-medium mb-4" style={{ color: '#1C1C1C' }}>트래픽</h2>
        <VisitCharts todayVisitors={d.traffic.todayVisitors} newMembers7d={d.traffic.newMembers7d} hourly={d.traffic.hourly} />
      </section>
    </div>
  )
}
