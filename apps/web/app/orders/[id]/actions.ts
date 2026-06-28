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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  // 주문 소유권 + 상태 확인
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

  // status='active' 조건 포함 atomic UPDATE — 동시 요청 시 한 번만 성공
  const { data: updated, error: updateError } = await supabase
    .from('order_items')
    .update({ status: 'cancelled' })
    .eq('id', itemId)
    .eq('order_id', orderId)
    .eq('status', 'active')
    .select('goods_id, quantity')

  if (updateError) return { error: updateError.message }
  if (!updated || updated.length === 0) return { error: '이미 취소된 상품입니다.' }

  // UPDATE 성공한 경우에만 재고 복원 (이중 복원 방지)
  await supabase.rpc('restore_stock', { p_goods_id: updated[0].goods_id, p_quantity: updated[0].quantity })

  // 모든 아이템이 취소됐으면 주문 전체 취소 처리
  const { data: remaining } = await supabase
    .from('order_items')
    .select('id')
    .eq('order_id', orderId)
    .eq('status', 'active')

  if (!remaining || remaining.length === 0) {
    // 트리거가 active 아이템만 복원하므로 이 시점엔 이미 모두 처리됨 → status만 변경
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
  }

  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/mypage/orders')
  return { success: true }
}
