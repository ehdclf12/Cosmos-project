import { withDefaults, DEFAULT_LANDING_CONTENT } from '../landing'

describe('withDefaults', () => {
  it('빈 입력이면 기본값을 반환', () => {
    expect(withDefaults({})).toEqual(DEFAULT_LANDING_CONTENT)
    expect(withDefaults(null)).toEqual(DEFAULT_LANDING_CONTENT)
    expect(withDefaults(undefined)).toEqual(DEFAULT_LANDING_CONTENT)
  })

  it('구형 Hero(단일 imageSrc)를 images 배열로 변환', () => {
    const r = withDefaults({ hero: { imageSrc: '/a.png', imageAlt: 'A' } })
    expect(r.hero.images).toEqual([{ src: '/a.png', alt: 'A' }])
    expect(r.hero.intervalMs).toBe(5000)
  })

  it('Hero images/intervalMs를 보존', () => {
    const r = withDefaults({ hero: { images: [{ src: '/x.png', alt: 'X' }, { src: '/y.png', alt: 'Y' }], intervalMs: 3000 } })
    expect(r.hero.images).toHaveLength(2)
    expect(r.hero.intervalMs).toBe(3000)
  })

  it('Hero images가 비어있으면 기본 이미지로 대체', () => {
    const r = withDefaults({ hero: { images: [], intervalMs: 2000 } })
    expect(r.hero.images).toEqual(DEFAULT_LANDING_CONTENT.hero.images)
  })

  it('intervalMs가 유효하지 않으면 5000', () => {
    expect(withDefaults({ hero: { images: [{ src: '/x.png', alt: '' }], intervalMs: 0 } }).hero.intervalMs).toBe(5000)
    expect(withDefaults({ hero: { images: [{ src: '/x.png', alt: '' }] } }).hero.intervalMs).toBe(5000)
  })

  it('section1.featured의 부분 필드를 기본값과 병합', () => {
    const r = withDefaults({ section1: { featured: { title: '새 제목' } } })
    expect(r.section1.featured.title).toBe('새 제목')
    expect(r.section1.featured.category).toBe(DEFAULT_LANDING_CONTENT.section1.featured.category)
  })

  it('빈 grid/items는 기본값으로 대체', () => {
    const r = withDefaults({ section1: { grid: [] }, section2: { items: [] } })
    expect(r.section1.grid).toEqual(DEFAULT_LANDING_CONTENT.section1.grid)
    expect(r.section2.items).toEqual(DEFAULT_LANDING_CONTENT.section2.items)
  })

  it('section3 부분 필드 병합', () => {
    const r = withDefaults({ section3: { headline: 'HELLO' } })
    expect(r.section3.headline).toBe('HELLO')
    expect(r.section3.imageSrc).toBe(DEFAULT_LANDING_CONTENT.section3.imageSrc)
  })
})
