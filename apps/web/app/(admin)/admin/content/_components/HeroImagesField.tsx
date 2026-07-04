'use client'
import { useState } from 'react'
import Image from 'next/image'
import type { HeroContent } from '@cosmos/shared'
import { uploadLandingImage } from './upload'

interface Props {
  value: HeroContent
  onChange: (updater: (prev: HeroContent) => HeroContent) => void
}

export default function HeroImagesField({ value, onChange }: Props) {
  const [busy, setBusy] = useState(false)

  async function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const url = await uploadLandingImage(file)
      onChange((prev) => ({ ...prev, images: [...prev.images, { src: url, alt: '' }] }))
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setBusy(false)
    }
  }

  function setAlt(i: number, alt: string) {
    onChange((prev) => ({ ...prev, images: prev.images.map((im, j) => (j === i ? { ...im, alt } : im)) }))
  }
  function remove(i: number) {
    onChange((prev) => ({ ...prev, images: prev.images.filter((_, j) => j !== i) }))
  }
  function move(i: number, dir: -1 | 1) {
    onChange((prev) => {
      const j = i + dir
      if (j < 0 || j >= prev.images.length) return prev
      const arr = [...prev.images]
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...prev, images: arr }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs" style={{ color: '#6B6862' }}>슬라이드 속도(초)</label>
        <input
          type="number"
          min={1}
          step={0.5}
          value={value.intervalMs / 1000}
          onChange={(e) => onChange((prev) => ({ ...prev, intervalMs: Math.max(1, Number(e.target.value) || 1) * 1000 }))}
          className="w-20 border rounded px-2 py-1 text-sm bg-white"
          style={{ borderColor: '#E8E5E0', color: '#1C1C1C' }}
        />
      </div>

      {value.images.map((im, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg p-2" style={{ backgroundColor: '#E8E5E0' }}>
          <div className="relative w-16 h-16 rounded overflow-hidden shrink-0" style={{ backgroundColor: '#C8C5BC' }}>
            {im.src && <Image src={im.src} alt="" fill className="object-cover" />}
          </div>
          <input
            value={im.alt}
            onChange={(e) => setAlt(i, e.target.value)}
            placeholder="설명(alt)"
            className="flex-1 border rounded px-2 py-1 text-sm bg-white"
            style={{ borderColor: '#E8E5E0', color: '#1C1C1C' }}
          />
          <button type="button" onClick={() => move(i, -1)} className="text-xs px-1" style={{ color: '#6B6862' }}>▲</button>
          <button type="button" onClick={() => move(i, 1)} className="text-xs px-1" style={{ color: '#6B6862' }}>▼</button>
          <button type="button" onClick={() => remove(i)} className="text-xs px-2" style={{ color: '#dc2626' }}>삭제</button>
        </div>
      ))}

      <label className="inline-block text-xs px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}>
        {busy ? '업로드 중...' : '+ 이미지 추가'} (권장 1920×1080)
        <input type="file" accept="image/*" hidden onChange={addImage} disabled={busy} />
      </label>
    </div>
  )
}
