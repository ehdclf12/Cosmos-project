# Cosmos Landing Page Design

## Overview

A magazine-style landing page for the Cosmos book community platform, modeled after magazine-b.com's editorial aesthetic. The page is the first thing visitors see before logging in, and its primary goal is to establish brand identity and guide users to sign up or log in.

## User Requirements

1. Layout mirrors magazine-b.com exactly (editorial grid, sidebar nav, full-screen hero)
2. All images and text sections independently editable via a single content config file
3. Cosmos color palette maintained (`#F2F1EE`, `#1C1C1C`, `#6B6862`, `#A8A49C`)
4. Login + Sign Up buttons in top-right corner of header
5. Left slide-out sidebar menu with items: New, Magazine, Books, Goods & Tickets, Newsletter, Index, Club
6. Club → `/clubs` (real page); all other menu items → `/coming-soon` (English)

## Architecture

### Content Management

All section content (image paths, headlines, body copy) lives in a single TypeScript config file: `app/landing/content.ts`. Editing the landing page requires only modifying this one file — no component code changes needed.

Placeholder images use `/public/images/landing/` directory so the user can drop in real images by filename without touching code.

### Routing

- `app/page.tsx` — Landing page (replaces the current `redirect('/login')`)
- `app/coming-soon/page.tsx` — "Coming Soon" page for unimplemented menu items
- Auth pages remain at `/login` and `/register` (unchanged)

### Component Structure

```
app/
  page.tsx                          — landing page root, assembles sections
  coming-soon/
    page.tsx                        — Coming Soon page
  landing/
    content.ts                      — all content/image config (CMS-like)
    LandingHeader.tsx               — fixed top bar: logo, hamburger, Login/Sign Up
    LandingSidebar.tsx              — slide-out left drawer with nav items
    sections/
      HeroSection.tsx               — full-viewport hero image
      EditorialSection.tsx          — 2/3 + 1/3 two-column editorial grid (Section 1)
      GridSection.tsx               — 3-column card grid (Section 2)
      BannerSection.tsx             — full-width banner with text overlay (Section 3)
```

## Page Layout

```
┌────────────────────────────────────────────────────────┐
│ [≡ COSMOS]                       [Log In]  [Sign Up]  │  ← Header (fixed, z-50)
├────────────────────────────────────────────────────────┤
│                                                        │
│              HERO IMAGE (100vw × 100vh)                │
│              image-only, no text overlay               │
│                                                        │
├──────────────────────────┬─────────────────────────────┤
│                          │  [img] [img]                │
│   LARGE FEATURED IMAGE   │  [title] [title]            │  ← Section 1: Editorial
│   [title]                │                             │    left col = 2/3
│   [body]                 │  [img] [img]                │    right col = 1/3 (2×2 grid)
│                          │  [title] [title]            │
├──────────────────────────┴─────────────────────────────┤
│   [img + title]     [img + title]     [img + title]    │  ← Section 2: 3-col grid
├────────────────────────────────────────────────────────┤
│            FULL WIDTH BANNER IMAGE                     │  ← Section 3: Banner
│            [headline]  [sub text]                      │
├────────────────────────────────────────────────────────┤
│  COSMOS   About / Links / Social                       │  ← Footer (minimal)
└────────────────────────────────────────────────────────┘
```

**Sidebar (slides in from left on hamburger click):**
```
COSMOS
──────
New
Magazine
Books
Goods & Tickets
Newsletter
Index
Club
```

## Content Config Schema

```typescript
// app/landing/content.ts
export const landingContent = {
  hero: {
    imageSrc: '/images/landing/hero.jpg',
    imageAlt: 'Cosmos — A space for book lovers',
  },
  section1: {
    featured: {
      imageSrc: '/images/landing/editorial-main.jpg',
      imageAlt: '...',
      category: 'FEATURED',
      title: 'The books that shaped us',
      body: 'A curated selection of titles from our community.',
    },
    grid: [
      { imageSrc: '/images/landing/s1-1.jpg', imageAlt: '...', title: '...' },
      { imageSrc: '/images/landing/s1-2.jpg', imageAlt: '...', title: '...' },
      { imageSrc: '/images/landing/s1-3.jpg', imageAlt: '...', title: '...' },
      { imageSrc: '/images/landing/s1-4.jpg', imageAlt: '...', title: '...' },
    ],
  },
  section2: {
    items: [
      { imageSrc: '/images/landing/s2-1.jpg', imageAlt: '...', category: '...', title: '...' },
      { imageSrc: '/images/landing/s2-2.jpg', imageAlt: '...', category: '...', title: '...' },
      { imageSrc: '/images/landing/s2-3.jpg', imageAlt: '...', category: '...', title: '...' },
    ],
  },
  section3: {
    imageSrc: '/images/landing/banner.jpg',
    imageAlt: '...',
    headline: 'Join the conversation',
    sub: 'Find your next book club.',
  },
}
```

## Design Details

### Colors

| Role           | Value     |
|----------------|-----------|
| Page background | `#F2F1EE` |
| Primary text   | `#1C1C1C` |
| Secondary text | `#6B6862` |
| Muted text     | `#A8A49C` |
| Header bg      | `#F2F1EE` (matches page, no contrast boundary) |
| Sidebar bg     | `#1C1C1C` (dark, text `#F2F1EE`) |

### Typography

- Logo wordmark: `tracking-widest font-light text-2xl` — "COSMOS"
- Section category labels: `text-xs tracking-widest uppercase` — `#A8A49C`
- Editorial titles: `font-light text-xl` — `#1C1C1C`
- Body text: `text-sm leading-relaxed` — `#6B6862`

### Header

- Fixed at top, full width, `z-50`
- Left: hamburger icon + "COSMOS" wordmark
- Right: "Log In" (ghost button → `/login`) + "Sign Up" (filled button → `/register`)
- Height: `56px`
- No border — subtle shadow or none (magazine-b style: borderless)

### Sidebar

- Fixed position overlay, slides in from left
- Width: `280px`
- Background: `#1C1C1C`, text: `#F2F1EE`
- Close via backdrop click or X button
- Nav items: `text-sm tracking-wide` with `16px` vertical spacing
- Club item renders as link to `/clubs`; all others render as link to `/coming-soon`

### Images

All images use Next.js `<Image>` with `fill` and `object-cover` for proper responsive behavior. Placeholder: light gray `#C8C5BC` background until image loads. Images live in `/public/images/landing/` — the user drops in real images by matching the filename in `content.ts`.

### Coming Soon Page

- Full-screen centered layout, `#F2F1EF` background
- "COMING SOON" in `tracking-widest font-light text-4xl` — `#1C1C1C`
- Subtext: "This section is currently being prepared." — `#6B6862`
- Small "← Back" link to `/`

## Out of Scope

- No authentication check on landing page (fully public)
- No dynamic content from Supabase on landing page
- No animations beyond sidebar slide transition
- No mobile-specific sidebar (hamburger works on both mobile and desktop)
