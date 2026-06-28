import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import OrderStatusSelect from './_components/OrderStatusSelect'
import Pagination from '@/app/components/Pagination'

export const metadata: Metadata = { title: '주문 관리 — Cosmos Admin' }

const PAGE_SIZE = 20

const STATUS_LABEL: Record<string, string> = {
  paid: '결제완료',
  preparing: '상품준비중',
  shipping: '배송중',
  delivered: '배송완료',
  cancelled: '취소됨',
}

interface Props {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string; page?: string }>
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = sp.q ?? ''
  const qSafe = q.replace(/[,().]/g, '')
  const statusFilter = sp.status ?? ''
  const dateFrom = sp.from ?? ''
  const dateTo = sp.to ?? ''
  const page = Math.max(1, Number(sp.page) || 1)
  const supabase = await createClient()

  // 고객명 검색 시 profile IDs 선조회
  let profileIds: string[] = []
  if (qSafe) {
    const { data: matched } = await supabase
      .from('profiles')
      .select('id')
      .ilike('display_name', `%${qSafe}%`)
    profileIds = (matched ?? []).map((p) => p.id)
  }

  let query = supabase
    .from('orders')
    .select(
      'id, status, total_amount, created_at, user_id, recipient_name, order_items(title, quantity)',
      { count: 'exact' }
    )

  if (qSafe) {
    const idFilter = `id.ilike.%${qSafe}%`
    const recipientFilter = `,recipient_name.ilike.%${qSafe}%`
    const nameFilter = profileIds.length > 0 ? `,user_id.in.(${profileIds.join(',')})` : ''
    query = query.or(idFilter + recipientFilter + nameFilter)
  }
  if (statusFilter) query = query.eq('status', statusFilter)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')

  const from = (page - 1) * PAGE_SIZE
  const { data: orders, count: totalCount } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  const userIds = [...new Set((orders ?? []).map((o) => o.user_id).filter(Boolean))]
  const { data: profileRows } = userIds.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', userIds)
    : { data: [] }
  const profileMap = (profileRows ?? []).reduce<Record<string, string>>((acc, p) => {
    acc[p.id] = p.display_name
    return acc
  }, {})

  const spRecord: Record<string, string> = {}
  if (q) spRecord.q = q
  if (statusFilter) spRecord.status = statusFilter
  if (dateFrom) spRecord.from = dateFrom
  if (dateTo) spRecord.to = dateTo

  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>주문 관리</h1>

      {/* 검색/필터 폼 */}
      <form method="get" className="flex flex-wrap gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="주문번호 / 고객명 검색"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white"
          style={{ color: '#1C1C1C', minWidth: 200 }}
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none"
          style={{ color: '#1C1C1C' }}
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={dateFrom}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none" style={{ color: '#1C1C1C' }} />
        <span className="self-center text-sm" style={{ color: '#1C1C1C' }}>~</span>
        <input type="date" name="to" defaultValue={dateTo}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none" style={{ color: '#1C1C1C' }} />
        <button type="submit" className="px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>
          검색
        </button>
        {(q || statusFilter || dateFrom || dateTo) && (
          <a href="/admin/orders" className="px-4 py-2 rounded-xl text-sm border border-gray-200" style={{ color: '#1C1C1C' }}>
            초기화
          </a>
        )}
      </form>

      {/* 주문 목록 테이블 */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#1C1C1C' }}>
            <th className="pb-2 font-normal">주문번호</th>
            <th className="pb-2 font-normal">주문자명</th>
            <th className="pb-2 font-normal">수령인명</th>
            <th className="pb-2 font-normal">상품</th>
            <th className="pb-2 font-normal">금액</th>
            <th className="pb-2 font-normal">상태</th>
            <th className="pb-2 font-normal">일시</th>
          </tr>
        </thead>
        <tbody>
          {(orders ?? []).map((order) => {
            const items = (order.order_items as { title: string; quantity: number }[]) ?? []
            const itemLabel = items.map((i) => `${i.title} x${i.quantity}`).join(', ')
            return (
              <tr key={order.id} style={{ borderTop: '1px solid #E8E5E0' }}>
                <td className="py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="hover:underline font-mono"
                    style={{ color: '#1C1C1C' }}
                  >
                    {order.id.slice(0, 8).toUpperCase()}
                  </Link>
                </td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {profileMap[order.user_id] ?? '-'}
                </td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {(order as any).recipient_name ?? '-'}
                </td>
                <td className="py-3 max-w-xs truncate" style={{ color: '#1C1C1C' }}>{itemLabel || '-'}</td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>{(order.total_amount ?? 0).toLocaleString()}원</td>
                <td className="py-3">
                  <OrderStatusSelect id={order.id} status={order.status} />
                </td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {new Date(order.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            )
          })}
          {(orders ?? []).length === 0 && (
            <tr>
              <td colSpan={7} className="py-12 text-center text-sm" style={{ color: '#1C1C1C' }}>
                {q || statusFilter || dateFrom || dateTo ? '검색 결과가 없습니다.' : '주문이 없습니다.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination page={page} totalCount={totalCount ?? 0} pageSize={PAGE_SIZE} searchParams={spRecord} />
    </div>
  )
}
