import Link from 'next/link'

interface Props {
  lowStock: { id: string; title: string; stock: number }[]
  pendingOrders: number
}

export default function OpsSignals({ lowStock, pendingOrders }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 처리 대기 주문 */}
      <Link
        href="/admin/orders"
        className="rounded-2xl p-5 block hover:opacity-90 transition-opacity"
        style={{ backgroundColor: '#1C1C1C' }}
      >
        <p className="text-xs mb-1" style={{ color: '#A8A49C' }}>처리 대기 주문</p>
        <p className="text-3xl font-light text-white">{pendingOrders}건</p>
        <p className="text-xs mt-1" style={{ color: '#A8A49C' }}>결제완료·준비중 → 주문 관리로</p>
      </Link>

      {/* 재고 부족 */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
        <p className="text-xs mb-2" style={{ color: '#1C1C1C' }}>재고 부족 (≤5)</p>
        {lowStock.length === 0 ? (
          <p className="text-sm" style={{ color: '#A8A49C' }}>없음</p>
        ) : (
          <ul className="space-y-1">
            {lowStock.map((g) => (
              <li key={g.id} className="flex items-center justify-between text-sm">
                <Link href={`/admin/goods/${g.id}`} className="hover:underline truncate" style={{ color: '#1C1C1C' }}>
                  {g.title}
                </Link>
                <span className="shrink-0 ml-3 font-medium" style={{ color: g.stock === 0 ? '#dc2626' : '#1C1C1C' }}>
                  {g.stock}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
