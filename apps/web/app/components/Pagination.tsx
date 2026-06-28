import Link from 'next/link'

interface Props {
  page: number
  totalCount: number
  pageSize?: number
  searchParams: Record<string, string>
}

export default function Pagination({ page, totalCount, pageSize = 20, searchParams }: Props) {
  const totalPages = Math.ceil(totalCount / pageSize)
  if (totalPages <= 1) return null

  function pageHref(p: number) {
    const params = new URLSearchParams({ ...searchParams, page: String(p) })
    return `?${params.toString()}`
  }

  const pages: (number | '...')[] = []
  const delta = 2
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6 text-sm">
      {page > 1 && (
        <Link
          href={pageHref(page - 1)}
          className="px-3 py-1.5 rounded-lg hover:opacity-70"
          style={{ color: '#1C1C1C' }}
        >
          ← 이전
        </Link>
      )}
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-2" style={{ color: '#1C1C1C', opacity: 0.4 }}>
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={pageHref(p as number)}
            className="px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: p === page ? '#1C1C1C' : 'transparent',
              color: p === page ? 'white' : '#1C1C1C',
            }}
          >
            {p}
          </Link>
        )
      )}
      {page < totalPages && (
        <Link
          href={pageHref(page + 1)}
          className="px-3 py-1.5 rounded-lg hover:opacity-70"
          style={{ color: '#1C1C1C' }}
        >
          다음 →
        </Link>
      )}
    </div>
  )
}
