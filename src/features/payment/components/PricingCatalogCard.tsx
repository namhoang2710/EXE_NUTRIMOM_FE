import { ArrowRight, Check, CheckCircle, Heart, Minus, ShieldCheck, Sparkle } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import {
  getPublicPricingLink,
  isPaidPlanTier,
  type PaidPlanTier,
  type PricingContext,
  type PricingPlan,
} from '../model/pricing-catalog'

interface PricingCatalogCardProps {
  context: PricingContext
  plan: PricingPlan
  index: number
  isAuthenticated?: boolean
  isCurrentPlan: boolean
  onSelectPlan?: (tier: PaidPlanTier) => void
}

export function PricingCatalogCard({
  context,
  plan,
  index,
  isAuthenticated = false,
  isCurrentPlan,
  onSelectPlan,
}: PricingCatalogCardProps) {
  const reduceMotion = useReducedMotion()
  const link = getPublicPricingLink(plan, isAuthenticated)
  const titleId = `${context}-pricing-${plan.tier.toLowerCase()}`
  const isMember = context === 'member'
  const memberLabel = plan.tier === 'PLAN_399K' ? 'Nhận gói 399K' : 'Nhận gói 99K'

  return (
    <motion.article
      className={`publicPricingCard${plan.featured ? ' publicPricingCard--featured' : ''}`}
      aria-labelledby={titleId}
      initial={reduceMotion ? false : { opacity: 0, y: plan.featured ? 26 : 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ type: 'spring', stiffness: 105, damping: 20, delay: index * 0.09 }}
      whileHover={reduceMotion ? undefined : { y: plan.featured ? -8 : -5 }}
    >
      {plan.featured && (
        <span className="publicPricingCard__badge">
          <Sparkle size={14} weight="fill" aria-hidden="true" /> TOÀN DIỆN NHẤT
        </span>
      )}

      <div className="publicPricingCard__top">
        <div>
          <span className="publicPricingCard__kicker">Gói đồng hành</span>
          <h3 id={titleId}>{plan.name}</h3>
        </div>
        <span className="publicPricingCard__icon" aria-hidden="true">
          {plan.featured ? <Heart size={24} weight="fill" /> : <ShieldCheck size={24} weight="duotone" />}
        </span>
      </div>

      <p className="publicPricingCard__description">{plan.description}</p>
      <p className="publicPricingCard__price" aria-label={`${plan.price}, ${plan.cadence}`}>
        <strong>{plan.price}</strong>
        <span>{plan.cadence}</span>
      </p>

      <div className="publicPricingCard__rule" aria-hidden="true" />
      <p className="publicPricingCard__benefitTitle">Quyền lợi của gói</p>
      <ul className="publicPricingCard__features">
        {plan.features.map((feature) => (
          <li className={feature.included ? '' : 'is-unavailable'} key={feature.label}>
            <span className={`publicPricingCard__featureIcon${feature.included ? ' nm-payment-success-check' : ''}`} aria-hidden="true">
              {feature.included ? <Check size={15} weight="bold" /> : <Minus size={14} weight="bold" />}
            </span>
            <span>
              {feature.label}
              {feature.detail && <small>{feature.detail}</small>}
            </span>
            <span className="sr-only">{feature.included ? 'Được bao gồm' : 'Không bao gồm'}</span>
          </li>
        ))}
      </ul>

      <div className="publicPricingCard__action">
        {isMember && plan.tier === 'FREE' ? (
          <button className="publicPricingCard__current" type="button" disabled aria-label="Miễn phí, gói đang dùng">
            <CheckCircle size={18} weight="fill" aria-hidden="true" /> Đang dùng
          </button>
        ) : isCurrentPlan ? (
          <span className="publicPricingCard__current" role="status">
            <CheckCircle size={18} weight="fill" aria-hidden="true" /> Gói hiện tại của bạn
          </span>
        ) : isMember && plan.tier !== 'FREE' ? (
          <button
            className="publicPricingCard__button"
            type="button"
            onClick={() => isPaidPlanTier(plan.tier) && onSelectPlan?.(plan.tier)}
            aria-label={`${memberLabel}, ${plan.name}`}
          >
            {memberLabel}
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </button>
        ) : (
          <Link className="publicPricingCard__button" to={link.to} state={link.state}>
            {isAuthenticated
              ? plan.tier === 'FREE' ? 'Vào không gian của bạn' : `Chọn gói ${plan.name}`
              : plan.tier === 'FREE' ? 'Đăng nhập để bắt đầu' : `Đăng nhập để chọn ${plan.name}`}
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
        )}
      </div>
    </motion.article>
  )
}
