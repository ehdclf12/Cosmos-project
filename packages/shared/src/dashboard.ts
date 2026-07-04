export type RangeKey = 'today' | '7d' | '30d'

export interface RangeBounds {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
  days: number
}

export interface PctResult {
  pct: number
  isNew: boolean
}

export interface DayBucket {
  date: string // 'YYYY-MM-DD' (서버 로컬 기준)
  total: number
}

export interface TopProduct {
  goods_id: string
  title: string
  qty: number
  revenue: number
}

const DAY_MS = 86_400_000

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function resolveRange(range: RangeKey, now: Date): RangeBounds {
  if (range === 'today') {
    const start = startOfDay(now)
    const elapsed = now.getTime() - start.getTime()
    const prevStart = new Date(start.getTime() - DAY_MS)
    const prevEnd = new Date(prevStart.getTime() + elapsed)
    return { start, end: now, prevStart, prevEnd, days: 1 }
  }
  const days = range === '7d' ? 7 : 30
  const start = startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS))
  const prevEnd = start
  const prevStart = new Date(start.getTime() - days * DAY_MS)
  return { start, end: now, prevStart, prevEnd, days }
}

export function pctChange(current: number, previous: number): PctResult {
  if (previous === 0) return { pct: 0, isNew: current > 0 }
  return { pct: ((current - previous) / Math.abs(previous)) * 100, isNew: false }
}

export function bucketByDay(
  rows: { created_at: string; amount: number }[],
  start: Date,
  days: number
): DayBucket[] {
  const startDay = startOfDay(start)
  const buckets: DayBucket[] = Array.from({ length: days }, (_, i) => ({
    date: toISODate(new Date(startDay.getTime() + i * DAY_MS)),
    total: 0,
  }))
  const indexByDate = new Map(buckets.map((b, i) => [b.date, i]))
  for (const r of rows) {
    const i = indexByDate.get(toISODate(new Date(r.created_at)))
    if (i !== undefined) buckets[i].total += r.amount
  }
  return buckets
}

export function topProducts(
  items: { goods_id: string; title: string; quantity: number; price: number }[],
  n: number
): TopProduct[] {
  const map = new Map<string, TopProduct>()
  for (const it of items) {
    const cur = map.get(it.goods_id) ?? {
      goods_id: it.goods_id,
      title: it.title,
      qty: 0,
      revenue: 0,
    }
    cur.qty += it.quantity
    cur.revenue += it.quantity * it.price
    cur.title = it.title
    map.set(it.goods_id, cur)
  }
  return [...map.values()]
    .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty)
    .slice(0, n)
}
