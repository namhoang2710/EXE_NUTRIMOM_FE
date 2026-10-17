import { ArrowRight, Check, CheckCircle, Heart, LockKey, ShieldCheck, Sparkle } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import type { PlanTier } from '../model/payment-types'
import {
  getPublicPricingLink,
  canPurchasePlan,
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
  currentPlanTier?: PlanTier
  onSelectPlan?: (tier: PaidPlanTier) => void
}

export function PricingCatalogCard({
  context,
  plan,
  index,
  isAuthenticated = false,
  isCurrentPlan,
  currentPlanTier,
  onSelectPlan,
}: PricingCatalogCardProps) {
  const reduceMotion = useReducedMotion()
  const link = getPublicPricingLink(plan, isAuthenticated)
  const titleId = `${context}-pricing-${plan.tier.toLowerCase()}`
  const isMember = context === 'member'
  const Heading = isMember ? 'h2' : 'h3'
  const blocked = currentPlanTier ? !canPurchasePlan(currentPlanTier, plan.tier) && plan.tier !== 'FREE' : false
  const unknown = (isMember || isAuthenticated) && !currentPlanTier
  const memberLabel = isCurrentPlan ? 'Gia hạn gói' : currentPlanTier === 'PLAN_99K' ? 'Nâng cấp gói' : 'Chọn gói này'

  return (
    <motion.article
      className={`publicPricingCard${isCurrentPlan ? ' is-current-plan' : ''}${plan.featured ? ' publicPricingCard--featured' : ''}`}
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
          <Heading id={titleId}>{plan.name}</Heading>
        </div>
        <span className="publicPricingCard__icon" aria-hidden="true">
          {plan.featured ? <Heart size={24} weight="fill" /> : <ShieldCheck size={24} weight="duotone" />}
        </span>
      </div>

      {isCurrentPlan && <span className="nm-pricing-current-label"><CheckCircle size={15} weight="fill" aria-hidden="true" /> Đang dùng</span>}
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
              {feature.included ? <Check size={15} weight="bold" /> : <LockKey size={14} weight="bold" />}
            </span>
            <span>
              {feature.label}
              {feature.code === 'AI_SCAN' && <span className="nm-feature-soon">Sắp ra mắt</span>}
              {feature.detail && <small>{feature.detail}</small>}
            </span>
            <span className="sr-only">{feature.included ? 'Được bao gồm' : 'Không bao gồm'}</span>
          </li>
        ))}
      </ul>

      <div className="publicPricingCard__action">
        {plan.tier === 'FREE' && isMember ? (
          <span className={isCurrentPlan ? 'publicPricingCard__current' : 'nm-pricing-unavailable'}>{isCurrentPlan ? <><CheckCircle size={18} weight="fill" aria-hidden="true" /> Gói hiện tại của bạn</> : 'Gói miễn phí'}</span>
        ) : blocked ? (
          <span className="nm-pricing-unavailable">Có thể chọn sau khi gói hiện tại hết hạn</span>
        ) : unknown && plan.tier !== 'FREE' ? (
          <button className="publicPricingCard__button" type="button" disabled>Tải thông tin gói để chọn</button>
        ) : isMember && isPaidPlanTier(plan.tier) ? (
          <button className="publicPricingCard__button" type="button" onClick={() => isPaidPlanTier(plan.tier) && onSelectPlan?.(plan.tier)}>
            {memberLabel}<ArrowRight size={18} weight="bold" aria-hidden="true" />
          </button>
        ) : (
          <Link className="publicPricingCard__button" to={link.to} state={link.state}>
            {isAuthenticated
              ? plan.tier === 'FREE' ? 'Vào không gian của bạn' : isCurrentPlan ? 'Gia hạn gói' : `Chọn ${plan.name}`
              : plan.tier === 'FREE' ? 'Đăng nhập để bắt đầu' : `Đăng nhập để chọn gói`}
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
        )}
      </div>
    </motion.article>
  )
}
