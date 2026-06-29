import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CategoryActions from './_components/CategoryActions'

export const metadata: Metadata = { title: '카테고리 관리 — Cosmos Admin' }

export default async function AdminCategoriesPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/goods" className="text-xs" style={{ color: '#A8A49C' }}>
          ← 상품 관리
        </Link>
        <h1 className="text-2xl font-light" style={{ color: '#1C1C1C' }}>카테고리 관리</h1>
      </div>

      <CategoryActions categories={categories ?? []} />
    </div>
  )
}
