import type { Metadata } from 'next'

export const metadata: Metadata = { title: '독서클럽 관리 — Cosmos Admin' }

export default function AdminClubsPage() {
  return (
    <div>
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>독서클럽 관리</h1>
      <div
        className="rounded-2xl p-12 text-center"
        style={{ backgroundColor: '#E8E5E0' }}
      >
        <p className="text-sm" style={{ color: '#1C1C1C' }}>준비 중입니다.</p>
        <p className="text-xs mt-2" style={{ color: '#1C1C1C', opacity: 0.6 }}>
          클럽장 / 일반 멤버 권한 관리 기능이 추가될 예정입니다.
        </p>
      </div>
    </div>
  )
}
