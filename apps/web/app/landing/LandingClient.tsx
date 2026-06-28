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
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function resolveUser(session: { user: { id: string; user_metadata?: Record<string, string>; app_metadata?: Record<string, string> } } | null) {
      if (!session?.user) { setNickname(null); setIsAdmin(false); return }
      setIsAdmin(session.user.app_metadata?.role === 'admin')
      const metaNickname: string | null = session.user.user_metadata?.nickname ?? null
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', session.user.id)
        .single()
      setNickname(data?.nickname || metaNickname || null)
    }

    supabase.auth.getSession().then(({ data: { session } }) => resolveUser(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveUser(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setNickname(null)
    setIsAdmin(false)
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <LandingHeader
        onMenuClick={() => setSidebarOpen(true)}
        nickname={nickname}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />
      <LandingSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  )
}
