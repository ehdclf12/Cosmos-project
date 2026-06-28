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
