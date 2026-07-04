export interface HeroImage { src: string; alt: string }
export interface HeroContent { images: HeroImage[]; intervalMs: number }
export interface FeaturedContent { imageSrc: string; imageAlt: string; category: string; title: string; body: string }
export interface GridItemContent { imageSrc: string; imageAlt: string; title: string }
export interface GridCardContent { imageSrc: string; imageAlt: string; category: string; title: string }
export interface BannerContent { imageSrc: string; imageAlt: string; headline: string; sub: string }

export interface LandingContent {
  hero: HeroContent
  section1: { featured: FeaturedContent; grid: GridItemContent[] }
  section2: { items: GridCardContent[] }
  section3: BannerContent
}

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  hero: {
    images: [{ src: '/monet_05_japanese_footbridge_hq.png', alt: 'Monet — The Japanese Footbridge' }],
    intervalMs: 5000,
  },
  section1: {
    featured: {
      imageSrc: '/monet_01_water_lilies_1906_ryerson_hq.png',
      imageAlt: 'Monet — Water Lilies',
      category: 'FEATURED',
      title: 'The books that shaped us',
      body: 'A curated selection of titles from our community of readers.',
    },
    grid: [
      { imageSrc: '/monet_04_artist_garden_giverny_hq.png', imageAlt: 'Monet — Artist Garden at Giverny', title: 'Reading together' },
      { imageSrc: '/monet_06_seine_at_vetheuil_hq.png', imageAlt: 'Monet — The Seine at Vétheuil', title: 'Slow books' },
      { imageSrc: '/monet_03_water_lily_pond_weeping_willow_hq.png', imageAlt: 'Monet — Water Lily Pond', title: 'Club picks' },
      { imageSrc: '/monet_02_impression_sunrise_hq.png', imageAlt: 'Monet — Impression, Sunrise', title: 'This month' },
    ],
  },
  section2: {
    items: [
      { imageSrc: '/monet_06_seine_at_vetheuil_hq.png', imageAlt: 'Monet — The Seine at Vétheuil', category: 'BOOKS', title: 'Titles worth your time' },
      { imageSrc: '/monet_04_artist_garden_giverny_hq.png', imageAlt: 'Monet — Artist Garden at Giverny', category: 'CLUBS', title: 'Find your reading circle' },
      { imageSrc: '/monet_05_japanese_footbridge_hq.png', imageAlt: 'Monet — The Japanese Footbridge', category: 'COMMUNITY', title: 'Notes from our readers' },
    ],
  },
  section3: {
    imageSrc: '/monet_03_water_lily_pond_weeping_willow_hq.png',
    imageAlt: 'Monet — Water Lily Pond with Weeping Willow',
    headline: 'Join the conversation',
    sub: 'Find your next book club.',
  },
}

function coerceHero(hero: unknown): HeroContent {
  const h = (hero ?? {}) as Record<string, unknown>
  // 구형 데이터 호환: { imageSrc, imageAlt } → images[]
  if (typeof h.imageSrc === 'string' && !Array.isArray(h.images)) {
    return { images: [{ src: h.imageSrc, alt: typeof h.imageAlt === 'string' ? h.imageAlt : '' }], intervalMs: 5000 }
  }
  const rawImages = Array.isArray(h.images) ? (h.images as unknown[]) : []
  const images = rawImages
    .map((im) => im as Record<string, unknown>)
    .filter((im) => typeof im.src === 'string' && im.src.length > 0)
    .map((im) => ({ src: im.src as string, alt: typeof im.alt === 'string' ? im.alt : '' }))
  const intervalMs = typeof h.intervalMs === 'number' && h.intervalMs > 0 ? h.intervalMs : 5000
  return {
    images: images.length > 0 ? images : DEFAULT_LANDING_CONTENT.hero.images,
    intervalMs,
  }
}

export function withDefaults(data: unknown): LandingContent {
  const d = (data ?? {}) as Partial<LandingContent>
  const s1 = (d.section1 ?? {}) as Partial<LandingContent['section1']>
  const s2 = (d.section2 ?? {}) as Partial<LandingContent['section2']>
  const grid = Array.isArray(s1.grid) && s1.grid.length > 0 ? s1.grid : DEFAULT_LANDING_CONTENT.section1.grid
  const items = Array.isArray(s2.items) && s2.items.length > 0 ? s2.items : DEFAULT_LANDING_CONTENT.section2.items
  return {
    hero: coerceHero(d.hero),
    section1: {
      featured: { ...DEFAULT_LANDING_CONTENT.section1.featured, ...(s1.featured ?? {}) },
      grid,
    },
    section2: { items },
    section3: { ...DEFAULT_LANDING_CONTENT.section3, ...(d.section3 ?? {}) },
  }
}
