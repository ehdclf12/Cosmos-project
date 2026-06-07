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
    imageSrc: '',
    imageAlt: 'Cosmos — A space for book lovers',
  },
  section1: {
    featured: {
      imageSrc: '',
      imageAlt: 'Featured editorial image',
      category: 'FEATURED',
      title: 'The books that shaped us',
      body: 'A curated selection of titles from our community of readers.',
    },
    grid: [
      { imageSrc: '', imageAlt: '', title: 'Reading together' },
      { imageSrc: '', imageAlt: '', title: 'Slow books' },
      { imageSrc: '', imageAlt: '', title: 'Club picks' },
      { imageSrc: '', imageAlt: '', title: 'This month' },
    ],
  },
  section2: {
    items: [
      { imageSrc: '', imageAlt: '', category: 'BOOKS', title: 'Titles worth your time' },
      { imageSrc: '', imageAlt: '', category: 'CLUBS', title: 'Find your reading circle' },
      { imageSrc: '', imageAlt: '', category: 'COMMUNITY', title: 'Notes from our readers' },
    ],
  },
  section3: {
    imageSrc: '',
    imageAlt: 'Join Cosmos',
    headline: 'Join the conversation',
    sub: 'Find your next book club.',
  },
}
