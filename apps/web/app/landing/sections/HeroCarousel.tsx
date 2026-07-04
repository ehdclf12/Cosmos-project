'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { HeroContent } from '@cosmos/shared'

export default function HeroCarousel({ content }: { content: HeroContent }) {
  const { images, intervalMs } = content
  const count = images.length
  const [idx, setIdx] = useState(0)
  const [tick, setTick] = useState(0) // 수동 조작 시 자동 슬라이드 타이머 재시작용
  const [touchX, setTouchX] = useState<number | null>(null)

  useEffect(() => {
    if (count <= 1) return
    const t = setInterval(
      () => setIdx((i) => (i + 1) % count),
      Math.max(1000, intervalMs)
    )
    return () => clearInterval(t)
  }, [count, intervalMs, tick])

  function go(i: number) {
    setIdx((i + count) % count)
    setTick((t) => t + 1) // 수동 이동 후 자동 카운트다운 리셋
  }

  function onTouchStart(e: React.TouchEvent) {
    setTouchX(e.touches[0].clientX)
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX === null) return
    const dx = e.changedTouches[0].clientX - touchX
    if (Math.abs(dx) > 40) {
      if (dx < 0) go(idx + 1)
      else go(idx - 1)
    }
    setTouchX(null)
  }

  return (
    <div
      className="absolute inset-0 select-none"
      style={{ backgroundColor: '#C8C5BC' }}
      onTouchStart={count > 1 ? onTouchStart : undefined}
      onTouchEnd={count > 1 ? onTouchEnd : undefined}
    >
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

      {count > 1 && (
        <>
          {/* 좌 화살표 */}
          <button
            onClick={() => go(idx - 1)}
            aria-label="이전 슬라이드"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.75)' }}
          >
            <span style={{ color: '#1C1C1C', fontSize: 20, lineHeight: 1 }}>‹</span>
          </button>

          {/* 우 화살표 */}
          <button
            onClick={() => go(idx + 1)}
            aria-label="다음 슬라이드"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.75)' }}
          >
            <span style={{ color: '#1C1C1C', fontSize: 20, lineHeight: 1 }}>›</span>
          </button>

          {/* 하단 dot indicator */}
          <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`슬라이드 ${i + 1}`}
                className="h-2 rounded-full transition-all"
                style={{
                  width: i === idx ? 22 : 8,
                  backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.55)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
