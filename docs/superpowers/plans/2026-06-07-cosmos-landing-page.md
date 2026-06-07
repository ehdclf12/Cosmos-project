# Cosmos Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a magazine-b.com-style editorial landing page for Cosmos with a slide-out sidebar, fixed header, and CMS-like content config file.

**Architecture:** The root `app/page.tsx` is replaced with a landing page that composes a client-side `LandingClient` (header + sidebar state) with server-rendered section components. All content (image paths, text) lives in `app/landing/content.ts`—the only file a content editor ever needs to touch. Menu item "Club" links to `/clubs`; all other menu items link to `/coming-soon`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/app/page.tsx` | Modify | Replace redirect with landing page assembly |
| `apps/web/app/coming-soon/page.tsx` | Create | "Coming Soon" page for unimplemented menu items |
| `apps/web/app/landing/content.ts` | Create | All section content (image paths, text) — sole editing surface |
| `apps/web/app/landing/LandingClient.tsx` | Create | Client wrapper managing sidebar open/close state |
| `apps/web/app/landing/LandingHeader.tsx` | Create | Fixed top bar: hamburger + COSMOS + Log In + Sign Up |
| `apps/web/app/landing/LandingSidebar.tsx` | Create | Slide-in left drawer with nav items |
| `apps/web/app/landing/sections/HeroSection.tsx` | Create | Full-viewport hero image (image-only, no text) |
| `apps/web/app/landing/sections/EditorialSection.tsx` | Create | 2-column editorial: 2/3 featured + 1/3 2×2 grid |
| `apps/web/app/landing/sections/GridSection.tsx` | Create | 3-column card grid with category + title |
| `apps/web/app/landing/sections/BannerSection.tsx` | Create | Full-width banner image with text overlay |

---

## Task 1: Content Config and Coming Soon Page

**Files:**
- Create: `apps/web/app/landing/content.ts`
- Create: `apps/web/app/coming-soon/page.tsx`

- [ ] **Step 1: Create the content config**

```typescript
// apps/web/app/landing/content.ts

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
```

- [ ] **Step 2: Create the Coming Soon page**

```tsx
// apps/web/app/coming-soon/page.tsx
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/landing/content.ts apps/web/app/coming-soon/page.tsx
git commit -m "feat: add landing page content config and coming-soon page"
```

---

## Task 2: Landing Header Component

**Files:**
- Create: `apps/web/app/landing/LandingHeader.tsx`

- [ ] **Step 1: Create the header**

```tsx
// apps/web/app/landing/LandingHeader.tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/landing/LandingHeader.tsx
git commit -m "feat: add landing page header component"
```

---

## Task 3: Landing Sidebar Component

**Files:**
- Create: `apps/web/app/landing/LandingSidebar.tsx`

- [ ] **Step 1: Create the sidebar**

Menu items: New, Magazine, Books, Goods & Tickets, Newsletter, Index, Club. Club links to `/clubs`; all others link to `/coming-soon`.

```tsx
// apps/web/app/landing/LandingSidebar.tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/landing/LandingSidebar.tsx
git commit -m "feat: add landing page sidebar drawer"
```

---

## Task 4: LandingClient (State Wrapper)

**Files:**
- Create: `apps/web/app/landing/LandingClient.tsx`

The header and sidebar share `sidebarOpen` state. This client component owns that state and renders both.

- [ ] **Step 1: Create the client wrapper**

```tsx
// apps/web/app/landing/LandingClient.tsx
'use client'
import { useState } from 'react'
import LandingHeader from './LandingHeader'
import LandingSidebar from './LandingSidebar'

export default function LandingClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <LandingHeader onMenuClick={() => setSidebarOpen(true)} />
      <LandingSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/landing/LandingClient.tsx
git commit -m "feat: add landing client wrapper for sidebar state"
```

---

## Task 5: Hero Section

**Files:**
- Create: `apps/web/app/landing/sections/HeroSection.tsx`

Full-viewport-height image slot. Shows warm gray placeholder when `imageSrc` is empty. No text overlay.

- [ ] **Step 1: Create the hero section**

```tsx
// apps/web/app/landing/sections/HeroSection.tsx
import Image from 'next/image'
import type { HeroContent } from '../content'

interface Props {
  content: HeroContent
}

export default function HeroSection({ content }: Props) {
  return (
    <section className="relative w-full" style={{ height: '100svh', marginTop: '56px' }}>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: '#C8C5BC' }}
      >
        {content.imageSrc && (
          <Image
            src={content.imageSrc}
            alt={content.imageAlt}
            fill
            priority
            className="object-cover"
          />
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/landing/sections/HeroSection.tsx
git commit -m "feat: add landing hero section"
```

---

## Task 6: Editorial Section

**Files:**
- Create: `apps/web/app/landing/sections/EditorialSection.tsx`

Two-column layout: large featured item on the left (2/3 width), 2×2 grid of smaller items on the right (1/3 width). Each item is an image placeholder + metadata text.

- [ ] **Step 1: Create the editorial section**

```tsx
// apps/web/app/landing/sections/EditorialSection.tsx
import Image from 'next/image'
import type { FeaturedContent, GridItemContent } from '../content'

interface Props {
  content: {
    featured: FeaturedContent
    grid: GridItemContent[]
  }
}

function PlaceholderImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ backgroundColor: '#C8C5BC' }}
    >
      {src && <Image src={src} alt={alt} fill className="object-cover" />}
    </div>
  )
}

