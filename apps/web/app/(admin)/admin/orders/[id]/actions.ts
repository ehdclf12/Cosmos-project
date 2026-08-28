'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { COURIERS } from '@cosmos/shared'
import { isAdmin, FORBIDDEN } from '@/lib/require-admin'

export async function adminCancelOrderItem(orderId: string, itemId: string) {
  if (!(await isAdmin())) return FORBIDDEN
  const admin = createAdminClient()

  // atomic UPDATE: status='active'인 경우에만 취소 처리 (이중 취소 방지)
  const { data: updated, error: updateError } = await admin
    .from('order_items')
    .update({ status: 'cancelled' })
    .eq('id', itemId)
    .eq('order_id', orderId)
    .eq('status', 'active')
    .select('goods_id, quantity')

  if (updateError) return { error: updateError.message }
  if (!updated || updated.length === 0) return { error: '이미 취소된 상품입니다.' }

  // UPDATE 성공한 경우에만 재고 복원
  await admin.rpc('restore_stock', {
    p_goods_id: updated[0].goods_id,
    p_quantity: updated[0].quantity,
  })

  // 남은 active 아이템 확인 → 전부 취소됐으면 주문 전체 취소
  const { data: remaining } = await admin
    .from('order_items')
    .select('id')
    .eq('order_id', orderId)
    .eq('status', 'active')

  if (!remaining || remaining.length === 0) {
    await admin.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
  }

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
  return { success: true }
}

export async function shipOrder(
  orderId: string,
  courier: string,
  trackingNumber: string
): Promise<{ error?: string }> {
  if (!(await isAdmin())) return FORBIDDEN
  if (!courier.trim() || !trackingNumber.trim()) {
    return { error: '택배사와 송장번호를 입력해주세요.' }
  }
  if (!COURIERS.some((c) => c.code === courier.trim())) {
    return { error: '유효한 택배사를 선택해주세요.' }
  }
  const admin = createAdminClient()
  // 결제완료/상품준비중에서만 발송 처리한다 (취소·배송완료 주문의 되살아남 방지)
  const { data: updated, error } = await admin
    .from('orders')
    .update({ status: 'shipping', courier: courier.trim(), tracking_number: trackingNumber.trim() })
    .eq('id', orderId)
    .in('status', ['paid', 'preparing'])
    .select('id')
  if (error) return { error: error.message }
  if (!updated || updated.length === 0) {
    return { error: '발송 처리할 수 있는 상태의 주문이 아닙니다.' }
  }
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
  return {}
}

export async function updateTracking(
  orderId: string,
  courier: string,
  trackingNumber: string
): Promise<{ error?: string }> {
  if (!(await isAdmin())) return FORBIDDEN
  if (!courier.trim() || !trackingNumber.trim()) {
    return { error: '택배사와 송장번호를 입력해주세요.' }
  }
  if (!COURIERS.some((c) => c.code === courier.trim())) {
    return { error: '유효한 택배사를 선택해주세요.' }
  }
  const admin = createAdminClient()
  const { error } = await admin
    .from('orders')
    .update({ courier: courier.trim(), tracking_number: trackingNumber.trim() })
    .eq('id', orderId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/orders/${orderId}`)
  return {}
}
