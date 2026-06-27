import Link from 'next/link'

interface Category {
  id: string
  name: string
  slug: string
}

interface Props {
  categories: Category[]
  activeSlug: string | null
}

export default function CategoryFilter({ categories, activeSlug }: Props) {
  const items = [{ id: 'all', name: 'All', slug: '' }, ...categories]

  return (
    <div className="flex gap-6 mb-10">
      {items.map((cat) => {
        const isActive = cat.slug === '' ? !activeSlug : activeSlug === cat.slug
        return (
          <Link
            key={cat.id}
            href={cat.slug ? `/goods?category=${cat.slug}` : '/goods'}
            className="text-xs tracking-widest uppercase pb-0.5 transition-colors"
            style={{
              color: isActive ? '#1C1C1C' : '#1C1C1C',
              borderBottom: isActive ? '1px solid #1C1C1C' : '1px solid transparent',
            }}
          >
            {cat.name}
          </Link>
        )
      })}
    </div>
  )
}
