import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingClient from '@/app/landing/LandingClient'
import CheckoutForm from './_components/CheckoutForm'
import { CartItem } from '@/lib/cart-store'

interface Props {
  searchParams: Promise<{ goodsId?: string }>
}

export default async function CheckoutPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { goodsId } = await searchParams
  let directItem: CartItem | null = null

  if (goodsId) {
    const { data } = await supabase
      .from('goods')
      .select('id, title, price, discount_rate, images')
      .eq('id', goodsId)
      .eq('status', 'active')
      .single()
    if (data) {
      const finalPrice = Math.round(data.price * (1 - (data.discount_rate ?? 0) / 100))
      directItem = {
        goodsId: data.id,
        title: data.title,
        price: finalPrice,
        imageUrl: data.images?.[0] ?? null,
        quantity: 1,
      }
    }
  }

  return (
    <>
      <LandingClient />
      <CheckoutForm userId={user.id} directItem={directItem} />
    </>
  )
}
