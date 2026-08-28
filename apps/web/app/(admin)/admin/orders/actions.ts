'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { isAdmin, FORBIDDEN } from '@/lib/require-admin'

// 셀렉트에서 고를 수 있는 상태. '배송중'은 shipOrder(송장 입력)로만 진입한다.
const ALLOWED_STATUSES = ['paid', 'preparing', 'delivered', 'cancelled']

export async function updateOrderStatus(orderId: string, newStatus: string) {
  if (!(await isAdmin())) return FORBIDDEN
  if (!ALLOWED_STATUSES.includes(newStatus)) return { error: '유효하지 않은 주문 상태입니다.' }

  const admin = createAdminClient()

  // 상태만 변경한다. 재고 처리는 restore_stock_on_cancel 트리거가 담당:
  //   → cancelled : active 아이템 재고 복원 (개별취소된 아이템은 이미 복원돼 제외)
  //   cancelled → : active 아이템 재고 재차감 (취소 되돌리기)
  // 아이템 status를 앱에서 건드리지 않으므로 고객 취소 경로와 동작이 통일되고,
  // 되돌리기 시에도 트리거가 대칭적으로 재차감한다.
  const { error } = await admin.from('orders').update({ status: newStatus }).eq('id', orderId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
  return { success: true }
}
