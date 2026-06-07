// apps/web/app/page.tsx
import LandingClient from './landing/LandingClient'
import HeroSection from './landing/sections/HeroSection'
import EditorialSection from './landing/sections/EditorialSection'
import GridSection from './landing/sections/GridSection'
import BannerSection from './landing/sections/BannerSection'
import { landingContent } from './landing/content'
import Link from 'next/link'

export default function RootPage() {
  return (
    <div style={{ backgroundColor: '#F2F1EE', minHeight: '100vh' }}>
      <LandingClient />

      <main>
        <HeroSection content={landingContent.hero} />
        <EditorialSection content={landingContent.section1} />
        <GridSection content={landingContent.section2} />
        <BannerSection content={landingContent.section3} />
      </main>

      <footer
        className="px-6 md:px-12 py-12 border-t flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        style={{ borderColor: '#E8E5E0' }}
      >
        <span
          className="text-sm font-light tracking-widest"
          style={{ color: '#1C1C1C' }}
        >
          COSMOS
        </span>
        <div className="flex gap-8">
          <Link
            href="/coming-soon"
            className="text-xs tracking-wide hover:underline underline-offset-4"
            style={{ color: '#6B6862' }}
          >
            About
          </Link>
          <Link
            href="/clubs"
            className="text-xs tracking-wide hover:underline underline-offset-4"
            style={{ color: '#6B6862' }}
          >
            Clubs
          </Link>
          <Link
            href="/coming-soon"
            className="text-xs tracking-wide hover:underline underline-offset-4"
            style={{ color: '#6B6862' }}
          >
            Newsletter
          </Link>
        </div>
        <p className="text-xs" style={{ color: '#A8A49C' }}>
          © 2026 Cosmos. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
