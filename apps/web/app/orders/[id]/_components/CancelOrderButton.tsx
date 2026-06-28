'use client'
import { useState } from 'react'
import { cancelOrder } from '../actions'

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCancel() {
    if (!confirm('주문을 취소하시겠습니까? 취소 후에는 되돌릴 수 없습니다.')) return
    setLoading(true)
    setError('')
    const result = await cancelOrder(orderId)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // 성공 시 revalidatePath로 페이지 자동 갱신
  }

  return (
    <div>
      <button
        onClick={handleCancel}
        disabled={loading}
        className="w-full py-3 text-center text-sm border transition-colors hover:bg-red-50 disabled:opacity-50"
        style={{ borderColor: '#E8E5E0', color: '#6B6862' }}
      >
        {loading ? '취소 처리 중...' : '주문 취소'}
      </button>
      {error && <p className="mt-2 text-xs text-center text-red-500">{error}</p>}
    </div>
  )
}
