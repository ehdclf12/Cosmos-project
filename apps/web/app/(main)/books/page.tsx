'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useBooks } from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import type { BookStatus, UserBookWithBook } from '@cosmos/shared'

const STATUS_TABS: { key: BookStatus | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'want_to_read', label: '읽고 싶음' },
  { key: 'reading', label: '읽는 중' },
  { key: 'finished', label: '읽음' },
]

const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: '읽고 싶음',
  reading: '읽는 중',
  finished: '읽음',
}

export default function BooksPage() {
  const [activeTab, setActiveTab] = useState<BookStatus | 'all'>('all')
  const { userId, supabase } = useSupabaseUser()
  const { data: books = [], isLoading } = useBooks(
    supabase,
    userId ?? '',
    activeTab === 'all' ? undefined : activeTab
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light" style={{ color: '#1C1C1C' }}>내 책장</h1>
        <Link
          href="/books/new"
          className="px-4 py-2 rounded-xl text-sm text-white"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          + 책 추가
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="px-4 py-2 rounded-full text-sm transition-colors"
            style={{
              backgroundColor: activeTab === key ? '#1C1C1C' : '#E8E5E0',
              color: activeTab === key ? 'white' : '#6B6862',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm" style={{ color: '#A8A49C' }}>불러오는 중...</p>}

      {!isLoading && books.length === 0 && (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: '#A8A49C' }}>아직 추가한 책이 없어요.</p>
          <Link href="/books/new" className="mt-2 inline-block text-sm underline" style={{ color: '#1C1C1C' }}>
            첫 번째 책 추가하기
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {books.map((ub: UserBookWithBook) => (
          <Link key={ub.id} href={`/books/${ub.book_id}`}>
            <div
              className="rounded-2xl p-4 aspect-[3/4] flex flex-col justify-end cursor-pointer hover:opacity-90 transition-opacity relative"
              style={{ backgroundColor: '#C8C5BC' }}
            >
              {ub.book.cover_url ? (
                <img src={ub.book.cover_url} alt={ub.book.title} className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
              ) : (
                <div className="flex-1" />
              )}
              <div>
                <p className="text-xs mb-1" style={{ color: '#6B6862' }}>{STATUS_LABELS[ub.status]}</p>
                <p className="font-medium text-sm leading-tight" style={{ color: '#1C1C1C' }}>{ub.book.title}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B6862' }}>{ub.book.author}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
