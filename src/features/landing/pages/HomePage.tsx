import { useEffect, useRef, useState } from 'react'
import { CareJourney } from '../components/CareJourney'
import { FloatingContactActions } from '../components/FloatingContactActions'
import {
  HomeBrandStory,
  HomeCommunityCta,
  HomeIntelligence,
  HomeTrustImpactBar,
} from '../components/HomeFlowSections'
import { NutriMomHero } from '../components/NutriMomHero'
import { TestimonialMarquee } from '../components/TestimonialMarquee'

export function HomePage() {
  const heroRef = useRef<HTMLElement>(null)
  const [showContactActions, setShowContactActions] = useState(false)

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return

    const headerHeight = document.querySelector<HTMLElement>('.landing-header')?.offsetHeight ?? 0
    let animationFrame = 0
    const updateVisibility = () => {
      animationFrame = 0
      const rect = hero.getBoundingClientRect()
      const viewportHeight = Math.max(window.innerHeight - headerHeight, 1)
      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, headerHeight),
      )

      setShowContactActions(visibleHeight < viewportHeight * 0.5)
    }
    const requestVisibilityUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateVisibility)
    }

    updateVisibility()
    window.addEventListener('scroll', requestVisibilityUpdate, { passive: true })
    window.addEventListener('resize', requestVisibilityUpdate)
    return () => {
      window.removeEventListener('scroll', requestVisibilityUpdate)
      window.removeEventListener('resize', requestVisibilityUpdate)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <main className="landing-main homeFlow">
      <NutriMomHero ref={heroRef} />

      <HomeTrustImpactBar />

      <FloatingContactActions visible={showContactActions} />

      <CareJourney />

      <HomeBrandStory />
      <HomeIntelligence />

      <div className="homeCommunity">
        <TestimonialMarquee />
        <HomeCommunityCta />
      </div>
    </main>
  )
}
