import { useEntitlements, usePricingCatalog, refreshEntitlements } from '../hooks/useEntitlements'
import { usePaymentCooldown } from '../hooks/usePaymentCooldown'
import { SubscriptionStatus } from '../components/SubscriptionStatus'
import { PricingSkeleton, ResourceFeedback } from '../components/ResourceFeedback'
import '../styles/entitlements.css'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  CircleNotch,
  Leaf,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkle,
  Users,
  WarningCircle,
} from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatedNumber } from '@/shared/components/AnimatedNumber'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { paymentApi } from '../api/payment-api'
import { PaymentSteps } from '../components/PaymentSteps'
import { PricingCatalogGrid } from '../components/PricingCatalogGrid'
import {
  getPricingComparisonRows,
  getPricingPlan,
  isPaidPlanTier,
  canPurchasePlan,
  type PaidPlanTier,
  type PricingPlan,
} from '../model/pricing-catalog'
import { getPricingReviewUrl, getPricingSelectUrl, parsePricingFlow } from '../model/pricing-flow'
import { formatPaymentAmount, isDemoCheckout } from '../model/subscription-plans'
import type { PaymentResponse, PlanTier } from '../model/payment-types'
import '../styles/pricing-catalog.css'
import '../styles/payment.css'

function createCheckoutIdempotencyKey(planTier: PaidPlanTier) {
  const uniquePart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `subscription-checkout:${planTier}:${uniquePart}`
}

function PlanIcon({ tier, size = 24 }: { tier: PlanTier; size?: number }) {
  const Icon = tier === 'FREE' ? Leaf : tier === 'PLAN_99K' ? Sparkle : Users
  return <Icon size={size} weight="duotone" aria-hidden="true" />
}

