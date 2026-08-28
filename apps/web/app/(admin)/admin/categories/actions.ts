'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isAdmin, FORBIDDEN } from '@/lib/require-admin'

export async function addCategory(name: string) {
  if (!(await isAdmin())) return FORBIDDEN
  if (!name.trim()) return { error: '카테고리명을 입력해주세요.' }
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('categories').insert({ name: name.trim() })
    if (error) return { error: error.code === '23505' ? '이미 존재하는 카테고리입니다.' : error.message }
    revalidatePath('/admin/categories')
    revalidatePath('/admin/goods')
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}

export async function deactivateCategory(id: string) {
  if (!(await isAdmin())) return FORBIDDEN
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('categories').update({ is_active: false }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/categories')
    revalidatePath('/admin/goods')
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}

export async function activateCategory(id: string) {
  if (!(await isAdmin())) return FORBIDDEN
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('categories').update({ is_active: true }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/categories')
    revalidatePath('/admin/goods')
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}
