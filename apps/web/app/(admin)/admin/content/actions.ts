'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { LandingContent } from '@cosmos/shared'

export async function saveDraft(data: LandingContent): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('site_content')
    .upsert({ key: 'landing_draft', data, updated_at: new Date().toISOString() })
  return error ? { error: error.message } : {}
}

export async function publish(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: draft, error: readErr } = await supabase
    .from('site_content')
    .select('data')
    .eq('key', 'landing_draft')
    .single()
  if (readErr || !draft) return { error: readErr?.message ?? '초안을 찾을 수 없습니다.' }

  const { error } = await supabase
    .from('site_content')
    .upsert({ key: 'landing', data: (draft as { data: unknown }).data, updated_at: new Date().toISOString() })
  if (error) return { error: error.message }

  revalidatePath('/')
  return {}
}
