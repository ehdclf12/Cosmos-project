'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addCategory(name: string) {
  if (!name.trim()) return { error: '카테고리명을 입력해주세요.' }
  const supabase = await createClient()
  const { error } = await supabase.from('categories').insert({ name: name.trim() })
  if (error) return { error: error.code === '23505' ? '이미 존재하는 카테고리입니다.' : error.message }
  revalidatePath('/admin/categories')
  revalidatePath('/admin/goods')
  return {}
}

export async function deactivateCategory(id: string) {
  const supabase = await createClient()
  await supabase.from('categories').update({ is_active: false }).eq('id', id)
  revalidatePath('/admin/categories')
  revalidatePath('/admin/goods')
  revalidatePath('/goods')
}

export async function activateCategory(id: string) {
  const supabase = await createClient()
  await supabase.from('categories').update({ is_active: true }).eq('id', id)
  revalidatePath('/admin/categories')
  revalidatePath('/admin/goods')
  revalidatePath('/goods')
}
