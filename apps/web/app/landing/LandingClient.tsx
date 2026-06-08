'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LandingHeader from './LandingHeader'
import LandingSidebar from './LandingSidebar'

export default function LandingClient() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function resolveNickname(session: { user: { id: string; user_metadata?: Record<string, string> } } | null) {
      if (!session?.user) { setNickname(null); return }
      const metaNickname: string | null = session.user.user_metadata?.nickname ?? null
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', session.user.id)
        .single()
      setNickname(data?.nickname || metaNickname || null)
    }

    supabase.auth.getSession().then(({ data: { session } }) => resolveNickname(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveNickname(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setNickname(null)
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <LandingHeader
        onMenuClick={() => setSidebarOpen(true)}
        nickname={nickname}
        onLogout={handleLogout}
      />
      <LandingSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  )
}
