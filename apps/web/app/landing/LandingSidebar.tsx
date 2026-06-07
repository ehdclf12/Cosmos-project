import Link from 'next/link'

const NAV_ITEMS = [
  { label: 'New', href: '/coming-soon' },
  { label: 'Magazine', href: '/coming-soon' },
  { label: 'Books', href: '/coming-soon' },
  { label: 'Goods & Tickets', href: '/coming-soon' },
  { label: 'Newsletter', href: '/coming-soon' },
  { label: 'Index', href: '/coming-soon' },
  { label: 'Club', href: '/clubs' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function LandingSidebar({ open, onClose }: Props) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className="fixed top-0 left-0 h-full z-50 flex flex-col py-10 px-8 transition-transform duration-300"
        style={{
          width: '280px',
          backgroundColor: '#1C1C1C',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Close + wordmark */}
        <div className="flex items-center justify-between mb-12">
          <span
            className="text-sm font-light tracking-widest"
            style={{ color: '#F2F1EE' }}
          >
            COSMOS
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="text-lg leading-none"
            style={{ color: '#F2F1EE' }}
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-6">
          {NAV_ITEMS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              onClick={onClose}
              className="text-sm tracking-wide transition-opacity hover:opacity-60"
              style={{ color: '#F2F1EE' }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}
