import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import Pagination from '@/app/components/Pagination'

export const metadata: Metadata = { title: '고객 관리 — Cosmos Admin' }

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = sp.q ?? ''
  const dateFrom = sp.from ?? ''
  const dateTo = sp.to ?? ''
  const page = Math.max(1, Number(sp.page) || 1)
  const supabase = await createClient()
  const adminClient = createAdminClient()

  let profileQuery = supabase
    .from('profiles')
    .select('id, display_name, created_at', { count: 'exact' })

  if (q) profileQuery = profileQuery.ilike('display_name', `%${q}%`)
  if (dateFrom) profileQuery = profileQuery.gte('created_at', dateFrom)
  if (dateTo) profileQuery = profileQuery.lte('created_at', dateTo + 'T23:59:59')

  const from = (page - 1) * PAGE_SIZE
  const [
    { data: profiles, count: totalCount },
    { data: { users } },
    { data: orderRows },
  ] = await Promise.all([
    profileQuery.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('orders').select('user_id'),
  ])

  const emailMap = (users ?? []).reduce<Record<string, string>>((acc, u) => {
    acc[u.id] = u.email ?? ''
    return acc
  }, {})

  const countByUser = (orderRows ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.user_id] = (acc[o.user_id] ?? 0) + 1
    return acc
  }, {})

  const customers = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap[p.id] ?? '',
    orderCount: countByUser[p.id] ?? 0,
  }))

  const spRecord: Record<string, string> = {}
  if (q) spRecord.q = q
  if (dateFrom) spRecord.from = dateFrom
  if (dateTo) spRecord.to = dateTo

  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>고객 관리</h1>

      {/* 검색/필터 폼 */}
      <form method="get" className="flex flex-wrap gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="이름 검색"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white"
          style={{ color: '#1C1C1C', minWidth: 200 }}
        />
        <input type="date" name="from" defaultValue={dateFrom}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none" style={{ color: '#1C1C1C' }} />
        <span className="self-center text-sm" style={{ color: '#1C1C1C' }}>~</span>
        <input type="date" name="to" defaultValue={dateTo}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none" style={{ color: '#1C1C1C' }} />
        <button type="submit" className="px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>
          검색
        </button>
        {(q || dateFrom || dateTo) && (
          <Link href="/admin/customers" className="px-4 py-2 rounded-xl text-sm border border-gray-200" style={{ color: '#1C1C1C' }}>
            초기화
          </Link>
        )}
      </form>

      {/* 고객 목록 테이블 */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#1C1C1C' }}>
            <th className="pb-2 font-normal">이름</th>
            <th className="pb-2 font-normal">이메일</th>
            <th className="pb-2 font-normal">가입일</th>
            <th className="pb-2 font-normal">주문 수</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} style={{ borderTop: '1px solid #E8E5E0' }}>
              <td className="py-3">
                <Link href={`/admin/customers/${c.id}`} className="hover:underline" style={{ color: '#1C1C1C' }}>
                  {c.display_name}
                </Link>
              </td>
              <td className="py-3" style={{ color: '#1C1C1C' }}>{c.email}</td>
              <td className="py-3" style={{ color: '#1C1C1C' }}>
                {new Date(c.created_at).toLocaleDateString('ko-KR')}
              </td>
              <td className="py-3" style={{ color: '#1C1C1C' }}>{c.orderCount}건</td>
            </tr>
          ))}
          {customers.length === 0 && (
            <tr>
              <td colSpan={4} className="py-12 text-center text-sm" style={{ color: '#1C1C1C' }}>
                {q || dateFrom || dateTo ? '검색 결과가 없습니다.' : '회원이 없습니다.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination page={page} totalCount={totalCount ?? 0} pageSize={PAGE_SIZE} searchParams={spRecord} />
    </div>
  )
}
