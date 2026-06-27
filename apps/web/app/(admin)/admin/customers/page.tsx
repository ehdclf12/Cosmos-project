import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

export const metadata: Metadata = { title: '고객 관리 — Cosmos Admin' }

export default async function AdminCustomersPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [
    { data: profiles },
    { data: { users } },
    { data: orderRows },
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name, created_at').order('created_at', { ascending: false }),
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

  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>고객 관리</h1>

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
              <td colSpan={4} className="py-12 text-center text-sm" style={{ color: '#1C1C1C' }}>회원이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
