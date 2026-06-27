import Link from 'next/link'
import Image from 'next/image'

export interface GoodsItem {
  id: string
  title: string
  description: string | null
  price: number
  discount_rate: number
  images: string[]
  status: 'active' | 'sold_out' | 'draft'
  categories: { name: string; slug: string } | null
}

interface Props {
  item: GoodsItem
}

export default function GoodsCard({ item }: Props) {
  const finalPrice = Math.round(item.price * (1 - (item.discount_rate ?? 0) / 100))

  return (
    <Link href={`/goods/${item.id}`} className="group block">
      <div className="relative w-full aspect-[3/4] overflow-hidden mb-3" style={{ backgroundColor: '#E8E5E0' }}>
        {item.images[0] ? (
          <Image
            src={item.images[0]}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#1C1C1C' }}>
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

      <div>
        {item.categories && (
          <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#1C1C1C' }}>
            {item.categories.name}
          </p>
        )}
        <p className="text-sm font-light mb-1.5 line-clamp-2" style={{ color: '#1C1C1C' }}>
          {item.title}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium" style={{ color: '#1C1C1C' }}>
            ₩{finalPrice.toLocaleString()}
          </span>
          {(item.discount_rate ?? 0) > 0 && (
            <>
              <span className="text-xs line-through" style={{ color: '#1C1C1C', opacity: 0.4 }}>
                ₩{item.price.toLocaleString()}
              </span>
              <span className="text-xs" style={{ color: '#1C1C1C' }}>
                {item.discount_rate}% OFF
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
