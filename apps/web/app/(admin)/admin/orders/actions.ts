'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin-client'

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const admin = createAdminClient()

  if (newStatus === 'cancelled') {
    // 취소 시: active 아이템을 먼저 모두 취소 처리 (재고 복원 포함)
    // → 이후 order.status 변경 시 트리거가 복원할 active 아이템이 0개가 됨
    const { data: activeItems } = await admin
      .from('order_items')
      .select('goods_id, quantity')
      .eq('order_id', orderId)
      .eq('status', 'active')

    if (activeItems && activeItems.length > 0) {
      // atomic: active인 아이템만 cancelled로 변경
      await admin
        .from('order_items')
        .update({ status: 'cancelled' })
        .eq('order_id', orderId)
        .eq('status', 'active')

      // 각 아이템 재고 복원 (개별 취소된 아이템은 이미 제외됨)
      await Promise.all(
        activeItems.map((item) =>
          admin.rpc('restore_stock', { p_goods_id: item.goods_id, p_quantity: item.quantity })
        )
      )
    }
  }

  // order status 변경 (취소 시 트리거는 active 아이템 0개 → 추가 복원 없음)
  const { error } = await admin.from('orders').update({ status: newStatus }).eq('id', orderId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
  return { success: true }
}
