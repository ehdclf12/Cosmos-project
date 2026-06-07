import Image from 'next/image'
import type { BannerContent } from '../content'

interface Props {
  content: BannerContent
}

export default function BannerSection({ content }: Props) {
  return (
    <section
      className="relative w-full flex items-center justify-center"
      style={{ height: '480px', backgroundColor: '#C8C5BC' }}
    >
      {content.imageSrc && (
        <Image
          src={content.imageSrc}
          alt={content.imageAlt}
          fill
          className="object-cover"
        />
      )}
      {/* Dark overlay — only when an image is present */}
      {content.imageSrc && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(28,28,28,0.4)' }}
        />
      )}
      {/* Text */}
      <div className="relative z-10 text-center px-6">
        <h2
          className="text-3xl md:text-5xl font-light tracking-wide mb-4"
          style={{ color: content.imageSrc ? '#F2F1EE' : '#1C1C1C' }}
        >
          {content.headline}
        </h2>
        <p className="text-sm tracking-widest" style={{ color: content.imageSrc ? '#C8C5BC' : '#6B6862' }}>
          {content.sub}
        </p>
      </div>
    </section>
  )
}
