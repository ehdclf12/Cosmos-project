import { createClient } from '@/lib/supabase/server'

/**
 * 서버액션은 미들웨어와 별개로 접근 가능한 공개 HTTP 엔드포인트다.
 * 미들웨어(`/admin/:path*`)만 믿지 말고 액션 안에서 관리자 여부를 직접 확인한다.
 * 특히 service role 클라이언트를 쓰는 액션은 RLS가 걸리지 않으므로 이 검사가 유일한 방어선이다.
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.app_metadata?.role === 'admin'
}

export const FORBIDDEN = { error: '권한이 없습니다.' } as const
