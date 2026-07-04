import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DeleteGoodsButton from './_components/DeleteGoodsButton'
import Pagination from '@/app/components/Pagination'

export const metadata: Metadata = { title: '상품 관리 — Cosmos Admin' }

const PAGE_SIZE = 20

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  active:   { label: '판매중',   bg: '#DCFCE7', color: '#166534' },
  sold_out: { label: '품절',     bg: '#FEE2E2', color: '#991B1B' },
  draft:    { label: '임시저장', bg: '#FEF9C3', color: '#854D0E' },
}

type GoodsListRow = {
  id: string
  title: string
  price: number
  discount_rate: number | null
  stock_quantity: number | null
  status: string
  images: string[] | null
  category_id: string | null
  categories: { name: string } | null
}

interface Props {
  searchParams: Promise<{ q?: string; status?: string; category?: string; from?: string; to?: string; page?: string }>
}

export default async function AdminGoodsPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = sp.q ?? ''
  const statusFilter = sp.status ?? ''
  const categoryFilter = sp.category ?? ''
  const dateFrom = sp.from ?? ''
  const dateTo = sp.to ?? ''
  const page = Math.max(1, Number(sp.page) || 1)
  const supabase = await createClient()

  const [
    { count: totalGoods },
    { count: activeGoods },
    { count: paidOrders },
    { data: categories },
  ] = await Promise.all([
    supabase.from('goods').select('*', { count: 'exact', head: true }),
    supabase.from('goods').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('categories').select('id, name').order('name'),
  ])

  let query = supabase
    .from('goods')
    .select('id, title, price, discount_rate, stock_quantity, status, images, category_id, categories(name)', { count: 'exact' })

  if (q) query = query.ilike('title', `%${q}%`)
  if (statusFilter) query = query.eq('status', statusFilter)
  if (categoryFilter) query = query.eq('category_id', categoryFilter)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')

  const from = (page - 1) * PAGE_SIZE
  const { data: goodsData, count: totalCount } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
  const goods = (goodsData ?? []) as unknown as GoodsListRow[]

  const spRecord: Record<string, string> = {}
  if (q) spRecord.q = q
  if (statusFilter) spRecord.status = statusFilter
  if (categoryFilter) spRecord.category = categoryFilter
  if (dateFrom) spRecord.from = dateFrom
  if (dateTo) spRecord.to = dateTo

  const hasFilter = q || statusFilter || categoryFilter || dateFrom || dateTo

  return (
    <div>
      {/* 미니 대시보드 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: '전체 상품', value: totalGoods ?? 0 },
          { label: '판매중', value: activeGoods ?? 0 },
          { label: '완료 주문', value: paidOrders ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-4" style={{ backgroundColor: '#E8E5E0' }}>
            <p className="text-xs mb-1" style={{ color: '#1C1C1C' }}>{label}</p>
            <p className="text-2xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-light" style={{ color: '#1C1C1C' }}>상품 관리</h1>
        <Link
          href="/admin/categories"
          className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
          style={{ borderColor: '#E8E5E0', color: '#6B6862' }}
        >
          카테고리 관리
        </Link>
      </div>

      {/* 검색/필터 폼 */}
      <form method="get" className="flex flex-wrap gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="상품명 검색"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white"
          style={{ color: '#1C1C1C', minWidth: 180 }}
        />
        <select
          name="category"
          defaultValue={categoryFilter}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none"
          style={{ color: '#1C1C1C' }}
        >
          <option value="">전체 카테고리</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={statusFilter}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none"
          style={{ color: '#1C1C1C' }}
        >
          <option value="">전체 상태</option>
          <option value="active">판매중</option>
          <option value="sold_out">품절</option>
          <option value="draft">임시저장</option>
        </select>
        <input type="date" name="from" defaultValue={dateFrom}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none" style={{ color: '#1C1C1C' }} />
        <span className="self-center text-sm" style={{ color: '#1C1C1C' }}>~</span>
        <input type="date" name="to" defaultValue={dateTo}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none" style={{ color: '#1C1C1C' }} />
        <button type="submit" className="px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>
          검색
        </button>
        {hasFilter && (
          <Link href="/admin/goods" className="px-4 py-2 rounded-xl text-sm border border-gray-200" style={{ color: '#1C1C1C' }}>
            초기화
          </Link>
        )}
        <Link href="/admin/goods/new" className="ml-auto px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>
          + 상품 등록
        </Link>
      </form>

      {/* 상품 목록 테이블 */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#6B6862' }}>
            <th className="pb-3 font-normal w-12">이미지</th>
            <th className="pb-3 font-normal">상품명</th>
            <th className="pb-3 font-normal">가격</th>
            <th className="pb-3 font-normal">할인</th>
            <th className="pb-3 font-normal">재고</th>
            <th className="pb-3 font-normal">카테고리</th>
            <th className="pb-3 font-normal">상태</th>
            <th className="pb-3 font-normal w-28"></th>
          </tr>
        </thead>
        <tbody>
          {(goods ?? []).map((item) => {
            const finalPrice = Math.round(item.price * (1 - (item.discount_rate ?? 0) / 100))
            const stockQty = item.stock_quantity ?? 0
            const status = STATUS_STYLE[item.status] ?? { label: item.status, bg: '#E8E5E0', color: '#1C1C1C' }
            return (
              <tr key={item.id} style={{ borderTop: '1px solid #E8E5E0' }}>
                <td className="py-3">
                  {(item.images as string[])?.[0] ? (
                    <img src={(item.images as string[])[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: '#E8E5E0' }} />
                  )}
                </td>
                <td className="py-3">
                  <Link href={`/admin/goods/${item.id}`} className="hover:underline" style={{ color: '#1C1C1C' }}>
                    {item.title}
                  </Link>
                </td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {finalPrice.toLocaleString()}원
                  {(item.discount_rate ?? 0) > 0 && (
                    <span className="ml-1 text-xs" style={{ color: '#A8A49C' }}>
                      ({item.price.toLocaleString()}원)
                    </span>
                  )}
                </td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {(item.discount_rate ?? 0) > 0 ? `${item.discount_rate}%` : '-'}
                </td>
                <td className="py-3 font-medium" style={{ color: stockQty === 0 ? '#ef4444' : '#1C1C1C' }}>
                  {stockQty}
                </td>
                <td className="py-3 text-xs" style={{ color: '#6B6862' }}>
                  {item.categories?.name ?? '-'}
                </td>
                <td className="py-3">
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ backgroundColor: status.bg, color: status.color }}
                  >
                    {status.label}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/goods/${item.id}/edit`}
                      className="px-3 py-1 rounded-lg text-xs border transition-colors hover:bg-gray-50"
                      style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
                    >
                      수정
                    </Link>
                    <DeleteGoodsButton id={item.id} />
                  </div>
                </td>
              </tr>
            )
          })}
          {(goods ?? []).length === 0 && (
            <tr>
              <td colSpan={8} className="py-12 text-center text-sm" style={{ color: '#A8A49C' }}>
                {hasFilter ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination page={page} totalCount={totalCount ?? 0} pageSize={PAGE_SIZE} searchParams={spRecord} />
    </div>
  )
}
