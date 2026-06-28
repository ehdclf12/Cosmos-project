'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/cart-store'

interface Props {
  goodsId: string
  title: string
  price: number
  imageUrl: string | null
}

export default function AddToCartButton({ goodsId, title, price, imageUrl }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)
  const router = useRouter()

  function handleAdd() {
    addItem({ goodsId, title, price, imageUrl })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleAdd}
        className="w-full py-3 text-sm tracking-wide text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#1C1C1C' }}
      >
        {added ? '담겼습니다 ✓' : '장바구니 담기'}
      </button>
      <button
        onClick={() => router.push(`/checkout?goodsId=${goodsId}`)}
        className="w-full py-3 text-sm tracking-wide border transition-colors hover:bg-black hover:text-white"
        style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
      >
        결제하기
      </button>
    </div>
  )
}
