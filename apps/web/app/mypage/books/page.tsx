import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const STATUS_LABELS: Record<string, string> = {
  want_to_read: '읽고 싶음',
  reading: '읽는 중',
  finished: '읽음',
}

export default async function MyBooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('user_books')
    .select('status, book:books(id, title, author, cover_url)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const userBooks = rows ?? []

  return (
    <div>
      <h2 className="text-xl font-light mb-8" style={{ color: '#1C1C1C' }}>읽은 책</h2>
      {userBooks.length === 0 ? (
        <p className="text-sm" style={{ color: '#A8A49C' }}>등록한 책이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {userBooks.map((entry, idx) => entry.book && (
            <Link key={`${entry.book.id}-${idx}`} href={`/books/${entry.book.id}`}>
              <div className="group">
                <div className="relative aspect-[2/3] mb-3 overflow-hidden rounded" style={{ backgroundColor: '#E8E5E0' }}>
                  {entry.book.cover_url ? (
                    <Image src={entry.book.cover_url} alt={entry.book.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#A8A49C' }}>No Cover</div>
                  )}
                </div>
                <p className="text-sm font-light line-clamp-2 mb-1" style={{ color: '#1C1C1C' }}>{entry.book.title}</p>
                <p className="text-xs" style={{ color: '#A8A49C' }}>{entry.book.author}</p>
                <p className="text-xs mt-1" style={{ color: '#6B6862' }}>{STATUS_LABELS[entry.status] ?? entry.status}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
