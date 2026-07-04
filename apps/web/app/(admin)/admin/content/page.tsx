import type { Metadata } from 'next'
import { getDraftLandingContent } from '@/lib/landing-content'
import ContentEditor from './_components/ContentEditor'

export const metadata: Metadata = { title: '콘텐츠 관리 — Cosmos Admin' }
export const dynamic = 'force-dynamic'

export default async function AdminContentPage() {
  const content = await getDraftLandingContent()
  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>랜딩 콘텐츠 관리</h1>
      <ContentEditor initial={content} />
    </div>
  )
}
