'use client'
import { useState } from 'react'
import Image from 'next/image'
import { uploadLandingImage } from './upload'

interface Props {
  label: string
  recommended: string
  src: string
  onChange: (url: string) => void
}

export default function SlotImageField({ label, recommended, src, onChange }: Props) {
  const [busy, setBusy] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      onChange(await uploadLandingImage(file))
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: '#6B6862' }}>
        {label} <span style={{ color: '#A8A49C' }}>(권장 {recommended})</span>
      </label>
      <div className="flex items-center gap-3">
        <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: '#E8E5E0' }}>
          {src && <Image src={src} alt="" fill className="object-cover" />}
        </div>
        <label className="text-xs px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}>
          {busy ? '업로드 중...' : '이미지 변경'}
          <input type="file" accept="image/*" hidden onChange={handleFile} disabled={busy} />
        </label>
      </div>
    </div>
  )
}
