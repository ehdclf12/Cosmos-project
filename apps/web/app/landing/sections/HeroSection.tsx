import Image from 'next/image'
import type { HeroContent } from '../content'

interface Props {
  content: HeroContent
}

export default function HeroSection({ content }: Props) {
  return (
    <section className="relative w-full" style={{ height: '100svh', marginTop: '56px' }}>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: '#C8C5BC' }}
      >
        {content.imageSrc && (
          <Image
            src={content.imageSrc}
            alt={content.imageAlt}
            fill
            priority
            className="object-cover"
          />
        )}
      </div>
    </section>
  )
}
