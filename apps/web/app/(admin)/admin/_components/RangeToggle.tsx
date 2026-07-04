import Link from 'next/link'
import type { RangeKey } from '@cosmos/shared'

const OPTIONS: { k: RangeKey; label: string }[] = [
  { k: 'today', label: '오늘' },
  { k: '7d', label: '7일' },
  { k: '30d', label: '30일' },
]

export default function RangeToggle({ range }: { range: RangeKey }) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden border" style={{ borderColor: '#E8E5E0' }}>
      {OPTIONS.map((o) => {
        const active = o.k === range
        return (
          <Link
            key={o.k}
            href={`/admin?range=${o.k}`}
            className="px-4 py-1.5 text-sm transition-colors"
            style={{ backgroundColor: active ? '#1C1C1C' : 'transparent', color: active ? '#fff' : '#1C1C1C' }}
          >
            {o.label}
          </Link>
        )
      })}
    </div>
  )
}
