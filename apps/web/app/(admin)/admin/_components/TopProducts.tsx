import Link from 'next/link'
import type { TopProduct } from '@cosmos/shared'

export default function TopProducts({ items }: { items: TopProduct[] }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
      <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>인기 상품 Top 5</h2>
      {items.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: '#A8A49C' }}>데이터 없음</p>
      ) : (
        <ol className="space-y-2">
          {items.map((p, i) => (
            <li key={p.goods_id} className="flex items-center justify-between text-sm">
              <Link href={`/admin/goods/${p.goods_id}`} className="hover:underline truncate" style={{ color: '#1C1C1C' }}>
                {i + 1}. {p.title}
              </Link>
              <span className="shrink-0 ml-3" style={{ color: '#6B6862' }}>
                {p.qty}개 · ₩{p.revenue.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
