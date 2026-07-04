'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  goodsId: string
  initialWished?: boolean
}

export default function WishlistButton({ goodsId, initialWished = false }: Props) {
  const router = useRouter()
  const [wished, setWished] = useState(initialWished)
  const [prevInitial, setPrevInitial] = useState(initialWished)
  const [loading, setLoading] = useState(false)

  // initialWished prop이 바뀌면 렌더 중 동기화 (effect 내 setState 회피)
  if (initialWished !== prevInitial) {
    setPrevInitial(initialWished)
    setWished(initialWished)
  }

  async function toggle() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setLoading(true)
    if (wished) {
      await supabase
        .from('goods_wishlist')
        .delete()
        .eq('goods_id', goodsId)
        .eq('user_id', user.id)
      setWished(false)
    } else {
      await supabase
        .from('goods_wishlist')
        .insert({ goods_id: goodsId, user_id: user.id })
      setWished(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-2 text-sm tracking-wide transition-opacity hover:opacity-60 disabled:opacity-40"
      style={{ color: '#1C1C1C' }}
    >
      <span className="text-base">{wished ? '♥' : '♡'}</span>
      {wished ? '위시리스트에서 제거' : '위시리스트에 추가'}
    </button>
  )
}
