import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './_components/ProfileForm'

export default async function MypagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, phone, default_zonecode, default_base_address, default_detail_address')
    .eq('id', user.id)
    .single()

  return (
    <ProfileForm
      userId={user.id}
      initialNickname={profile?.nickname ?? ''}
      initialPhone={profile?.phone ?? ''}
      initialZonecode={profile?.default_zonecode ?? ''}
      initialBaseAddress={profile?.default_base_address ?? ''}
      initialDetailAddress={profile?.default_detail_address ?? ''}
    />
  )
}
