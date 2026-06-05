import { createClient } from './client'

let _userId: string | null = null

export async function ensureAnonSession(): Promise<string> {
  if (_userId) return _userId
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    _userId = session.user.id
    return _userId
  }
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) throw new Error('익명 로그인 실패')
  _userId = data.user.id
  return _userId
}
