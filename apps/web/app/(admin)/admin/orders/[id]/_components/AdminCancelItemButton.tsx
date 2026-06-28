'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminCancelOrderItem } from '../actions'

interface Props {
  orderId: string
  itemId: string
  itemTitle: string
}

export default function AdminCancelItemButton({ orderId, itemId, itemTitle }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCancel() {
    if (!confirm(`"${itemTitle}" 상품을 취소하시겠습니까?`)) return
    setLoading(true)
    setError('')
    const result = await adminCancelOrderItem(orderId, itemId)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.refresh()
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={handleCancel}
        disabled={loading}
        className="text-xs px-2 py-0.5 border rounded transition-colors hover:bg-red-50 disabled:opacity-50"
        style={{ borderColor: '#E8E5E0', color: '#A8A49C' }}
      >
        {loading ? '처리중' : '취소'}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
