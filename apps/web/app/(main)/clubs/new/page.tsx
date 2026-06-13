import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Coming Soon — Cosmos',
}

export default function NewClubPage() {
  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center"
      style={{ color: '#1C1C1C' }}
    >
      <span
        className="text-xs tracking-widest uppercase mb-6 block"
        style={{ color: '#A8A49C' }}
      >
        독서 클럽
      </span>
      <h1
        className="text-4xl font-light tracking-widest"
        style={{ color: '#1C1C1C' }}
      >
        COMING SOON
      </h1>
      <p
        className="mt-4 text-sm"
        style={{ color: '#6B6862' }}
      >
        독서 클럽 기능을 준비 중이에요.
      </p>
      <Link
        href="/"
        className="mt-10 text-xs tracking-widest uppercase underline-offset-4 hover:underline"
        style={{ color: '#6B6862' }}
      >
        ← Back
      </Link>
    </div>
  )
}
