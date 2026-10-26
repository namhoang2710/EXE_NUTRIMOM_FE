import { ArrowRight } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import { AnimatedNumber } from '@/shared/components/AnimatedNumber'
import { useEntitlements } from '../hooks/useEntitlements'
import {
  overviewSubscriptionAction,
  subscriptionExpiry,
} from '../model/overview-subscription'
import './overview-subscription.css'
const dateNumber = (value: number) => String(value)

export function OverviewSubscriptionBand() {
  const state = useEntitlements()
  const element = useRef<HTMLElement>(null)
  const inView = useInView(element, { once: true, amount: 0.15 })
  const reduced = useReducedMotion()
  const [focused, setFocused] = useState(false)
  const visible = inView || focused || Boolean(reduced)
  const subscription = state.subscription
  const expiry = subscription?.paid
    ? subscriptionExpiry(subscription.end_date)
    : null
  const action = subscription ? overviewSubscriptionAction(subscription) : null
  return (
    <section
      ref={element}
      id="overview-subscription"
      className="nm-overview-membership"
      aria-label="Gói của bạn"
      onFocusCapture={() => setFocused(true)}
      data-revealed={visible}
    >
      <div className="nm-overview-membership__inner">
        {!subscription ? (
          state.loading ? (
            <div
              className="nm-overview-membership__skeleton"
              role="status"
              aria-label="Đang tải gói của bạn"
            >
              <span />
              <span />
            </div>
          ) : (
            <div className="nm-overview-membership__unavailable" role="status">
              <p>Chưa tải được thông tin gói của bạn.</p>
              <Link to="/app/pricing#pricing">
                Xem thông tin các gói{' '}
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
            </div>
          )
        ) : (
          <>
            <motion.div
              className="nm-overview-membership__copy"
              initial={false}
              animate={{
                opacity: visible ? 1 : 0,
                y: visible ? 0 : 16,
                filter: visible ? 'blur(0px)' : 'blur(6px)',
              }}
              transition={{
                duration: reduced ? 0 : 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <p className="nm-overview-membership__eyebrow">
                Gói hiện tại của bạn
              </p>
              <h2>
                {subscription.paid
                  ? subscription.plan_name
                  : 'Đồng hành cùng bé & gia đình chu đáo hơn'}
              </h2>
              {!subscription.paid && (
                <p className="nm-overview-membership__free">
                  Khám phá thêm những quyền lợi dành cho mẹ và gia đình.
                </p>
              )}
              {state.error && (
                <p className="nm-overview-membership__stale" role="status">
                  Đang hiển thị thông tin gói đã tải gần nhất.
                </p>
              )}
            </motion.div>
            <motion.div
              className="nm-overview-membership__details"
              initial={false}
              animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 14 }}
              transition={{
                duration: reduced ? 0 : 0.7,
                delay: reduced ? 0 : 0.12,
              }}
            >
              {subscription.paid && (
                <p className="nm-overview-membership__expiry">
                  {expiry ? (
                    <>
                      Có hiệu lực đến{' '}
                      <time
                        dateTime={subscription.end_date!}
                        aria-label={expiry.label}
                      >
                        <span aria-hidden="true" key={subscription.end_date}>
                          <AnimatedNumber value={expiry.day} start={visible} />{' '}
                          thg{' '}
                          <AnimatedNumber
                            value={expiry.month}
                            start={visible}
                          />
                          ,{' '}
                          <AnimatedNumber
                            value={expiry.year}
                            formatter={dateNumber}
                            start={visible}
                          />
                        </span>
                      </time>
                    </>
                  ) : (
                    'Chưa có thông tin ngày hết hạn'
                  )}
                </p>
              )}
              {action && (
                <Link className="nm-overview-membership__action" to={action.to}>
                  {action.label}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              )}
            </motion.div>
          </>
        )}
      </div>
    </section>
  )
}
