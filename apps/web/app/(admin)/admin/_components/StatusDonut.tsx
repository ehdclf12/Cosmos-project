const LABELS: Record<string, string> = {
  paid: '결제완료',
  preparing: '준비중',
  shipping: '배송중',
  delivered: '배송완료',
  cancelled: '취소',
}
const COLORS: Record<string, string> = {
  paid: '#1C1C1C',
  preparing: '#6B6862',
  shipping: '#A8A49C',
  delivered: '#16a34a',
  cancelled: '#dc2626',
}

export default function StatusDonut({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const R = 42
  const C = 2 * Math.PI * R
  const segments = data.reduce<{ status: string; count: number; dash: number; offset: number }[]>(
    (acc, d) => {
      const prev = acc[acc.length - 1]
      const offset = prev ? prev.offset + prev.dash : 0
      const dash = (d.count / total) * C
      acc.push({ status: d.status, count: d.count, dash, offset })
      return acc
    },
    []
  )

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
      <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>주문 상태 분포</h2>
      {total === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: '#A8A49C' }}>데이터 없음</p>
      ) : (
        <div className="flex items-center gap-5">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <g transform="rotate(-90 55 55)">
              {segments.map((d) => (
                <circle
                  key={d.status}
                  cx="55"
                  cy="55"
                  r={R}
                  fill="none"
                  stroke={COLORS[d.status] ?? '#C8C5BC'}
                  strokeWidth="14"
                  strokeDasharray={`${d.dash} ${C - d.dash}`}
                  strokeDashoffset={-d.offset}
                />
              ))}
            </g>
            <text x="55" y="59" textAnchor="middle" style={{ fontSize: 16, fill: '#1C1C1C' }}>{total}</text>
          </svg>
          <div className="space-y-1">
            {data.map((d) => (
              <div key={d.status} className="flex items-center gap-2 text-xs" style={{ color: '#1C1C1C' }}>
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[d.status] ?? '#C8C5BC' }} />
                {LABELS[d.status] ?? d.status} · {d.count}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
