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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setNickname(null); return }
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', session.user.id)
        .single()
      setNickname(data?.nickname ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) { setNickname(null); return }
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', session.user.id)
        .single()
      setNickname(data?.nickname ?? null)
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
