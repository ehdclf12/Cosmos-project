import type { HeroContent } from '@cosmos/shared'
import HeroCarousel from './HeroCarousel'

interface Props {
  content: HeroContent
}

export default function HeroSection({ content }: Props) {
  return (
    <section className="relative w-full" style={{ height: '100svh', marginTop: '56px' }}>
      <HeroCarousel content={content} />
    </section>
  )
}
