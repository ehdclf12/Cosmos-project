import Link from 'next/link'
import Image from 'next/image'

export interface GoodsItem {
  id: string
  title: string
  description: string | null
  price: number
  original_price: number | null
  images: string[]
  status: 'available' | 'sold_out'
  categories: { name: string; slug: string } | null
}

interface Props {
  item: GoodsItem
}

export default function GoodsCard({ item }: Props) {
  const discount = item.original_price
    ? Math.round((1 - item.price / item.original_price) * 100)
    : null

  return (
    <Link href={`/goods/${item.id}`} className="group block">
      {/* 이미지 */}
      <div className="relative w-full aspect-[3/4] overflow-hidden mb-3" style={{ backgroundColor: '#E8E5E0' }}>
        {item.images[0] ? (
          <Image
            src={item.images[0]}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#A8A49C' }}>
            No Image
          </div>
        )}
        {item.status === 'sold_out' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(28,28,28,0.5)' }}>
            <span className="text-xs tracking-widest uppercase text-white border border-white px-3 py-1">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div>
        {item.categories && (
          <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#A8A49C' }}>
            {item.categories.name}
          </p>
        )}
        <p className="text-sm font-light mb-1.5 line-clamp-2" style={{ color: '#1C1C1C' }}>
          {item.title}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium" style={{ color: '#1C1C1C' }}>
            ₩{item.price.toLocaleString()}
          </span>
          {item.original_price && (
            <>
              <span className="text-xs line-through" style={{ color: '#A8A49C' }}>
                ₩{item.original_price.toLocaleString()}
              </span>
              <span className="text-xs" style={{ color: '#6B6862' }}>
                {discount}% OFF
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
