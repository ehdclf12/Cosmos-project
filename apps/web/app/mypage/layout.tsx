import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingClient from '@/app/landing/LandingClient'
import MypageSidebar from './_components/MypageSidebar'

export default async function MypageLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', user.id)
    .single()

  const nickname = profile?.nickname ?? '사용자'

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />
      <div className="pt-14 flex">
        <MypageSidebar nickname={nickname} />
        <main className="flex-1 px-8 md:px-12 py-10">
          {children}
        </main>
      </div>
    </div>
  )
}
