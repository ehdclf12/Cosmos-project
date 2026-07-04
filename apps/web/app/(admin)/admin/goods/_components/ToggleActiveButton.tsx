'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ToggleActiveButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    const next = !isActive
    if (!confirm(`상품을 ${next ? '노출' : '미노출'}로 변경하시겠습니까?`)) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('goods').update({ is_active: next }).eq('id', id)
    setBusy(false)
    if (error) {
      alert('노출 상태 변경 실패: ' + error.message)
      return
    }
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="text-xs px-2 py-1 rounded-full transition-opacity hover:opacity-70 disabled:opacity-40"
      style={
        isActive
          ? { backgroundColor: '#DCFCE7', color: '#166534' }
          : { backgroundColor: '#E8E5E0', color: '#6B6862' }
      }
      aria-pressed={isActive}
    >
      {isActive ? '노출' : '미노출'}
    </button>
  )
}
