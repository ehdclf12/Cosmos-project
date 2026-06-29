'use client'
import { useState, useTransition } from 'react'
import { addCategory, deleteCategory } from '../actions'

interface Category { id: string; name: string }

export default function CategoryActions({ categories }: { categories: Category[] }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    setError('')
    if (!name.trim()) { setError('카테고리명을 입력해주세요.'); return }
    startTransition(async () => {
      const result = await addCategory(name.trim())
      if (result.error) { setError(result.error); return }
      setName('')
    })
  }

  function handleDelete(id: string, catName: string) {
    if (!confirm(`'${catName}' 카테고리를 삭제하시겠습니까?\n해당 카테고리의 상품들은 카테고리 없음으로 변경됩니다.`)) return
    startTransition(() => deleteCategory(id))
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

      {/* 카테고리 목록 */}
      <div className="space-y-2">
        {categories.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: '#A8A49C' }}>등록된 카테고리가 없습니다.</p>
        )}
        {categories.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ backgroundColor: '#F2F1EE' }}
          >
            <span className="text-sm" style={{ color: '#1C1C1C' }}>{c.name}</span>
            <button
              onClick={() => handleDelete(c.id, c.name)}
              disabled={isPending}
              className="px-3 py-1 rounded-lg text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
