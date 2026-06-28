'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCartStore, CartItem } from '@/lib/cart-store'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
}

export default function CheckoutForm({ userId }: Props) {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const totalAmount = useCartStore((s) => s.totalAmount())
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)

  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && items.length === 0) router.replace('/goods')
  }, [items.length, loading, router])

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-black outline-none focus:border-gray-400 transition-colors'

  async function handleOrder() {
    setError('')
    if (!recipientName.trim()) { setError('수령인명을 입력해주세요.'); return }
    if (!recipientPhone.trim()) { setError('연락처를 입력해주세요.'); return }
    if (!shippingAddress.trim()) { setError('배송지를 입력해주세요.'); return }
    if (items.length === 0) { setError('장바구니가 비어있습니다.'); return }

    setLoading(true)
    const supabase = createClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status: 'paid',
        total_amount: totalAmount,
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        shipping_address: shippingAddress.trim(),
        memo: memo.trim() || null,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      setError('주문 처리 중 오류가 발생했습니다.')
      setLoading(false)
      return
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      items.map((item: CartItem) => ({
        order_id: order.id,
        goods_id: item.goodsId,
        title: item.title,
        price: item.price,
        image_url: item.imageUrl,
        quantity: item.quantity,
      }))
    )

    if (itemsError) {
      // MVP: compensating delete — production should use a DB transaction (RPC)
      await supabase.from('orders').delete().eq('id', order.id)
      setError('주문 항목 저장 중 오류가 발생했습니다.')
      setLoading(false)
      return
    }

    // 재고 차감 (security definer 함수 — 실패해도 주문은 유지)
    await Promise.all(
      items.map((item: CartItem) =>
        supabase.rpc('decrement_stock', { p_goods_id: item.goodsId, p_quantity: item.quantity })
      )
    )

    clear()
    router.push(`/orders/${order.id}`)
  }

  if (items.length === 0) return null

  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <main className="pt-20 px-6 md:px-12 pb-20 max-w-4xl mx-auto">
        <div className="py-10 border-b mb-10" style={{ borderColor: '#E8E5E0' }}>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#A8A49C' }}>Cosmos</p>
          <h1 className="text-2xl font-light tracking-widest" style={{ color: '#1C1C1C' }}>CHECKOUT</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-12">
          {/* 좌: 주문 폼 */}
          <div className="flex-1">
            <h2 className="text-sm tracking-widest uppercase mb-6" style={{ color: '#6B6862' }}>
              배송 정보
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>수령인명</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className={inputClass}
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>연락처</label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className={inputClass}
                  placeholder="010-0000-0000"
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>배송지</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className={inputClass}
                  placeholder="서울특별시 마포구 ..."
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>메모 (선택)</label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className={inputClass}
                  placeholder="배송 메모를 입력해주세요"
                />
              </div>
            </div>

            {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

            <button
              onClick={handleOrder}
              disabled={loading}
              className="w-full mt-8 py-4 text-sm tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#1C1C1C' }}
            >
              {loading ? '처리 중...' : `₩${totalAmount.toLocaleString()} 주문하기`}
            </button>
          </div>

          {/* 우: 장바구니 요약 */}
          <div className="w-full md:w-80">
            <h2 className="text-sm tracking-widest uppercase mb-6" style={{ color: '#6B6862' }}>
              주문 상품 ({items.length})
            </h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.goodsId} className="flex gap-3">
                  <div
                    className="relative w-16 h-20 shrink-0 overflow-hidden"
                    style={{ backgroundColor: '#E8E5E0' }}
                  >
                    {item.imageUrl && (
                      <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2 mb-1" style={{ color: '#1C1C1C' }}>{item.title}</p>
                    <p className="text-xs mb-2" style={{ color: '#6B6862' }}>
                      ₩{item.price.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.goodsId, item.quantity - 1)}
                        className="w-6 h-6 border flex items-center justify-center text-xs transition-colors hover:bg-black hover:text-white"
                        style={{ borderColor: '#E8E5E0', color: '#1C1C1C' }}
                      >
                        −
                      </button>
                      <span className="text-xs w-4 text-center" style={{ color: '#1C1C1C' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.goodsId, item.quantity + 1)}
                        className="w-6 h-6 border flex items-center justify-center text-xs transition-colors hover:bg-black hover:text-white"
                        style={{ borderColor: '#E8E5E0', color: '#1C1C1C' }}
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.goodsId)}
                        className="ml-2 text-xs transition-opacity hover:opacity-60"
                        style={{ color: '#A8A49C' }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t" style={{ borderColor: '#E8E5E0' }}>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#6B6862' }}>합계</span>
                <span className="text-base font-medium" style={{ color: '#1C1C1C' }}>
                  ₩{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
