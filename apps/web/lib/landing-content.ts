import { createClient } from '@/lib/supabase/server'
import { withDefaults, type LandingContent } from '@cosmos/shared'

async function readContent(key: 'landing' | 'landing_draft'): Promise<LandingContent> {
  const supabase = await createClient()
  const { data } = await supabase.from('site_content').select('data').eq('key', key).single()
  return withDefaults((data as { data?: unknown } | null)?.data)
}

export function getPublishedLandingContent(): Promise<LandingContent> {
  return readContent('landing')
}

export function getDraftLandingContent(): Promise<LandingContent> {
  return readContent('landing_draft')
}
