import { resolveRange, pctChange, bucketByDay, topProducts } from '../dashboard'

describe('resolveRange', () => {
  it('7d: 오늘 포함 7일 + 직전 7일', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0) // 2026-01-15 12:00 local
    const r = resolveRange('7d', now)
    expect(r.days).toBe(7)
    expect(r.start).toEqual(new Date(2026, 0, 9, 0, 0, 0))
    expect(r.end).toEqual(now)
    expect(r.prevEnd).toEqual(new Date(2026, 0, 9, 0, 0, 0))
    expect(r.prevStart).toEqual(new Date(2026, 0, 2, 0, 0, 0))
  })

  it('30d: days=30, start=29일 전 00:00', () => {
    const now = new Date(2026, 5, 30, 8, 0, 0)
    const r = resolveRange('30d', now)
    expect(r.days).toBe(30)
    expect(r.start).toEqual(new Date(2026, 5, 1, 0, 0, 0))
    expect(r.prevStart).toEqual(new Date(2026, 4, 2, 0, 0, 0))
  })

  it('today: 오늘 00:00~현재 + 어제 같은 구간', () => {
    const now = new Date(2026, 0, 15, 10, 0, 0)
    const r = resolveRange('today', now)
    expect(r.days).toBe(1)
    expect(r.start).toEqual(new Date(2026, 0, 15, 0, 0, 0))
    expect(r.end).toEqual(now)
    expect(r.prevStart).toEqual(new Date(2026, 0, 14, 0, 0, 0))
    expect(r.prevEnd).toEqual(new Date(2026, 0, 14, 10, 0, 0)) // 어제 같은 경과시간
  })
})

describe('pctChange', () => {
  it('증가', () => expect(pctChange(120, 100)).toEqual({ pct: 20, isNew: false }))
  it('감소', () => expect(pctChange(80, 100)).toEqual({ pct: -20, isNew: false }))
  it('이전 0 + 현재 >0 → isNew', () => expect(pctChange(5, 0)).toEqual({ pct: 0, isNew: true }))
  it('둘 다 0', () => expect(pctChange(0, 0)).toEqual({ pct: 0, isNew: false }))
})

describe('bucketByDay', () => {
  it('일별 합산 + 빈 날 0 + 기간 밖 제외', () => {
    const start = new Date(2026, 0, 9, 0, 0, 0)
    const rows = [
      { created_at: new Date(2026, 0, 9, 10).toISOString(), amount: 100 },
      { created_at: new Date(2026, 0, 10, 3).toISOString(), amount: 50 },
      { created_at: new Date(2026, 0, 10, 20).toISOString(), amount: 30 },
      { created_at: new Date(2026, 0, 12, 1).toISOString(), amount: 999 }, // 범위 밖
    ]
    expect(bucketByDay(rows, start, 3)).toEqual([
      { date: '2026-01-09', total: 100 },
      { date: '2026-01-10', total: 80 },
      { date: '2026-01-11', total: 0 },
    ])
  })
})

describe('topProducts', () => {
  it('goods_id 그룹 합산 + 매출순 정렬(동률 시 수량순) + N 컷', () => {
    const items = [
      { goods_id: 'a', title: 'A', quantity: 2, price: 1000 }, // 2000
      { goods_id: 'b', title: 'B', quantity: 1, price: 5000 }, // 5000
      { goods_id: 'a', title: 'A', quantity: 3, price: 1000 }, // +3000 => a: qty 5, revenue 5000
      { goods_id: 'c', title: 'C', quantity: 1, price: 100 }, // 100 (N=2 컷으로 제외)
    ]
    // revenue 동률(a·b 모두 5000) → 2차 기준 qty 내림차순 → a(5) 먼저, b(1) 다음. c는 컷.
    expect(topProducts(items, 2)).toEqual([
      { goods_id: 'a', title: 'A', qty: 5, revenue: 5000 },
      { goods_id: 'b', title: 'B', qty: 1, revenue: 5000 },
    ])
  })
})
