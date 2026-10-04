import { Star } from '@phosphor-icons/react'
import { useState } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const ratingVariants = cva("flex items-center", {
  variants: {
    size: {
      sm: "gap-2",
      default: "gap-2.5",
      lg: "gap-3",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

const starVariants = cva("", {
  variants: {
    size: {
      sm: "w-4 h-4",
      default: "w-5 h-5",
      lg: "w-6 h-6",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

const valueVariants = cva("text-muted-foreground w-5", {
  variants: {
    size: {
      sm: "text-xs",
      default: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

function Rating({
  rating,
  maxRating = 5,
  size,
  className,
  starClassName,
  showValue = false,
  editable = false,
  onRatingChange,
  disabled = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof ratingVariants> & {
    /**
     * Current rating value (supports decimal values for partial stars)
     */
    rating: number
    /**
     * Maximum rating value (number of stars to show)
     */
    maxRating?: number
    /**
     * Whether to show the numeric rating value
     */
    showValue?: boolean
    /**
     * Class name for the value span
     */
    starClassName?: string
    /**
     * Whether the rating is editable (clickable)
     */
    editable?: boolean
    /**
     * Callback function called when rating changes
     */
    onRatingChange?: (rating: number) => void
    disabled?: boolean
  }) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const displayRating =
    editable && hoveredRating !== null ? hoveredRating : rating

  const handleStarClick = (starRating: number) => {
    if (editable && !disabled && onRatingChange) {
      onRatingChange(Math.max(1, Math.min(maxRating, Math.round(starRating))))
    }
  }

  const handleStarMouseEnter = (starRating: number) => {
    if (editable && !disabled) {
      setHoveredRating(starRating)
    }
  }

  const handleStarMouseLeave = () => {
    if (editable) {
      setHoveredRating(null)
    }
  }

  const renderStars = () => {
    const stars = []

    for (let i = 1; i <= maxRating; i++) {
      const filled = displayRating >= i
      const partiallyFilled = displayRating > i - 1 && displayRating < i
      const fillPercentage = partiallyFilled
        ? (displayRating - (i - 1)) * 100
        : 0

      stars.push(
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={Math.round(rating) === i}
          aria-label={`${i} sao`}
          disabled={disabled}
          tabIndex={editable && (Math.round(rating) === i || (!rating && i === 1)) ? 0 : -1}
          className={cn('relative border-0 bg-transparent p-0', editable && !disabled && 'cursor-pointer')}
          onClick={() => handleStarClick(i)}
          onMouseEnter={() => handleStarMouseEnter(i)}
          onMouseLeave={handleStarMouseLeave}
          onKeyDown={(event) => {
            if (!editable || disabled || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const next = event.key === 'Home' ? 1 : event.key === 'End' ? maxRating : Math.max(1, Math.min(maxRating, i + (event.key === 'ArrowRight' ? 1 : -1)))
            onRatingChange?.(next)
            event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`button:nth-child(${next})`)?.focus()
          }}
        >
          {/* Background star (empty) */}
          <Star data-slot="rating-star-empty" className={starVariants({ size })} style={{ color: 'var(--rating-gold)', opacity: 0.38 }} aria-hidden="true" />

          {/* Filled star */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              width: filled ? "100%" : `${fillPercentage}%`,
            }}
          >
            <Star data-slot="rating-star-filled" weight="fill" aria-hidden="true" className={starVariants({ size })} style={{ color: 'var(--rating-gold)', fill: 'var(--rating-gold)' }} />
          </div>
        </button>
      )
    }

    return stars
  }

  return (
    <div
      data-slot="rating"
      role={editable ? 'radiogroup' : undefined}
      className={cn(ratingVariants({ size }), className)}
      {...props}
    >
      <div className="flex items-center">{renderStars()}</div>
      {showValue && (
        <span
          data-slot="rating-value"
          className={cn(valueVariants({ size }), starClassName)}
        >
          {displayRating.toFixed(1)}
        </span>
      )}
    </div>
  )
}

export { Rating }
