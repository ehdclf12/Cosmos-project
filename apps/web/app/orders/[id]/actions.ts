'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function cancelOrder(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: order } = await supabase
    .from('orders')
    .select('status, user_id')
    .eq('id', orderId)
    .single()

  if (!order) return { error: '주문을 찾을 수 없습니다.' }
  if (order.user_id !== user.id) return { error: '권한이 없습니다.' }
  if (!['paid', 'preparing'].includes(order.status)) {
    return { error: '배송이 시작된 주문은 취소할 수 없습니다.' }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)

  if (error) return { error: error.message }

  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/mypage/orders')
  return { success: true }
}

export async function cancelOrderItem(orderId: string, itemId: string) {
  const supabase = await createClient()

  // 소유권 확인 + 상태 검증 + 아이템 취소 + 재고 복원을 단일 RPC(023)에서 원자 처리한다.
  // 예전처럼 restore_stock을 직접 호출하지 않는다 — 그 함수는 소유권 검사가 없어 앱 롤에서 회수했다.
  const { error } = await supabase.rpc('cancel_own_order_item', {
    p_order_id: orderId,
    p_item_id: itemId,
  })

  if (error) {
    const m = error.message
    if (/AUTH_REQUIRED/.test(m)) return { error: '로그인이 필요합니다.' }
    if (/ORDER_NOT_FOUND/.test(m)) return { error: '주문을 찾을 수 없습니다.' }
    if (/FORBIDDEN/.test(m)) return { error: '권한이 없습니다.' }
    if (/NOT_CANCELLABLE/.test(m)) return { error: '배송이 시작된 주문은 취소할 수 없습니다.' }
    if (/ALREADY_CANCELLED/.test(m)) return { error: '이미 취소된 상품입니다.' }
    return { error: '취소 처리 중 오류가 발생했습니다.' }
  }

  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/mypage/orders')
  return { success: true }
}
