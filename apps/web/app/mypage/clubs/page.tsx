import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MyClubsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('club_members')
    .select('club:clubs(id, name, description, tags, access_type)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })

  const clubs = (memberships ?? []).map((m) => m.club).filter(Boolean)

  return (
    <div>
      <h2 className="text-xl font-light mb-8" style={{ color: '#1C1C1C' }}>가입한 클럽</h2>
      {clubs.length === 0 ? (
        <p className="text-sm" style={{ color: '#A8A49C' }}>가입한 클럽이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((club) => (
            <Link key={club!.id} href={`/clubs/${club!.id}`}>
              <div className="rounded-2xl p-5 hover:opacity-90 transition-opacity" style={{ backgroundColor: '#C8C5BC' }}>
                <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-xl" style={{ backgroundColor: '#2A2A28', color: 'white' }}>◈</div>
                <h3 className="font-medium mb-1 truncate" style={{ color: '#1C1C1C' }}>{club!.name}</h3>
                {club!.description && (
                  <p className="text-xs line-clamp-2 mb-2" style={{ color: '#6B6862' }}>{club!.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {(club!.tags ?? []).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E8E5E0', color: '#6B6862' }}>{tag}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
