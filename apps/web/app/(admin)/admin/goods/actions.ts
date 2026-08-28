'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin, FORBIDDEN } from '@/lib/require-admin'

interface GoodsPayload {
  title: string
  description: string | null
  price: number
  discount_rate: number
  stock_quantity: number
  images: string[]
  status: 'active' | 'sold_out' | 'draft'
  category_id: string | null
  published_at: string | null
}

export async function saveGoods(id: string | null, payload: GoodsPayload, imagesToDelete: string[] = []) {
  if (!(await isAdmin())) return FORBIDDEN
  const supabase = await createClient()
  const { error } = id
    ? await supabase.from('goods').update(payload).eq('id', id)
    : await supabase.from('goods').insert(payload)
  if (error) return { error: error.message }
  if (imagesToDelete.length > 0) {
    await supabase.storage.from('goods-images').remove(imagesToDelete)
  }
  redirect('/admin/goods')
}
