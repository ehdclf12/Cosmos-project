export interface HeroContent {
  imageSrc: string
  imageAlt: string
}

export interface FeaturedContent {
  imageSrc: string
  imageAlt: string
  category: string
  title: string
  body: string
}

export interface GridItemContent {
  imageSrc: string
  imageAlt: string
  title: string
}

export interface GridCardContent {
  imageSrc: string
  imageAlt: string
  category: string
  title: string
}

export interface BannerContent {
  imageSrc: string
  imageAlt: string
  headline: string
  sub: string
}

export interface LandingContent {
  hero: HeroContent
  section1: {
    featured: FeaturedContent
    grid: GridItemContent[]
  }
  section2: {
    items: GridCardContent[]
  }
  section3: BannerContent
}

export const landingContent: LandingContent = {
  hero: {
    imageSrc: '/monet_05_japanese_footbridge_hq.png',
    imageAlt: 'Monet — The Japanese Footbridge',
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