function AnimatedPaymentAmount({ value }: { value: number }) {
  const reduceMotion = useReducedMotion()

  return (
    <span className="nm-payment-animated-amount">
      <motion.span
        key={value}
        className="nm-payment-animated-amount__value"
        initial={reduceMotion ? false : { opacity: 0.25, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.42, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden="true"
      >
        <AnimatedNumber value={value} formatter={formatPaymentAmount} fromZero={false} animateChanges />
      </motion.span>
      <span className="sr-only">{formatPaymentAmount(value)}</span>
    </span>
  )
}

function MemberPricingCatalog({ plans, loading, error, retryAt, onRetry }: { plans: PricingPlan[]; loading: boolean; error: Error | null; retryAt: number; onRetry: () => Promise<unknown> }) {
  const { subscription } = useEntitlements()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  function selectPaidPlan(tier: PaidPlanTier) {
    navigate(getPricingSelectUrl(tier))
  }

  return (
    <motion.main
      className="publicPricing nm-member-pricing"
      id="pricing"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="publicPricing__inner nm-member-pricing__inner">
        <div className="nm-payment-topline">
          <Link className="nm-payment-back" to="/app">
            <ArrowLeft size={17} aria-hidden="true" /> Không gian của bạn
          </Link>
          <span className="nm-payment-topline__secure"><ShieldCheck size={20} weight="duotone" aria-hidden="true" /> Thanh toán dễ dàng</span>
        </div>

        <header className="publicPricing__heading nm-member-pricing__heading">
          <span className="publicPricing__eyebrow"><Sparkle size={15} weight="fill" aria-hidden="true" /> GÓI ĐỒNG HÀNH CÙNG MẸ</span>
          <h1>Chọn gói đồng hành phù hợp với mẹ.</h1>
          <p>Quyền lợi rõ ràng, lựa chọn phù hợp cho từng nhu cầu chăm sóc.</p>
        </header>

        <SubscriptionStatus showLink={false} />
        {loading && !plans.length ? <PricingSkeleton /> : error || !plans.length ? <ResourceFeedback error={error} retryAt={retryAt} onRetry={onRetry} /> : <PricingCatalogGrid plans={plans} context="member" currentPlanTier={subscription?.plan_id} onSelectPlan={selectPaidPlan} />}

        <p className="publicPricing__disclaimer">
          <ShieldCheck size={16} weight="fill" aria-hidden="true" /> Quyền lợi được cập nhật sau khi thanh toán được xác nhận. AI Scan Vision sắp ra mắt.
        </p>
      </div>
    </motion.main>
  )
}

function PlanSelector({ selectedPlan, onSelect, plans, currentPlan }: { selectedPlan: PaidPlanTier; onSelect: (tier: PaidPlanTier) => void; plans: PricingPlan[]; currentPlan?: PlanTier }) {
  return (
    <section className="nm-payment-plan-selector" aria-labelledby="plans-title">
      <div className="nm-payment-section-heading">
        <div>
          <span className="nm-payment-section-kicker">Gói dịch vụ</span>
          <h2 id="plans-title">Chọn mức đồng hành</h2>
        </div>
        <span>Có thể đổi trước khi thanh toán</span>
      </div>
      <fieldset className="nm-plan-options">
        <legend className="sr-only">Chọn gói chăm sóc trả phí</legend>
        {plans.map((option) => {
          const isFree = option.tier === 'FREE'
          const isCurrent = option.tier === currentPlan
          const unavailable = !currentPlan || !canPurchasePlan(currentPlan, option.tier)
          const selected = option.tier === selectedPlan
          return (
            <label
              key={option.tier}
              className={`nm-plan-option${selected ? ' is-selected' : ''}${isCurrent ? ' is-current' : ''}`}
            >
              <input
                type="radio"
                name="subscription-plan"
                value={option.tier}
                checked={selected}
                disabled={isFree || unavailable}
                onChange={() => isPaidPlanTier(option.tier) && onSelect(option.tier)}
              />
              <span className="nm-plan-icon"><PlanIcon tier={option.tier} /></span>
              <span className="nm-plan-option-copy">
                <span className="nm-plan-option-name">
                  {option.name}
                  {isCurrent && <span className="nm-plan-tag"><CheckCircle size={13} weight="fill" aria-hidden="true" /> Đang dùng</span>}
                  {option.featured && <span className="nm-plan-tag nm-plan-tag--featured">Đề xuất</span>}
                </span>
                <span className="nm-plan-option-description">{unavailable && !isFree && currentPlan ? 'Có thể chọn sau khi gói hiện tại hết hạn' : option.description}</span>
              </span>
              <span className="nm-plan-option-price">
                <strong>{option.price}</strong>
                <small>{option.cadence}</small>
              </span>
            </label>
          )
        })}
      </fieldset>
    </section>
  )
}

function PricingComparison({ selectedPlan, plans }: { selectedPlan: PaidPlanTier; plans: PricingPlan[] }) {
  const comparisonRows = getPricingComparisonRows(plans)
  return (
    <section className="nm-payment-comparison" aria-labelledby="comparison-title">
      <div className="nm-payment-section-heading">
        <div>
          <span className="nm-payment-section-kicker">So sánh rõ ràng</span>
          <h2 id="comparison-title">Quyền lợi từng gói</h2>
          <p className="nm-payment-comparison-intro">Chọn mức đồng hành vừa vặn nhất với hành trình của mẹ.</p>
        </div>
        <span className="nm-payment-scroll-hint"><ArrowRight size={14} aria-hidden="true" /> Vuốt ngang để xem đủ</span>
      </div>
      <div className="nm-payment-table-scroll" tabIndex={0} role="region" aria-label="Bảng so sánh quyền lợi, có thể cuộn ngang">
        <table>
          <caption className="sr-only">So sánh quyền lợi theo thứ tự Miễn phí, Toàn diện và Cơ bản</caption>
          <thead>
            <tr>
              <th scope="col">Quyền lợi</th>
              {plans.map((plan) => (
                <th
                  scope="col"
                  key={plan.tier}
                  className={`${plan.featured ? 'is-featured' : ''}${plan.tier === selectedPlan ? ' is-selected' : ''}`}
                >
                  <div className="nm-payment-plan-heading">
                    <span className="nm-payment-plan-heading__icon"><PlanIcon tier={plan.tier} size={20} /></span>
                    <span className="nm-payment-plan-heading__copy">
                      <strong>{plan.name}</strong>
                      <small>{plan.price} · {plan.cadence}</small>
                    </span>
                    {plan.featured && <span className="nm-payment-plan-heading__badge"><Sparkle size={11} weight="fill" aria-hidden="true" /> Đề xuất</span>}
                    {plan.tier === selectedPlan && <span className="nm-payment-plan-heading__selected"><Check size={10} weight="bold" aria-hidden="true" /> Đã chọn</span>}
                  </div>
                  {plan.tier === selectedPlan && <span className="sr-only">, đang chọn</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row.label}>
                <th scope="row"><span className="nm-payment-feature-label">{row.label}</span>{row.cells[0]?.code === 'AI_SCAN' && <small className="nm-feature-soon">Sắp ra mắt</small>}</th>
                {row.cells.map((cell) => (
                  <td
                    key={cell.tier}
                    className={`${cell.tier === 'PLAN_399K' ? 'is-featured' : ''}${cell.tier === selectedPlan ? ' is-selected' : ''}`}
                  >
                    {cell.detail ? (
                      <span className="nm-payment-feature-detail">{cell.detail}</span>
                    ) : cell.included ? (
                      <span className="nm-payment-success-check"><Check size={18} weight="bold" aria-hidden="true" /><span className="sr-only">Có</span></span>
                    ) : (
                      <span className="nm-payment-unavailable"><Minus size={16} aria-hidden="true" /><span className="sr-only">Không</span></span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PaymentSupport({ plans }: { plans: PricingPlan[] }) {
  const supportItems = [
    { question: 'Gói trả phí có thời hạn bao lâu?', answer: plans.filter((plan) => plan.tier !== 'FREE').map((plan) => `${plan.name}: ${plan.cadence}.`).join(' ') + ' Khi gia hạn, thời gian được cộng vào hạn sử dụng còn lại.' },
    { question: 'Thanh toán và kích hoạt như thế nào?', answer: 'Thanh toán qua VietQR trên payOS. Quyền lợi được cập nhật khi NutriMom xác nhận giao dịch thành công.' },
  ]
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const reduceMotion = useReducedMotion()

  return (
    <motion.section
      className="nm-payment-support"
      aria-labelledby="payment-support-title"
      initial={reduceMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, amount: 0.18 }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
    >
      <div className="nm-payment-support__heading">
        <span className="nm-payment-section-kicker">Thông tin cần biết</span>
        <h2 id="payment-support-title">Trước khi mẹ chọn gói</h2>
      </div>
      <div className="nm-payment-support__list">
        {supportItems.map((item, index) => {
          const open = openIndex === index
          const panelId = `payment-support-panel-${index}`
          const triggerId = `payment-support-trigger-${index}`
          return (
            <motion.article
              className={`nm-payment-support__item${open ? ' is-open' : ''}`}
              key={item.question}
              variants={reduceMotion ? undefined : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                id={triggerId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
              >
                <span className="nm-payment-support__number">{String(index + 1).padStart(2, '0')}</span>
                <span>{item.question}</span>
                <Plus className="nm-payment-support__plus" size={20} aria-hidden="true" />
              </button>
              <div
                id={panelId}
                className="nm-payment-support__panel"
                role="region"
                aria-labelledby={triggerId}
                aria-hidden={!open}
              >
                <div><p>{item.answer}</p></div>
              </div>
            </motion.article>
          )
        })}
      </div>
    </motion.section>
  )
}

interface PaymentSummaryProps {
  plan: PricingPlan
  screen: 'select' | 'review'
  payment: PaymentResponse | null
  busy: boolean
  blocked: boolean
  retrySeconds: number
  error: string | null
  onContinue: () => void
  onStartPayment: () => void
  onConfirmDemo: () => void
}

function PaymentSummary({
  plan,
  screen,
  payment,
  busy,
  blocked,
  retrySeconds,
  error,
  onContinue,
  onStartPayment,
  onConfirmDemo,
}: PaymentSummaryProps) {
  const reduceMotion = useReducedMotion()
  const demo = payment ? isDemoCheckout(payment.checkout_url) : false
  const amount = payment?.amount ?? plan.amount

  return (
    <motion.aside
      className="nm-payment-summary"
      aria-labelledby="summary-title"
      layout
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="nm-payment-summary-label" id="summary-title">{screen === 'review' ? 'Tóm tắt thanh toán' : 'Gói bạn chọn'}</span>
      <div className="nm-payment-summary-plan">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            className="nm-plan-icon"
            key={plan.tier}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.78, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.82, rotate: 8 }}
            transition={reduceMotion ? { duration: .01 } : { type: 'spring', stiffness: 420, damping: 28 }}
          >
            <PlanIcon tier={plan.tier} size={27} />
          </motion.span>
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={plan.tier}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2>{plan.name}</h2><p>{plan.cadence}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {screen === 'select' && (
        <ul className="nm-payment-benefits">
          {plan.features.filter((feature) => feature.included).map((feature) => (
            <li key={feature.label}>
              <Check className="nm-payment-success-check" size={16} weight="bold" aria-hidden="true" />
              <span>{feature.label}{feature.code === 'AI_SCAN' && <small>Sắp ra mắt</small>}{feature.detail && <small>{feature.detail}</small>}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="nm-payment-totals">
        <div><dt>{plan.name}</dt><dd><AnimatedPaymentAmount value={amount} /></dd></div>
        <div className="nm-payment-grand-total"><dt>Tổng thanh toán</dt><dd><AnimatedPaymentAmount value={amount} /></dd></div>
      </dl>

      {error && <div className="nm-payment-inline-error" role="alert"><WarningCircle size={18} aria-hidden="true" /><span>{error}</span></div>}
      <div className="sr-only" role="status" aria-live="polite">{busy ? 'Đang xử lý yêu cầu thanh toán' : ''}</div>

      {screen === 'select' ? (
        <button className="nm-payment-primary" type="button" disabled={blocked} onClick={onContinue}>
          Tiếp tục xác nhận <ArrowRight size={18} aria-hidden="true" />
        </button>
      ) : payment ? (
        demo ? (
          <button className="nm-payment-primary" type="button" onClick={onConfirmDemo} disabled={busy || retrySeconds > 0}>
            {busy ? <CircleNotch className="nm-payment-spinner" size={19} aria-hidden="true" /> : <CheckCircle size={19} aria-hidden="true" />}
            {busy ? 'Đang xác nhận...' : 'Xác nhận thử nghiệm'}
          </button>
        ) : payment.checkout_url ? (
          <a className="nm-payment-primary" href={payment.checkout_url}>Mở cổng payOS <ArrowRight size={18} aria-hidden="true" /></a>
        ) : (
          <Link className="nm-payment-primary" to="/app/profile/support">Liên hệ hỗ trợ <ArrowRight size={18} aria-hidden="true" /></Link>
        )
      ) : (
        <button className="nm-payment-primary" type="button" disabled={busy || blocked || retrySeconds > 0} onClick={onStartPayment}>
          {busy && <CircleNotch className="nm-payment-spinner" size={19} aria-hidden="true" />}
          {retrySeconds > 0 ? `Thử lại sau ${retrySeconds}s` : busy ? 'Đang tạo thanh toán...' : 'Xác nhận thanh toán'}
          {!busy && <ArrowRight size={18} aria-hidden="true" />}
        </button>
      )}

      <p className="nm-payment-secure"><ShieldCheck size={16} aria-hidden="true" /> Xem lại đơn trước khi thanh toán.</p>
      <Link className="nm-payment-help" to="/app/profile/support">Cần hỗ trợ chọn gói?</Link>
    </motion.aside>
  )
}

function PaidPricingFlow({ planTier, screen, plans }: { planTier: PaidPlanTier; screen: 'select' | 'review'; plans: PricingPlan[] }) {
  const { subscription } = useEntitlements()
  const cooldown = usePaymentCooldown()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const plan = getPricingPlan(planTier, plans)!
  const [paymentData, setPayment] = useState<PaymentResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)
  const checkoutKeys = useRef(new Map<PaidPlanTier, string>())
  const heading = useRef<HTMLHeadingElement>(null)
  const currentFlow = useRef(`${planTier}:${screen}`)
  const flowKey = `${planTier}:${screen}`
  const payment = screen === 'review' && paymentData?.plan_tier === planTier ? paymentData : null

  useEffect(() => {
    currentFlow.current = flowKey
  }, [flowKey])

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    heading.current?.focus({ preventScroll: true })
  }, [screen])

  function selectPlan(tier: PaidPlanTier) {
    if (submitting.current) return
    setPayment(null)
    setError(null)
    navigate(getPricingSelectUrl(tier), { replace: true })
  }

  function continueToReview() {
    if (submitting.current) return
    setError(null)
    setPayment(null)
    navigate(getPricingReviewUrl(planTier))
  }

  function goBack() {
    if (submitting.current) return
    navigate(screen === 'review' ? getPricingSelectUrl(planTier) : '/app/pricing')
  }

  async function startPayment() {
    if (submitting.current || cooldown.blocked || screen !== 'review') return
    const requestedFlow = flowKey
    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      const current = await refreshEntitlements()
      if (!canPurchasePlan(current.plan_id, planTier)) throw new Error('Gói này chưa thể mua khi gói hiện tại còn hiệu lực. Vui lòng quay lại bảng giá.')
      if (currentFlow.current !== requestedFlow) return
      const idempotencyKey = checkoutKeys.current.get(planTier) ?? createCheckoutIdempotencyKey(planTier)
      checkoutKeys.current.set(planTier, idempotencyKey)
      const order = await paymentApi.createCheckout(planTier, idempotencyKey)
      if (currentFlow.current !== requestedFlow) return
      setPayment(order)
      if (!order.checkout_url) throw new Error('Chưa nhận được đường dẫn thanh toán. Vui lòng liên hệ hỗ trợ với mã đơn bên dưới.')
      if (!isDemoCheckout(order.checkout_url)) window.location.assign(order.checkout_url)
    } catch (requestError) {
      cooldown.handleRateLimit(requestError)
      if (currentFlow.current === requestedFlow) {
        setError(requestError instanceof Error ? requestError.message : 'Chưa thể tạo thanh toán. Vui lòng thử lại.')
      }
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  async function confirmDemo() {
    if (!payment || !isDemoCheckout(payment.checkout_url) || submitting.current || cooldown.blocked) return
    const requestedFlow = flowKey
    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      await paymentApi.confirmMockPayment(payment.order_code)
      if (currentFlow.current !== requestedFlow) return
      navigate(`/payment/success?orderCode=${payment.order_code}`)
    } catch (requestError) {
      cooldown.handleRateLimit(requestError)
      if (currentFlow.current === requestedFlow) {
        setError(requestError instanceof Error ? requestError.message : 'Chưa thể xác nhận thanh toán thử nghiệm.')
      }
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  if (subscription && !canPurchasePlan(subscription.plan_id, planTier)) return <main className="nm-payment-page"><SubscriptionStatus /><div className="nm-pricing-feedback" role="status"><WarningCircle size={24} /><div><h1>Gói này chưa thể mua lúc này</h1><p>Bạn có thể gia hạn gói hiện tại hoặc chọn gói có thêm quyền lợi.</p></div><Link className="secondary-button" to="/app/pricing#pricing">Xem các gói phù hợp</Link></div></main>

  return (
    <motion.main
      className="nm-payment-page"
      id="pricing"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="nm-payment-topline">
        <button className="nm-payment-back" type="button" onClick={goBack} disabled={busy}>
          <ArrowLeft size={17} aria-hidden="true" /> {screen === 'review' ? 'Quay lại chọn gói' : 'Quay lại bảng giá'}
        </button>
      </div>

      <header className="nm-payment-heading">
        <div className="nm-payment-heading__copy">
          <span className="nm-payment-kicker">Gói chăm sóc NutriMom</span>
          <h1 ref={heading} tabIndex={-1}>{screen === 'review' ? 'Xác nhận gói của mẹ.' : 'Chọn gói thật nhẹ nhàng.'}</h1>
          <p>{screen === 'review' ? 'Kiểm tra lại gói, phương thức và tổng tiền trước khi thanh toán.' : 'So sánh quyền lợi, đổi lựa chọn bất cứ lúc nào trước bước xác nhận.'}</p>
        </div>
        <div className="nm-payment-heading__secure" aria-label="Thanh toán dễ dàng">
          <span><ShieldCheck size={22} weight="duotone" aria-hidden="true" /></span>
          Thanh toán dễ dàng
        </div>
      </header>

      <PaymentSteps current={payment ? 3 : screen === 'review' ? 2 : 1} />

      <div className={`nm-payment-grid${screen === 'review' ? ' nm-payment-grid--review' : ''}`}>
        <div className="nm-payment-main">
          <SubscriptionStatus showLink={false} />

          {screen === 'review' ? (
            <>
              <section className="nm-payment-section nm-payment-review" aria-labelledby="review-title">
                <div className="nm-payment-section-heading">
                  <div><span className="nm-payment-section-kicker">Lựa chọn của bạn</span><h2 id="review-title">Gói dịch vụ</h2></div>
                  <button className="nm-payment-text-button" type="button" onClick={goBack} disabled={busy}>Thay đổi</button>
                </div>
                <div className="nm-payment-review-plan">
                  <span className="nm-plan-icon"><PlanIcon tier={plan.tier} size={29} /></span>
                  <div><h3>{plan.name}</h3><p>{plan.cadence}</p></div>
                  <strong>{plan.price}</strong>
                </div>
                {subscription?.paid && <p className="nm-payment-purchase-note">{subscription.plan_id === planTier ? `Gia hạn thêm ${plan.durationDays} ngày vào hạn sử dụng còn lại.` : `Quyền lợi của gói mới có hiệu lực ngay khi kích hoạt. Hạn sử dụng được cộng thêm ${plan.durationDays} ngày vào thời gian còn lại.`}</p>}
                <ul className="nm-payment-benefits">
                  {plan.features.filter((feature) => feature.included).map((feature) => (
                    <li key={feature.label}><Check className="nm-payment-success-check" size={17} weight="bold" aria-hidden="true" /><span>{feature.label}{feature.code === 'AI_SCAN' && <small>Sắp ra mắt</small>}{feature.detail && <small>{feature.detail}</small>}</span></li>
                  ))}
                </ul>
              </section>
              <section className="nm-payment-section" aria-labelledby="method-title">
                <div className="nm-payment-section-heading"><div><span className="nm-payment-section-kicker">Bảo mật và thuận tiện</span><h2 id="method-title">Phương thức thanh toán</h2></div></div>
                <div className="nm-payment-method">
                  <span className="nm-plan-icon"><QrCode size={29} weight="duotone" aria-hidden="true" /></span>
                  <div><h3>Chuyển khoản VietQR</h3><p>Qua cổng thanh toán payOS</p></div>
                  <CheckCircle className="nm-payment-success-check" size={23} weight="fill" aria-hidden="true" />
                </div>
                <ol className="nm-payment-instructions">
                  <li>Chuyển sang payOS để xem mã QR và thông tin chuyển khoản.</li>
                  <li>Quét mã bằng ứng dụng ngân hàng của bạn.</li>
                  <li>Trở về NutriMom để xem trạng thái giao dịch.</li>
                </ol>
              </section>
              {payment && (
                <div className="nm-payment-notice" role="status">
                  <QrCode size={22} aria-hidden="true" />
                  <div>
                    <strong>{isDemoCheckout(payment.checkout_url) ? 'Thanh toán thử nghiệm' : 'Đơn thanh toán đã sẵn sàng'}</strong>
                    <p>Mã đơn #{payment.order_code}</p>
                    <p>{isDemoCheckout(payment.checkout_url) ? 'Đây là giao dịch mô phỏng, không chuyển tiền thật.' : 'Nếu chưa được chuyển hướng, hãy mở lại cổng payOS trong phần tóm tắt.'}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <PlanSelector plans={plans} currentPlan={subscription?.plan_id} selectedPlan={planTier} onSelect={selectPlan} />
              <PricingComparison plans={plans} selectedPlan={planTier} />
            </>
          )}
        </div>

        <PaymentSummary
          plan={plan}
          screen={screen}
          payment={payment}
          busy={busy}
          blocked={!subscription}
          retrySeconds={cooldown.remaining}
          error={error}
          onContinue={continueToReview}
          onStartPayment={() => void startPayment()}
          onConfirmDemo={() => void confirmDemo()}
        />
      </div>

      {screen === 'select' && <PaymentSupport plans={plans} />}
    </motion.main>
  )
}

export function PricingPage() {
  const catalog = usePricingCatalog()
  const [params] = useSearchParams()
  const flow = parsePricingFlow(params.get('plan'), params.get('step'))

  if (flow.screen === 'invalid') return <Navigate to="/app/pricing" replace />
  if (flow.screen === 'catalog') return <MemberPricingCatalog plans={catalog.plans} loading={catalog.loading} error={catalog.error} retryAt={catalog.retryAt} onRetry={catalog.reload} />
  if (catalog.loading && !catalog.data) return <main className="nm-payment-page"><PricingSkeleton /></main>
  if (catalog.error || !catalog.plans.length) return <main className="nm-payment-page"><ResourceFeedback error={catalog.error} retryAt={catalog.retryAt} onRetry={catalog.reload} /></main>
  if (!getPricingPlan(flow.plan, catalog.plans)) return <Navigate to="/app/pricing" replace />

  return (
    <AnimatePresence mode="wait" initial={false}>
      <PaidPricingFlow plans={catalog.plans} key={flow.screen} planTier={flow.plan} screen={flow.screen} />
    </AnimatePresence>
  )
}
