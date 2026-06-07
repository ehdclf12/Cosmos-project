import Link from 'next/link'

export default function ComingSoonPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: '#F2F1EE' }}
    >
      <p
        className="text-xs tracking-widest uppercase mb-6"
        style={{ color: '#A8A49C' }}
      >
        Cosmos
      </p>
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
        This section is currently being prepared.
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
