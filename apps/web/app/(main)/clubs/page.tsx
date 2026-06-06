'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useClubs, useMyClubs } from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import type { Club } from '@cosmos/shared'

const ACCESS_LABELS = { public: '공개', private: '비공개', invite_only: '초대 전용' } as const

export default function ClubsPage() {
  const { userId, supabase } = useSupabaseUser()
  const [view, setView] = useState<'explore' | 'my'>('explore')
  const [searchInput, setSearchInput] = useState('')
  const [keyword, setKeyword] = useState('')

  const { data: allClubs = [], isLoading: loadingAll } = useClubs(supabase, keyword ? { keyword } : undefined)
  const { data: myClubs = [], isLoading: loadingMy } = useMyClubs(supabase, userId ?? '')

  const clubs = view === 'my' ? myClubs : allClubs
  const isLoading = view === 'my' ? loadingMy : loadingAll

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light" style={{ color: '#1C1C1C' }}>독서 클럽</h1>
        <Link href="/clubs/new" className="px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>
          + 클럽 만들기
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {(['explore', 'my'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className="px-4 py-2 rounded-full text-sm transition-colors"
            style={{ backgroundColor: view === v ? '#1C1C1C' : '#E8E5E0', color: view === v ? 'white' : '#6B6862' }}>
            {v === 'explore' ? '탐색' : '내 클럽'}
          </button>
        ))}
      </div>

      {view === 'explore' && (
        <form className="flex gap-2 mb-6" onSubmit={(e) => { e.preventDefault(); setKeyword(searchInput) }}>
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-gray-400 bg-white"
            placeholder="클럽 이름 검색" />
          <button type="submit" className="px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>
            검색
          </button>
        </form>
      )}

      {isLoading && <p className="text-sm" style={{ color: '#A8A49C' }}>불러오는 중...</p>}

      {!isLoading && clubs.length === 0 && (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: '#A8A49C' }}>
            {view === 'my' ? '아직 가입한 클럽이 없어요.' : '클럽이 없어요.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clubs.map((club: Club) => (
          <Link key={club.id} href={`/clubs/${club.id}`}>
            <div className="rounded-2xl p-5 cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundColor: '#C8C5BC' }}>
              <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-xl"
                style={{ backgroundColor: '#2A2A28', color: 'white' }}>◈</div>
              <h3 className="font-medium mb-1 truncate" style={{ color: '#1C1C1C' }}>{club.name}</h3>
              {club.description && (
                <p className="text-xs line-clamp-2 mb-2" style={{ color: '#6B6862' }}>{club.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mb-2">
                {club.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E8E5E0', color: '#6B6862' }}>
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs" style={{ color: '#A8A49C' }}>{ACCESS_LABELS[club.access_type]}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
