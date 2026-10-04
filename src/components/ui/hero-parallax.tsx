import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { Link } from 'react-router-dom'
import './hero-parallax.css'

export type HeroParallaxImageFit = 'cover' | 'contain'

export interface HeroParallaxItem {
  title: string
  link: string
  thumbnail: string
  alt: string
  fit?: HeroParallaxImageFit
  position?: string
  priority?: boolean
}

interface HeroParallaxProps {
  items: HeroParallaxItem[]
  children: ReactNode
  className?: string
  labelledBy?: string
}

type MotionProfile = 'compact' | 'tablet' | 'desktop'

const springConfig = { stiffness: 105, damping: 32, mass: 0.82 }

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value)
  } else if (ref) {
    ref.current = value
  }
}

function getMotionProfile(): MotionProfile {
  if (typeof window === 'undefined') return 'desktop'
  if (window.matchMedia('(max-width: 767px)').matches) return 'compact'
  if (window.matchMedia('(max-width: 1100px)').matches) return 'tablet'
  return 'desktop'
}

export const HeroParallax = forwardRef<HTMLElement, HeroParallaxProps>(
  function HeroParallax(
    { items, children, className = '', labelledBy },
    forwardedRef,
  ) {
    const sectionRef = useRef<HTMLElement>(null)
    const prefersReducedMotion = useReducedMotion()
    const [motionProfile, setMotionProfile] = useState<MotionProfile>(getMotionProfile)

    useEffect(() => {
      const compactMedia = window.matchMedia('(max-width: 767px)')
      const tabletMedia = window.matchMedia('(min-width: 768px) and (max-width: 1100px)')
      const updateProfile = () => setMotionProfile(getMotionProfile())

      updateProfile()
      compactMedia.addEventListener('change', updateProfile)
      tabletMedia.addEventListener('change', updateProfile)
      return () => {
        compactMedia.removeEventListener('change', updateProfile)
        tabletMedia.removeEventListener('change', updateProfile)
      }
    }, [])

    const setSectionRef = useCallback((node: HTMLElement | null) => {
      sectionRef.current = node
      assignRef(forwardedRef, node)
    }, [forwardedRef])

    const { scrollYProgress } = useScroll({
      target: sectionRef,
      offset: ['start start', 'end start'],
    })

    const shouldAnimate = !prefersReducedMotion && motionProfile !== 'compact'
    const isTablet = motionProfile === 'tablet'

    const firstRowX = useSpring(
      useTransform(
        scrollYProgress,
        [0, 1],
        shouldAnimate ? (isTablet ? [-120, -430] : [-150, -880]) : [0, 0],
      ),
      springConfig,
    )
    const secondRowX = useSpring(
      useTransform(
        scrollYProgress,
        [0, 1],
        shouldAnimate ? (isTablet ? [-430, -80] : [-760, -40]) : [0, 0],
      ),
      springConfig,
    )
    const thirdRowX = useSpring(
      useTransform(
        scrollYProgress,
        [0, 1],
        shouldAnimate ? (isTablet ? [-80, -390] : [-30, -720]) : [0, 0],
      ),
      springConfig,
    )
    const rotateX = useSpring(
      useTransform(
        scrollYProgress,
        [0, 0.42],
        shouldAnimate ? (isTablet ? [8, 0] : [14, 0]) : [0, 0],
      ),
      springConfig,
    )
    const rotateZ = useSpring(
      useTransform(
        scrollYProgress,
        [0, 0.42],
        shouldAnimate ? (isTablet ? [6, 0] : [12, 0]) : [0, 0],
      ),
      springConfig,
    )
    const translateY = useSpring(
      useTransform(
        scrollYProgress,
        [0, 0.72],
        shouldAnimate ? (isTablet ? [140, -64] : [220, -120]) : [0, 0],
      ),
      springConfig,
    )
    const galleryOpacity = useSpring(
      useTransform(
        scrollYProgress,
        [0, 0.3],
        shouldAnimate ? [0.38, 1] : [1, 1],
      ),
      springConfig,
    )

    const rows = [items.slice(0, 5), items.slice(5, 10), items.slice(10, 15)]
    const translations = [firstRowX, secondRowX, thirdRowX]

    return (
      <section
        ref={setSectionRef}
        className={`hero-parallax ${className}`.trim()}
        aria-labelledby={labelledBy}
      >
        <div className="hero-parallax__sticky">
          <div className="hero-parallax__ambient" aria-hidden="true" />

          <motion.div
            className="hero-parallax__gallery"
            style={{
              opacity: galleryOpacity,
              rotateX,
              rotateZ,
              y: translateY,
              transformPerspective: shouldAnimate ? 1450 : undefined,
            }}
          >
            {rows.map((rowItems, index) => (
              <ParallaxRow
                items={rowItems}
                key={`hero-row-${index + 1}`}
                rowIndex={index + 1}
                translate={translations[index]}
              />
            ))}
          </motion.div>

          <div className="hero-parallax__readability" aria-hidden="true" />
          <div className="hero-parallax__copy">{children}</div>
        </div>
      </section>
    )
  },
)

interface ParallaxRowProps {
  items: HeroParallaxItem[]
  rowIndex: number
  translate: MotionValue<number>
}

function ParallaxRow({ items, rowIndex, translate }: ParallaxRowProps) {
  return (
    <motion.div
      className={`hero-parallax__row hero-parallax__row--${rowIndex}`}
      style={{ x: translate }}
    >
      {items.map((item) => (
        <ProductCard item={item} key={item.thumbnail} />
      ))}
    </motion.div>
  )
}

function ProductCard({ item }: { item: HeroParallaxItem }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.article
      className={`hero-parallax__card hero-parallax__card--${item.fit ?? 'cover'}`}
      whileHover={prefersReducedMotion ? undefined : { y: -8 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link className="hero-parallax__link" to={item.link}>
        <div className="hero-parallax__media">
          <img
            src={item.thumbnail}
            alt={item.alt}
            width={640}
            height={420}
            loading={item.priority ? 'eager' : 'lazy'}
            fetchPriority={item.priority ? 'high' : 'auto'}
            decoding="async"
            draggable="false"
            style={{ objectPosition: item.position }}
          />
          <span className="hero-parallax__title">{item.title}</span>
        </div>
      </Link>
    </motion.article>
  )
}
