import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DeleteGoodsButton from './_components/DeleteGoodsButton'

export const metadata: Metadata = { title: '상품 관리 — Cosmos Admin' }

const STATUS_LABEL: Record<string, string> = {
  active: '판매중',
  sold_out: '품절',
  draft: '임시저장',
}

export default async function AdminGoodsPage() {
  const supabase = await createClient()
  const { data: goods } = await supabase
    .from('goods')
    .select('id, title, price, discount_rate, status, images, categories(name)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light" style={{ color: '#1C1C1C' }}>상품 관리</h1>
        <Link
          href="/admin/goods/new"
          className="px-4 py-2 rounded-xl text-sm text-white"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          + 상품 등록
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: '#1C1C1C' }}>
            <th className="pb-2 font-normal w-12">이미지</th>
            <th className="pb-2 font-normal">상품명</th>
            <th className="pb-2 font-normal">가격</th>
            <th className="pb-2 font-normal">할인</th>
            <th className="pb-2 font-normal">카테고리</th>
            <th className="pb-2 font-normal">상태</th>
            <th className="pb-2 font-normal w-20"></th>
          </tr>
        </thead>
        <tbody>
          {(goods ?? []).map((item) => {
            const finalPrice = Math.round(item.price * (1 - (item.discount_rate ?? 0) / 100))
            return (
              <tr key={item.id} style={{ borderTop: '1px solid #E8E5E0' }}>
                <td className="py-3">
                  {(item.images as string[])?.[0] ? (
                    <img
                      src={(item.images as string[])[0]}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
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
                    <span className="ml-1 text-xs" style={{ color: '#1C1C1C', opacity: 0.5 }}>
                      ({item.price.toLocaleString()}원)
                    </span>
                  )}
                </td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {(item.discount_rate ?? 0) > 0 ? `${item.discount_rate}%` : '-'}
                </td>
                <td className="py-3" style={{ color: '#1C1C1C' }}>
                  {(item.categories as any)?.name ?? '-'}
                </td>
                <td className="py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: item.status === 'active' ? '#E8E5E0' : '#F2F1EE',
                      color: '#1C1C1C',
                    }}
                  >
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex gap-3">
                    <Link href={`/admin/goods/${item.id}/edit`} className="text-xs hover:opacity-70" style={{ color: '#1C1C1C' }}>
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
              <td colSpan={7} className="py-12 text-center text-sm" style={{ color: '#1C1C1C' }}>
                등록된 상품이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
