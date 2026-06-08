import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GoodsCard from '@/app/goods/_components/GoodsCard'

export default async function WishlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('goods_wishlist')
    .select('goods:goods(id, title, description, price, original_price, images, status, categories(name, slug))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const goods = (rows ?? []).map((r) => r.goods).filter(Boolean)

  return (
    <div>
      <h2 className="text-xl font-light mb-8" style={{ color: '#1C1C1C' }}>찜한 상품</h2>
      {goods.length === 0 ? (
        <p className="text-sm" style={{ color: '#A8A49C' }}>찜한 상품이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {goods.map((item) => (
            <GoodsCard key={item!.id} item={item as any} />
          ))}
        </div>
      )}
    </div>
  )
}
