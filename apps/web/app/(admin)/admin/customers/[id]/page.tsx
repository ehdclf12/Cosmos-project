import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

export const metadata: Metadata = { title: '고객 상세 — Cosmos Admin' }

interface Props { params: Promise<{ id: string }> }

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [
    { data: profile },
    { data: { user: authUser } },
    { data: orders },
    { data: wishlist },
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name, username, created_at').eq('id', id).single(),
    adminClient.auth.admin.getUserById(id),
    supabase
      .from('orders')
      .select('id, status, total_amount, created_at, order_items(title, quantity)')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('goods_wishlist')
      .select('goods:goods(id, title, price)')
      .eq('user_id', id),
  ])

  if (!profile) notFound()

  const wishlistGoods = (wishlist ?? [])
    .map((r) => (Array.isArray(r.goods) ? r.goods[0] : (r.goods as any)))
    .filter(Boolean)

  return (
    <div>
      <Link href="/admin/customers" className="text-xs mb-6 inline-block hover:opacity-70" style={{ color: '#1C1C1C' }}>
        ← 고객 목록
      </Link>

      <h1 className="text-2xl font-light mb-1" style={{ color: '#1C1C1C' }}>{profile.display_name}</h1>
      <p className="text-sm mb-8" style={{ color: '#1C1C1C' }}>
        {authUser?.email ?? ''} · 가입일 {new Date(profile.created_at).toLocaleDateString('ko-KR')}
      </p>

      <section className="mb-10">
        <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>
          주문 내역 ({orders?.length ?? 0}건)
        </h2>
        {(orders ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: '#1C1C1C' }}>주문 내역이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: '#1C1C1C' }}>
                <th className="pb-2 font-normal">주문번호</th>
                <th className="pb-2 font-normal">상품</th>
                <th className="pb-2 font-normal">금액</th>
                <th className="pb-2 font-normal">상태</th>
                <th className="pb-2 font-normal">일시</th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((order) => {
                const items = (order.order_items as { title: string; quantity: number }[]) ?? []
                return (
                  <tr key={order.id} style={{ borderTop: '1px solid #E8E5E0' }}>
                    <td className="py-2" style={{ color: '#1C1C1C' }}>{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="py-2 max-w-xs truncate" style={{ color: '#1C1C1C' }}>
                      {items.map((i) => `${i.title} x${i.quantity}`).join(', ') || '-'}
                    </td>
                    <td className="py-2" style={{ color: '#1C1C1C' }}>{(order.total_amount ?? 0).toLocaleString()}원</td>
                    <td className="py-2" style={{ color: '#1C1C1C' }}>
                      {{ paid: '결제 완료', cancelled: '취소됨' }[order.status as string] ?? order.status}
                    </td>
                    <td className="py-2" style={{ color: '#1C1C1C' }}>
                      {new Date(order.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>
          위시리스트 ({wishlistGoods.length}개)
        </h2>
        {wishlistGoods.length === 0 ? (
          <p className="text-sm" style={{ color: '#1C1C1C' }}>위시리스트가 비어있습니다.</p>
        ) : (
          <div className="space-y-2">
            {wishlistGoods.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl p-3"
                style={{ backgroundColor: '#E8E5E0' }}
              >
                <span className="text-sm" style={{ color: '#1C1C1C' }}>{item.title}</span>
                <span className="text-sm" style={{ color: '#1C1C1C' }}>{(item.price ?? 0).toLocaleString()}원</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
