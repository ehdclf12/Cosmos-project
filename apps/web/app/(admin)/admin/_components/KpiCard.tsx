import type { PctResult } from '@cosmos/shared'

export default function KpiCard({
  label,
  value,
  change,
}: {
  label: string
  value: string
  change: PctResult
}) {
  const up = change.pct >= 0
  const color = change.isNew ? '#6B6862' : up ? '#16a34a' : '#dc2626'
  const text = change.isNew ? '신규' : `${up ? '▲' : '▼'} ${Math.abs(change.pct).toFixed(1)}%`
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
      <p className="text-xs mb-1" style={{ color: '#1C1C1C' }}>{label}</p>
      <p className="text-2xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color }}>
        {text} <span style={{ color: '#A8A49C' }}>vs 직전</span>
      </p>
    </div>
  )
}
