import Image from 'next/image'
import type { GridCardContent } from '../content'

interface Props {
  content: {
    items: GridCardContent[]
  }
}

export default function GridSection({ content }: Props) {
  return (
    <section
      className="px-6 md:px-12 py-16 border-t"
      style={{ borderColor: '#E8E5E0' }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {content.items.map((item, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div
              className="relative w-full aspect-[3/2] overflow-hidden"
              style={{ backgroundColor: '#C8C5BC' }}
            >
              {item.imageSrc && (
                <Image
                  src={item.imageSrc}
                  alt={item.imageAlt}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: '#A8A49C' }}
            >
              {item.category}
            </p>
            <h3 className="text-base font-light" style={{ color: '#1C1C1C' }}>
              {item.title}
            </h3>
          </div>
        ))}
      </div>
    </section>
  )
}
