'use client'
import { useState } from 'react'
import type { LandingContent } from '@cosmos/shared'
import { saveDraft, publish } from '../actions'
import HeroImagesField from './HeroImagesField'
import SlotImageField from './SlotImageField'

const inputCls = 'w-full border rounded px-2 py-1.5 text-sm bg-white text-[#1C1C1C] placeholder:text-[#A8A49C]'
const cardCls = 'rounded-2xl p-5 space-y-3'
const cardStyle = { backgroundColor: '#F5F4F1', border: '1px solid #E8E5E0' } as const

export default function ContentEditor({ initial }: { initial: LandingContent }) {
  const [content, setContent] = useState<LandingContent>(initial)
  const [status, setStatus] = useState('')
  const [previewKey, setPreviewKey] = useState(0)
  const [showPreview, setShowPreview] = useState(true)

  async function onSaveDraft() {
    setStatus('저장 중...')
    const r = await saveDraft(content)
    if (r.error) return setStatus('오류: ' + r.error)
    setStatus('초안 저장됨 ✓')
    setPreviewKey((k) => k + 1)
  }

  async function onPublish() {
    if (content.hero.images.length === 0) return setStatus('Hero 이미지를 최소 1장 등록하세요.')
    setStatus('발행 중...')
    const s = await saveDraft(content)
    if (s.error) return setStatus('오류: ' + s.error)
    const r = await publish()
    if (r.error) return setStatus('오류: ' + r.error)
    setStatus('발행 완료 ✓')
    setPreviewKey((k) => k + 1)
  }

  const s1 = content.section1
  const s2 = content.section2
  const s3 = content.section3

  return (
    <div className="flex gap-6">
      {/* 편집 폼 */}
      <div className="flex-1 space-y-6 max-w-2xl">
        {/* 액션 바 */}
        <div className="flex items-center gap-2 sticky top-0 py-2" style={{ backgroundColor: '#F2F1EE' }}>
          <button onClick={onSaveDraft} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}>초안 저장</button>
          <button onClick={() => { setShowPreview((v) => !v); setPreviewKey((k) => k + 1) }} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}>
            {showPreview ? '미리보기 숨기기' : '미리보기'}
          </button>
          <button onClick={onPublish} className="px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>발행</button>
          {status && <span className="text-xs" style={{ color: '#6B6862' }}>{status}</span>}
        </div>

        {/* Hero */}
        <div className={cardCls} style={cardStyle}>
          <h3 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>메인 (Hero 슬라이드)</h3>
          <HeroImagesField value={content.hero} onChange={(fn) => setContent((c) => ({ ...c, hero: fn(c.hero) }))} />
        </div>

        {/* Section1 - Featured */}
        <div className={cardCls} style={cardStyle}>
          <h3 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>섹션1 · 대표</h3>
          <SlotImageField label="대표 이미지" recommended="1200×900" src={s1.featured.imageSrc}
            onChange={(src) => setContent((c) => ({ ...c, section1: { ...c.section1, featured: { ...c.section1.featured, imageSrc: src } } }))} />
          <input className={inputCls} placeholder="카테고리" value={s1.featured.category}
            onChange={(e) => setContent((c) => ({ ...c, section1: { ...c.section1, featured: { ...c.section1.featured, category: e.target.value } } }))} />
          <input className={inputCls} placeholder="제목" value={s1.featured.title}
            onChange={(e) => setContent((c) => ({ ...c, section1: { ...c.section1, featured: { ...c.section1.featured, title: e.target.value } } }))} />
          <textarea className={inputCls} placeholder="본문" value={s1.featured.body}
            onChange={(e) => setContent((c) => ({ ...c, section1: { ...c.section1, featured: { ...c.section1.featured, body: e.target.value } } }))} />
          <input className={inputCls} placeholder="이미지 설명(alt)" value={s1.featured.imageAlt}
            onChange={(e) => setContent((c) => ({ ...c, section1: { ...c.section1, featured: { ...c.section1.featured, imageAlt: e.target.value } } }))} />
        </div>

        {/* Section1 - Grid (4) */}
        <div className={cardCls} style={cardStyle}>
          <h3 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>섹션1 · 그리드 (4)</h3>
          {s1.grid.map((item, i) => (
            <div key={i} className="space-y-2 pb-3 border-b" style={{ borderColor: '#E8E5E0' }}>
              <SlotImageField label={`그리드 ${i + 1}`} recommended="600×600" src={item.imageSrc}
                onChange={(src) => setContent((c) => ({ ...c, section1: { ...c.section1, grid: c.section1.grid.map((g, j) => (j === i ? { ...g, imageSrc: src } : g)) } }))} />
              <input className={inputCls} placeholder="제목" value={item.title}
                onChange={(e) => setContent((c) => ({ ...c, section1: { ...c.section1, grid: c.section1.grid.map((g, j) => (j === i ? { ...g, title: e.target.value } : g)) } }))} />
              <input className={inputCls} placeholder="이미지 설명(alt)" value={item.imageAlt}
                onChange={(e) => setContent((c) => ({ ...c, section1: { ...c.section1, grid: c.section1.grid.map((g, j) => (j === i ? { ...g, imageAlt: e.target.value } : g)) } }))} />
            </div>
          ))}
        </div>

        {/* Section2 - Cards (3) */}
        <div className={cardCls} style={cardStyle}>
          <h3 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>섹션2 · 카드 (3)</h3>
          {s2.items.map((item, i) => (
            <div key={i} className="space-y-2 pb-3 border-b" style={{ borderColor: '#E8E5E0' }}>
              <SlotImageField label={`카드 ${i + 1}`} recommended="800×1000" src={item.imageSrc}
                onChange={(src) => setContent((c) => ({ ...c, section2: { items: c.section2.items.map((g, j) => (j === i ? { ...g, imageSrc: src } : g)) } }))} />
              <input className={inputCls} placeholder="카테고리" value={item.category}
                onChange={(e) => setContent((c) => ({ ...c, section2: { items: c.section2.items.map((g, j) => (j === i ? { ...g, category: e.target.value } : g)) } }))} />
              <input className={inputCls} placeholder="제목" value={item.title}
                onChange={(e) => setContent((c) => ({ ...c, section2: { items: c.section2.items.map((g, j) => (j === i ? { ...g, title: e.target.value } : g)) } }))} />
              <input className={inputCls} placeholder="이미지 설명(alt)" value={item.imageAlt}
                onChange={(e) => setContent((c) => ({ ...c, section2: { items: c.section2.items.map((g, j) => (j === i ? { ...g, imageAlt: e.target.value } : g)) } }))} />
            </div>
          ))}
        </div>

        {/* Section3 - Banner */}
        <div className={cardCls} style={cardStyle}>
          <h3 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>섹션3 · 배너</h3>
          <SlotImageField label="배너 이미지" recommended="1920×800" src={s3.imageSrc}
            onChange={(src) => setContent((c) => ({ ...c, section3: { ...c.section3, imageSrc: src } }))} />
          <input className={inputCls} placeholder="헤드라인" value={s3.headline}
            onChange={(e) => setContent((c) => ({ ...c, section3: { ...c.section3, headline: e.target.value } }))} />
          <input className={inputCls} placeholder="서브텍스트" value={s3.sub}
            onChange={(e) => setContent((c) => ({ ...c, section3: { ...c.section3, sub: e.target.value } }))} />
          <input className={inputCls} placeholder="이미지 설명(alt)" value={s3.imageAlt}
            onChange={(e) => setContent((c) => ({ ...c, section3: { ...c.section3, imageAlt: e.target.value } }))} />
        </div>
      </div>

      {/* 미리보기 */}
      {showPreview && (
        <div className="w-[420px] shrink-0 sticky top-2 self-start">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: '#6B6862' }}>미리보기 (초안)</span>
            <a href="/?preview=1" target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: '#1C1C1C' }}>새 탭에서 열기</a>
          </div>
          <iframe
            key={previewKey}
            src={`/?preview=1&t=${previewKey}`}
            className="w-full rounded-lg"
            style={{ height: 620, border: '1px solid #E8E5E0', backgroundColor: 'white' }}
          />
          <p className="text-xs mt-2" style={{ color: '#A8A49C' }}>* 미리보기는 &apos;초안 저장&apos; 후 갱신됩니다.</p>
        </div>
      )}
    </div>
  )
}
