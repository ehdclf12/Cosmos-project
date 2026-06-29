'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DeleteGoodsButton({ id }: { id: string }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('goods').delete().eq('id', id)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      className="px-3 py-1 rounded-lg text-xs transition-opacity hover:opacity-70"
      style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
    >
      삭제
    </button>
  )
}
