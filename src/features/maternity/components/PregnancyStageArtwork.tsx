import { Heartbeat } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { getPregnancyStageAltText, getPregnancyStageImageUrl } from '../model/pregnancy-stage-artwork'

interface PregnancyStageArtworkProps {
  week: number
  day?: number
}

export function PregnancyStageArtwork({ week, day }: PregnancyStageArtworkProps) {
  const imageUrl = getPregnancyStageImageUrl(week)
  const altText = getPregnancyStageAltText(week, day)
  const imageKey = imageUrl ? `${imageUrl}-${week}` : `fallback-${week}`
  const reduceMotion = useReducedMotion()
  const [failedImageKey, setFailedImageKey] = useState<string | null>(null)
  const [loadedImageKey, setLoadedImageKey] = useState<string | null>(null)

  useEffect(() => {
    setFailedImageKey(null)
    setLoadedImageKey(null)
  }, [imageKey])

  const showFallback = !imageUrl || failedImageKey === imageKey
  const imageLoaded = loadedImageKey === imageKey

  return (
    <motion.div
      key={imageKey}
      className="pregnancy-stage-artwork"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="pregnancy-stage-artwork-float"
        animate={reduceMotion ? { y: 0, rotate: 0 } : { y: [0, -8, 0, 6, 0], rotate: [0, 1.2, 0, -1.2, 0] }}
        transition={reduceMotion ? { duration: 0 } : { duration: 6.4, ease: 'easeInOut', repeat: Infinity }}
      >
        {showFallback ? (
          <span className="pregnancy-stage-artwork-fallback" role="img" aria-label={altText}>
            <Heartbeat size="46%" weight="duotone" aria-hidden="true" />
          </span>
        ) : (
          <motion.img
            key={imageKey}
            src={imageUrl}
            alt={altText}
            draggable={false}
            decoding="async"
            initial={false}
            animate={{ opacity: imageLoaded ? 1 : 0, scale: imageLoaded ? 1 : 0.94 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
            onLoad={() => setLoadedImageKey(imageKey)}
            onError={() => setFailedImageKey(imageKey)}
          />
        )}
      </motion.div>
    </motion.div>
  )
}
