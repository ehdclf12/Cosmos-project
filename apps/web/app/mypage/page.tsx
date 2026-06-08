import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './_components/ProfileForm'

export default async function MypagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, phone')
    .eq('id', user.id)
    .single()

  return (
    <ProfileForm
      userId={user.id}
      initialNickname={profile?.nickname ?? ''}
      initialPhone={profile?.phone ?? ''}
    />
  )
}
