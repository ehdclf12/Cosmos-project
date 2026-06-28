'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin-client'

export async function adminCancelOrderItem(orderId: string, itemId: string) {
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
