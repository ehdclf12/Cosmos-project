import type { DayBucket } from '@cosmos/shared'

export default function TrendChart({ data }: { data: DayBucket[] }) {
  const max = Math.max(...data.map((d) => d.total), 1)
  const total = data.reduce((s, d) => s + d.total, 0)
  const labelEvery = data.length > 10 ? Math.ceil(data.length / 10) : 1

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
      <div className="flex items-end gap-1" style={{ height: 96 }}>
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end" title={`${d.date}: ₩${d.total.toLocaleString()}`}>
            <div
              className="w-full rounded-sm"
              style={{
                height: `${Math.round((d.total / max) * 100)}%`,
                minHeight: d.total > 0 ? 4 : 0,
                backgroundColor: '#1C1C1C',
                opacity: d.total > 0 ? 0.8 : 0.1,
              }}
            />
            {i % labelEvery === 0 && (
              <span className="mt-1 text-[10px]" style={{ color: '#1C1C1C', opacity: 0.5 }}>
                {d.date.slice(5)}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs mt-3 text-right" style={{ color: '#1C1C1C', opacity: 0.7 }}>
        기간 총 매출: <strong>₩{total.toLocaleString()}</strong>
      </p>
    </div>
  )
}
