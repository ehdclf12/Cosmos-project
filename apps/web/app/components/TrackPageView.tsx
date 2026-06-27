'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TrackPageView() {
  const pathname = usePathname()

  useEffect(() => {
    // 어드민 페이지 트래킹 제외
    if (pathname.startsWith('/admin')) return

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase.from('page_views').insert({
        path: pathname,
        user_id: user?.id ?? null,
      })
    })
  }, [pathname])

  return null
}
