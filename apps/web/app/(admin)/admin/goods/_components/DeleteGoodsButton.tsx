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
    <button onClick={handleDelete} className="text-xs hover:opacity-70" style={{ color: '#1C1C1C' }}>
      삭제
    </button>
  )
}
