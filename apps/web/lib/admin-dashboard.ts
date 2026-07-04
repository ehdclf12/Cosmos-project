import { createClient } from '@/lib/supabase/server'
import {
  resolveRange,
  pctChange,
  bucketByDay,
  topProducts,
  type RangeKey,
  type PctResult,
  type DayBucket,
  type TopProduct,
} from '@cosmos/shared'

export interface DashboardData {
  range: RangeKey
  kpis: {
    revenue: { value: number; change: PctResult }
    orders: { value: number; change: PctResult }
    aov: { value: number; change: PctResult }
    cancelRate: { value: number; change: PctResult } // value = 0~100(%)
  }
  trend: DayBucket[]
  statusDist: { status: string; count: number }[]
  topProducts: TopProduct[]
  ops: {
    lowStock: { id: string; title: string; stock: number }[]
    pendingOrders: number
  }
  traffic: {
    todayVisitors: number
    newMembers7d: number
    hourly: number[] // 길이 24
  }
}

type OrderRow = { total_amount: number | null; status: string; created_at: string }
type ItemRow = {
  goods_id: string
  title: string
  quantity: number
  price: number
  status: string
  orders: { status: string; created_at: string } | null
}
type LowStockRow = { id: string; title: string; stock_quantity: number | null }

const ACTIVE = ['paid', 'preparing', 'shipping', 'delivered'] // 취소 제외

function summarize(rows: OrderRow[]) {
  const active = rows.filter((r) => r.status !== 'cancelled')
  const revenue = active.reduce((s, r) => s + (r.total_amount ?? 0), 0)
  const orders = active.length
  const cancelled = rows.filter((r) => r.status === 'cancelled').length
  const total = rows.length
  return {
    revenue,
    orders,
    aov: orders > 0 ? Math.round(revenue / orders) : 0,
    cancelRate: total > 0 ? (cancelled / total) * 100 : 0,
  }
}

export async function getDashboardData(range: RangeKey): Promise<DashboardData> {
  const supabase = await createClient()
  const { start, end, prevStart, prevEnd, days } = resolveRange(range, new Date())

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const [
    curRes,
    prevRes,
    itemsRes,
    lowStockRes,
    pendingRes,
    visitorsRes,
    membersRes,
    hourlyRes,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('total_amount, status, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
    supabase
      .from('orders')
      .select('total_amount, status, created_at')
      .gte('created_at', prevStart.toISOString())
      .lte('created_at', prevEnd.toISOString()),
    supabase
      .from('order_items')
      .select('goods_id, title, quantity, price, status, orders!inner(status, created_at)')
      .gte('orders.created_at', start.toISOString())
      .lte('orders.created_at', end.toISOString()),
    supabase
      .from('goods')
      .select('id, title, stock_quantity')
      .eq('status', 'active')
      .lte('stock_quantity', 5)
      .order('stock_quantity', { ascending: true })
      .limit(10),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['paid', 'preparing']),
    supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString()),
    supabase.from('page_views').select('created_at').gte('created_at', todayStart.toISOString()),
  ])

  const curRows = (curRes.data ?? []) as unknown as OrderRow[]
  const prevRows = (prevRes.data ?? []) as unknown as OrderRow[]
  const cur = summarize(curRows)
  const prev = summarize(prevRows)

  const trend = bucketByDay(
    curRows
      .filter((r) => r.status !== 'cancelled')
      .map((r) => ({ created_at: r.created_at, amount: r.total_amount ?? 0 })),
    start,
    days
  )

  const statusOrder = ['paid', 'preparing', 'shipping', 'delivered', 'cancelled']
  const statusCounts = new Map<string, number>()
  for (const r of curRows) statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1)
  const statusDist = statusOrder
    .map((status) => ({ status, count: statusCounts.get(status) ?? 0 }))
    .filter((s) => s.count > 0)

  const items = ((itemsRes.data ?? []) as unknown as ItemRow[]).filter(
    (it) => it.status !== 'cancelled' && it.orders?.status !== 'cancelled'
  )
  const top = topProducts(
    items.map((it) => ({
      goods_id: it.goods_id,
      title: it.title,
      quantity: it.quantity,
      price: it.price,
    })),
    5
  )

  const lowStock = ((lowStockRes.data ?? []) as unknown as LowStockRow[]).map((g) => ({
    id: g.id,
    title: g.title,
    stock: g.stock_quantity ?? 0,
  }))

  const hourly = Array<number>(24).fill(0)
  for (const row of (hourlyRes.data ?? []) as unknown as { created_at: string }[]) {
    hourly[new Date(row.created_at).getHours()]++
  }

  return {
    range,
    kpis: {
      revenue: { value: cur.revenue, change: pctChange(cur.revenue, prev.revenue) },
      orders: { value: cur.orders, change: pctChange(cur.orders, prev.orders) },
      aov: { value: cur.aov, change: pctChange(cur.aov, prev.aov) },
      cancelRate: { value: cur.cancelRate, change: pctChange(cur.cancelRate, prev.cancelRate) },
    },
    trend,
    statusDist,
    topProducts: top,
    ops: { lowStock, pendingOrders: pendingRes.count ?? 0 },
    traffic: {
      todayVisitors: visitorsRes.count ?? 0,
      newMembers7d: membersRes.count ?? 0,
      hourly,
    },
  }
}
