import { CheckCircle, LockKey, Lifebuoy, ShieldCheck, Sparkle } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import type { PlanTier } from '@/features/payment/model/payment-types'
import { PricingCatalogGrid } from '@/features/payment/components/PricingCatalogGrid'
import '@/features/payment/styles/pricing-catalog.css'

interface PublicPricingSectionProps {
  isAuthenticated: boolean
  currentPlanTier?: PlanTier
}

export function PublicPricingSection({ isAuthenticated, currentPlanTier }: PublicPricingSectionProps) {
  const reduceMotion = useReducedMotion()

  return (
    <section className="publicPricing" id="pricing" aria-labelledby="pricing-title">
      <div className="publicPricing__inner landing-section">
        <motion.header
          className="publicPricing__heading"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="publicPricing__eyebrow"><Sparkle size={15} weight="fill" aria-hidden="true" /> GÓI ĐỒNG HÀNH CÙNG MẸ</span>
          <h2 id="pricing-title">Chọn sự đồng hành phù hợp<br /> <em>cho hành trình của mẹ.</em></h2>
          <p>Bắt đầu miễn phí, nâng cấp khi cần thêm công cụ theo dõi và chăm sóc toàn diện trong suốt thai kỳ.</p>
        </motion.header>

        <PricingCatalogGrid
          context="public"
          isAuthenticated={isAuthenticated}
          currentPlanTier={currentPlanTier}
        />

        <motion.ul
          className="publicPricing__trust"
          aria-label="Cam kết dịch vụ NutriMom"
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={reduceMotion ? undefined : { opacity: 1 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <li><LockKey size={18} weight="duotone" aria-hidden="true" /><span><strong>Bảo mật</strong> thông tin sức khỏe</span></li>
          <li><CheckCircle size={18} weight="duotone" aria-hidden="true" /><span><strong>Minh bạch</strong> trong từng quyền lợi</span></li>
          <li><Lifebuoy size={18} weight="duotone" aria-hidden="true" /><span><strong>Luôn hỗ trợ</strong> khi bạn cần</span></li>
        </motion.ul>

        <p className="publicPricing__disclaimer"><ShieldCheck size={16} weight="fill" aria-hidden="true" /> NutriMom cung cấp công cụ đồng hành và không thay thế tư vấn, chẩn đoán hoặc điều trị y khoa.</p>
      </div>
    </section>
  )
}
