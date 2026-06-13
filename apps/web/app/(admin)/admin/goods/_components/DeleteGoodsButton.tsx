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
    <button onClick={handleDelete} className="text-xs hover:opacity-70" style={{ color: '#A8A49C' }}>
      삭제
    </button>
  )
}
