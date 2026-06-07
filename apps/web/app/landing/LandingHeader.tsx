import Link from 'next/link'

interface Props {
  onMenuClick: () => void
}

export default function LandingHeader({ onMenuClick }: Props) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14"
      style={{ backgroundColor: '#F2F1EE' }}
    >
      {/* Left: hamburger + wordmark */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex flex-col gap-1.5 p-1"
          style={{ color: '#1C1C1C' }}
        >
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
        </button>
        <Link
          href="/"
          className="text-sm font-light tracking-widest"
          style={{ color: '#1C1C1C' }}
        >
          COSMOS
        </Link>
      </div>

      {/* Right: auth buttons */}
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-xs tracking-widest uppercase px-4 py-2 border transition-colors hover:bg-black hover:text-white"
          style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
        >
          Log In
        </Link>
        <Link
          href="/register"
          className="text-xs tracking-widest uppercase px-4 py-2 text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          Sign Up
        </Link>
      </div>
    </header>
  )
}
