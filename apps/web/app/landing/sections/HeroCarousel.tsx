'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { HeroContent } from '@cosmos/shared'

export default function HeroCarousel({ content }: { content: HeroContent }) {
  const { images, intervalMs } = content
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const t = setInterval(
      () => setIdx((i) => (i + 1) % images.length),
      Math.max(1000, intervalMs)
    )
    return () => clearInterval(t)
  }, [images.length, intervalMs])

  return (
    <div className="absolute inset-0" style={{ backgroundColor: '#C8C5BC' }}>
      {images.map((img, i) => (
        <Image
          key={`${img.src}-${i}`}
          src={img.src}
          alt={img.alt}
          fill
          priority={i === 0}
          className="object-cover transition-opacity duration-1000"
          style={{ opacity: i === idx ? 1 : 0 }}
        />
      ))}
    </div>
  )
}