export default function EditorialSection({ content }: Props) {
  const { featured, grid } = content

  return (
    <section className="px-6 md:px-12 py-16">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Featured: 2/3 */}
        <div className="md:w-2/3 flex flex-col gap-4">
          <PlaceholderImage
            src={featured.imageSrc}
            alt={featured.imageAlt}
            className="w-full aspect-[4/3]"
          />
          <div>
            <p
              className="text-xs tracking-widest uppercase mb-2"
              style={{ color: '#A8A49C' }}
            >
              {featured.category}
            </p>
            <h2
              className="text-xl font-light mb-2"
              style={{ color: '#1C1C1C' }}
            >
              {featured.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#6B6862' }}>
              {featured.body}
            </p>
          </div>
        </div>

        {/* Grid: 1/3, 2×2 */}
        <div className="md:w-1/3 grid grid-cols-2 gap-4">
          {grid.map((item, i) => (
            <div key={i} className="flex flex-col gap-2">
              <PlaceholderImage
                src={item.imageSrc}
                alt={item.imageAlt}
                className="w-full aspect-square"
              />
              <p className="text-xs font-light" style={{ color: '#1C1C1C' }}>
                {item.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/landing/sections/EditorialSection.tsx
git commit -m "feat: add landing editorial section"
```

---

## Task 7: Grid Section

**Files:**
- Create: `apps/web/app/landing/sections/GridSection.tsx`

Three-column card grid. Each card: image placeholder on top, category label, title text below.

- [ ] **Step 1: Create the grid section**

```tsx
// apps/web/app/landing/sections/GridSection.tsx
import Image from 'next/image'
import type { GridCardContent } from '../content'

interface Props {
  content: {
    items: GridCardContent[]
  }
}

export default function GridSection({ content }: Props) {
  return (
    <section
      className="px-6 md:px-12 py-16 border-t"
      style={{ borderColor: '#E8E5E0' }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {content.items.map((item, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div
              className="relative w-full aspect-[3/2] overflow-hidden"
              style={{ backgroundColor: '#C8C5BC' }}
            >
              {item.imageSrc && (
                <Image
                  src={item.imageSrc}
                  alt={item.imageAlt}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: '#A8A49C' }}
            >
              {item.category}
            </p>
            <h3 className="text-base font-light" style={{ color: '#1C1C1C' }}>
              {item.title}
            </h3>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/landing/sections/GridSection.tsx
git commit -m "feat: add landing 3-column grid section"
```

---

## Task 8: Banner Section

**Files:**
- Create: `apps/web/app/landing/sections/BannerSection.tsx`

Full-width image with centered headline and sub-text overlaid on a semi-transparent dark layer.

- [ ] **Step 1: Create the banner section**

```tsx
// apps/web/app/landing/sections/BannerSection.tsx
import Image from 'next/image'
import type { BannerContent } from '../content'

interface Props {
  content: BannerContent
}

export default function BannerSection({ content }: Props) {
  return (
    <section
      className="relative w-full flex items-center justify-center"
      style={{ height: '480px', backgroundColor: '#C8C5BC' }}
    >
      {content.imageSrc && (
        <Image
          src={content.imageSrc}
          alt={content.imageAlt}
          fill
          className="object-cover"
        />
      )}
      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(28,28,28,0.4)' }}
      />
      {/* Text */}
      <div className="relative z-10 text-center px-6">
        <h2
          className="text-3xl md:text-5xl font-light tracking-wide mb-4"
          style={{ color: '#F2F1EE' }}
        >
          {content.headline}
        </h2>
        <p className="text-sm tracking-widest" style={{ color: '#C8C5BC' }}>
          {content.sub}
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/landing/sections/BannerSection.tsx
git commit -m "feat: add landing banner section"
```

---

## Task 9: Assemble Root Page + Footer

**Files:**
- Modify: `apps/web/app/page.tsx`

Replace the `redirect('/login')` with the full landing page assembly. Add a minimal footer.

- [ ] **Step 1: Remove conflicting (main) home page**

`app/(main)/page.tsx` resolves to the same URL `/` as `app/page.tsx`. Next.js App Router does not allow two pages at the same path — this causes a build error. Delete it (authenticated users land on `/clubs` after login, so this page is unreachable anyway):

```bash
rm apps/web/app/\(main\)/page.tsx
```

- [ ] **Step 2: Replace root page.tsx**

The current content of `apps/web/app/page.tsx` is:
```typescript
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/login')
}
```

Replace entirely with:

```tsx
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start dev server and verify visually**

```bash
cd apps/web && npm run dev
```

Open `http://localhost:3000` in a browser. Verify:
- Fixed header visible with COSMOS wordmark, hamburger, Log In and Sign Up buttons
- Hamburger click opens dark sidebar with all 7 menu items
- Clicking backdrop or ✕ closes the sidebar
- "Club" in sidebar navigates to `/clubs`
- Any other sidebar item navigates to `/coming-soon`
- Hero section below header shows warm gray placeholder (full viewport height)
- Scrolling reveals editorial section, 3-column grid, banner, and footer
- `/coming-soon` shows "COMING SOON" centered with Back link
- Log In button → `/login`, Sign Up button → `/register`

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/page.tsx
git rm apps/web/app/\(main\)/page.tsx
git commit -m "feat: build Cosmos magazine-style landing page"
```

---

## Task 10: Push and Deploy

- [ ] **Step 1: Push to remote**

```bash
git push
```

- [ ] **Step 2: Verify Vercel deployment**

Wait for Vercel to deploy (typically 2-3 minutes). Open the production URL. Verify the landing page renders correctly (same checks as Task 9 Step 3).

---

## Adding Real Images Later

When ready to add actual images:

1. Drop image files into `apps/web/public/images/landing/` (e.g., `hero.jpg`)
2. Open `apps/web/app/landing/content.ts`
3. Set the `imageSrc` for that section to `/images/landing/hero.jpg`
4. The `next/image` component renders the real image; no component code changes needed

