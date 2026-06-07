import Image from 'next/image'
import type { FeaturedContent, GridItemContent } from '../content'

interface Props {
  content: {
    featured: FeaturedContent
    grid: GridItemContent[]
  }
}

function PlaceholderImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ backgroundColor: '#C8C5BC' }}
    >
      {src && <Image src={src} alt={alt} fill className="object-cover" />}
    </div>
  )
}

export default function EditorialSection({ content }: Props) {
  const { featured, grid } = content

  return (
    <section className="px-6 md:px-12 py-16">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Featured: 2/3 */}
        <div className="md:w-2/3 flex flex-col gap-4">
          <PlaceholderImage
            src={featured.imageSrc}
            alt={featured.imageAlt}
            className="w-full aspect-[4/3]"
          />
          <div>
            <p
              className="text-xs tracking-widest uppercase mb-2"
              style={{ color: '#A8A49C' }}
            >
              {featured.category}
            </p>
            <h2
              className="text-xl font-light mb-2"
              style={{ color: '#1C1C1C' }}
            >
              {featured.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#6B6862' }}>
              {featured.body}
            </p>
          </div>
        </div>

        {/* Grid: 1/3, 2×2 */}
        <div className="md:w-1/3 grid grid-cols-2 gap-4">
          {grid.map((item, i) => (
            <div key={i} className="flex flex-col gap-2">
              <PlaceholderImage
                src={item.imageSrc}
                alt={item.imageAlt}
                className="w-full aspect-square"
              />
              <p className="text-xs font-light" style={{ color: '#1C1C1C' }}>
                {item.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
