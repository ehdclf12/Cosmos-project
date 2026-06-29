'use client'
import { useState, useTransition } from 'react'
import { addCategory, activateCategory, deactivateCategory } from '../actions'

interface Category { id: string; name: string; is_active: boolean }

export default function CategoryActions({ categories }: { categories: Category[] }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const active = categories.filter((c) => c.is_active)
  const inactive = categories.filter((c) => !c.is_active)

  function handleAdd() {
    setError('')
    if (!name.trim()) { setError('카테고리명을 입력해주세요.'); return }
    startTransition(async () => {
      const result = await addCategory(name.trim())
      if (result.error) { setError(result.error); return }
      setName('')
    })
  }

  function handleDeactivate(id: string, catName: string) {
    if (!confirm(`'${catName}' 카테고리를 비활성화하시겠습니까?\n해당 카테고리의 상품이 공개 페이지에서 숨겨집니다.`)) return
    startTransition(async () => {
      const result = await deactivateCategory(id)
      if (result?.error) setError(result.error)
    })
  }

  function handleActivate(id: string) {
    startTransition(async () => {
      const result = await activateCategory(id)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div>
      {/* 카테고리 추가 */}
      <div className="mb-6 p-5 rounded-2xl" style={{ backgroundColor: '#F2F1EE' }}>
        <p className="text-xs mb-3" style={{ color: '#6B6862' }}>새 카테고리 추가</p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="카테고리명"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white"
            style={{ color: '#1C1C1C' }}
          />
          <button
            onClick={handleAdd}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: '#1C1C1C' }}
          >
            추가
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {/* 활성 카테고리 */}
      <p className="text-xs mb-2" style={{ color: '#6B6862' }}>활성 카테고리</p>
      <div className="space-y-2 mb-6">
        {active.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: '#A8A49C' }}>활성 카테고리가 없습니다.</p>
        )}
        {active.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: '#F2F1EE' }}>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
              <span className="text-sm" style={{ color: '#1C1C1C' }}>{c.name}</span>
            </div>
            <button
              onClick={() => handleDeactivate(c.id, c.name)}
              disabled={isPending}
              className="px-3 py-1 rounded-lg text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
            >
              비활성화
            </button>
          </div>
        ))}
      </div>

      {/* 비활성 카테고리 */}
      {inactive.length > 0 && (
        <>
          <p className="text-xs mb-2" style={{ color: '#6B6862' }}>비활성 카테고리 (공개 숨김 중)</p>
          <div className="space-y-2">
            {inactive.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: '#F2F1EE', opacity: 0.6 }}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#A8A49C' }} />
                  <span className="text-sm" style={{ color: '#6B6862' }}>{c.name}</span>
                </div>
                <button
                  onClick={() => handleActivate(c.id)}
                  disabled={isPending}
                  className="px-3 py-1 rounded-lg text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ backgroundColor: '#DCFCE7', color: '#166534' }}
                >
                  활성화
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
