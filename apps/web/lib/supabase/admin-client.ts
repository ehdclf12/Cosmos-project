// SERVER-ONLY: Never import this in client components — service role key bypasses RLS.
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}
