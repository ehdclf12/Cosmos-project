'use client'
import { useState } from 'react'
import Image from 'next/image'

interface Props {
  images: string[]
  title: string
}

export default function GoodsImageSlider({ images, title }: Props) {
  const [current, setCurrent] = useState(0)

  if (images.length === 0) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: '#E8E5E0', minHeight: '60vh' }}
      >
        <span className="text-xs" style={{ color: '#1C1C1C' }}>No Image</span>
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <div className="relative w-full" style={{ minHeight: '60vh' }}>
        <Image src={images[0]} alt={title} fill className="object-cover" priority />
      </div>
    )
  }

  return (
    <div className="relative w-full select-none" style={{ minHeight: '60vh' }}>
      <div className="relative w-full h-full" style={{ minHeight: '60vh' }}>
        <Image
          src={images[current]}
          alt={`${title} ${current + 1}`}
          fill
          className="object-cover"
          priority={current === 0}
        />
      </div>

      {/* 좌 화살표 */}
      <button
        onClick={() => setCurrent((p) => (p - 1 + images.length) % images.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
        aria-label="이전 이미지"
      >
        <span style={{ color: '#1C1C1C', fontSize: 16 }}>‹</span>
      </button>

      {/* 우 화살표 */}
      <button
        onClick={() => setCurrent((p) => (p + 1) % images.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
        aria-label="다음 이미지"
      >
        <span style={{ color: '#1C1C1C', fontSize: 16 }}>›</span>
      </button>

      {/* 하단 dot indicator */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="w-1.5 h-1.5 rounded-full transition-colors"
            style={{ backgroundColor: i === current ? '#1C1C1C' : 'rgba(28,28,28,0.3)' }}
            aria-label={`이미지 ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
