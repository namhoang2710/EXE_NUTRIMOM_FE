import { ArrowLeft, ArrowRight, Check, CheckCircle, CircleNotch, Heart, Leaf, QrCode, ShieldCheck, Sparkle, Users, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { paymentApi } from '../api/payment-api'
import { PaymentSteps } from '../components/PaymentSteps'
import { useSubscription } from '../hooks/useSubscription'
import { formatPaymentAmount, getSubscriptionPlan, isDemoCheckout, subscriptionPlans } from '../model/subscription-plans'
import type { PaymentResponse, PlanTier } from '../model/payment-types'
import '../styles/payment.css'

const comparison = [
  { label: 'Liên kết gia đình', values: ['Chưa bao gồm', 'Chưa bao gồm', 'Có'] },
  { label: 'Tính ngày thụ thai', values: ['Chưa bao gồm', 'Có', 'Có'] },
  { label: 'Hồ sơ sức khỏe', values: ['Cơ bản', 'Chưa có hồ sơ nâng cao', 'Lưu trọn đời'] },
  { label: 'AI scan món ăn', values: ['Có', '2 lần / ngày', 'Không giới hạn'] },
  { label: 'Gợi ý cá nhân hóa toàn diện', values: ['Chưa bao gồm', 'Chưa bao gồm', 'Có'] },
]

function PlanIcon({ tier, size = 24 }: { tier: PlanTier; size?: number }) {
  const Icon = tier === 'FREE' ? Leaf : tier === 'PLAN_99K' ? Sparkle : Users
  return <Icon size={size} weight="duotone" aria-hidden="true" />
}

export function PricingPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const plan = getSubscriptionPlan(params.get('plan'))
  const reviewing = params.get('step') === 'review' && plan.tier !== 'FREE'
  const { subscription, loading: subscriptionLoading, error: subscriptionError, reload } = useSubscription()
  const [paymentData, setPayment] = useState<PaymentResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const previousStep = useRef(reviewing)
  const currentFlow = useRef<string | null>(null)
  const flowKey = `${plan.tier}:${reviewing}`
  const payment = reviewing && paymentData?.plan_tier === plan.tier ? paymentData : null
  const isCurrent = subscription?.active && subscription.plan_tier === plan.tier
  const demo = payment ? isDemoCheckout(payment.checkout_url) : false

  useEffect(() => {
    currentFlow.current = flowKey
    return () => { currentFlow.current = null }
  }, [flowKey])

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (previousStep.current !== reviewing) {
      heading.current?.focus({ preventScroll: true })
      previousStep.current = reviewing
    }
  }, [reviewing])

  function choosePlan(tier: PlanTier) {
    if (submitting.current) return
    setPayment(null)
    setError(null)
    setParams({ plan: tier }, { replace: true })
  }

  function changeStep(review: boolean) {
    if (submitting.current) return
    setError(null)
    setPayment(null)
    setParams(review ? { plan: plan.tier, step: 'review' } : { plan: plan.tier })
  }

  async function startPayment() {
    if (submitting.current || plan.tier === 'FREE' || subscriptionLoading || subscriptionError) return
    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      const order = await paymentApi.createCheckout(plan.tier)
      if (currentFlow.current !== flowKey) return
      setPayment(order)
      if (!order.checkout_url) throw new Error('Chưa nhận được đường dẫn thanh toán. Vui lòng liên hệ hỗ trợ với mã đơn bên dưới.')
      if (!isDemoCheckout(order.checkout_url)) window.location.assign(order.checkout_url)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Chưa thể tạo thanh toán. Vui lòng thử lại.')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  async function confirmDemo() {
    if (!payment || !demo || submitting.current) return
    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      await paymentApi.confirmMockPayment(payment.order_code)
      if (currentFlow.current !== flowKey) return
      navigate(`/payment/success?orderCode=${payment.order_code}`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Chưa thể xác nhận thanh toán thử nghiệm.')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <main className="nm-payment-page" id="pricing">
      <div className="nm-payment-topline">
        {reviewing ? <button className="nm-payment-back" onClick={() => changeStep(false)} disabled={busy}><ArrowLeft size={17} /> Đổi gói dịch vụ</button> : <Link className="nm-payment-back" to="/app"><ArrowLeft size={17} /> Không gian của bạn</Link>}
        <span><ShieldCheck size={17} /> Thanh toán qua payOS</span>
      </div>

      <header className="nm-payment-heading">
        <span className="nm-payment-kicker">Gói chăm sóc NutriMom</span>
        <h1 ref={heading} tabIndex={-1}>{reviewing ? 'Xác nhận gói của bạn.' : <>Thêm đồng hành.<br /><span>Thêm an tâm.</span></>}</h1>
        <p>{reviewing ? 'Kiểm tra thông tin trước khi chuyển sang cổng thanh toán.' : 'Chọn mức chăm sóc phù hợp với mẹ và gia đình.'}</p>
      </header>

      <PaymentSteps current={payment ? 3 : reviewing ? 2 : 1} />

      <div className={`nm-payment-grid${reviewing ? ' nm-payment-grid--review' : ''}`}>
        <div className="nm-payment-main">
          {subscriptionError ? (
            <div className="nm-payment-notice nm-payment-notice--error" role="alert"><WarningCircle size={21} /><div><strong>Chưa thể tải gói hiện tại</strong><p>{subscriptionError}</p><button className="nm-payment-text-button" onClick={() => void reload()} disabled={subscriptionLoading}>Thử lại</button></div></div>
          ) : (
            <div className="nm-payment-current" role="status">
              <span className="nm-payment-current-icon"><Heart size={19} weight="duotone" /></span>
              <div><strong>{subscriptionLoading ? 'Đang tải gói của bạn…' : `Gói hiện tại: ${subscription?.plan_name ?? 'Chưa xác định'}`}</strong><p>{subscription?.active && subscription.plan_tier !== 'FREE' ? `Còn ${subscription.days_remaining} ngày sử dụng` : 'Một khởi đầu nhẹ nhàng cho hành trình chăm sóc.'}</p></div>
              {!subscriptionLoading && <CheckCircle size={21} className="nm-payment-success-color" />}
            </div>
          )}

          {reviewing ? (
            <>
              <section className="nm-payment-section nm-payment-review" aria-labelledby="review-title">
                <div className="nm-payment-section-heading"><h2 id="review-title">Gói dịch vụ của bạn</h2><button className="nm-payment-text-button" onClick={() => changeStep(false)} disabled={busy}>Thay đổi</button></div>
                <div className="nm-payment-review-plan"><span className="nm-plan-icon"><PlanIcon tier={plan.tier} size={29} /></span><div><h3>{plan.name}</h3><p>30 ngày sử dụng</p></div><strong>{formatPaymentAmount(plan.amount)}</strong></div>
                <ul className="nm-payment-benefits">{plan.benefits.map((benefit) => <li key={benefit}><Check size={17} weight="bold" />{benefit}</li>)}</ul>
                {subscription?.active && subscription.plan_tier !== 'FREE' && <p className="nm-payment-renewal">{isCurrent ? 'Gia hạn thêm 30 ngày từ thời hạn hiện tại.' : `Gói ${plan.name} sẽ thay gói hiện tại; thời hạn được cộng thêm 30 ngày.`}</p>}
              </section>
              <section className="nm-payment-section" aria-labelledby="method-title">
                <h2 id="method-title">Phương thức thanh toán</h2>
                <div className="nm-payment-method"><span className="nm-plan-icon"><QrCode size={29} weight="duotone" /></span><div><h3>Chuyển khoản VietQR</h3><p>Qua cổng thanh toán payOS</p></div><CheckCircle size={23} weight="fill" /></div>
                <ol className="nm-payment-instructions"><li>Chuyển sang payOS để xem mã QR và thông tin chuyển khoản.</li><li>Quét mã bằng ứng dụng ngân hàng của bạn.</li><li>Trở về NutriMom để xem trạng thái kích hoạt.</li></ol>
              </section>
              {payment && <div className="nm-payment-notice" role="status"><QrCode size={22} /><div><strong>{demo ? 'Thanh toán thử nghiệm' : 'Đơn thanh toán đã sẵn sàng'}</strong><p>Mã đơn #{payment.order_code}</p><p>{demo ? 'Đây là giao dịch mô phỏng, không chuyển tiền thật. Xác nhận bên cạnh để thử kích hoạt gói.' : 'Nếu chưa được chuyển hướng, mở lại cổng payOS bằng nút bên cạnh.'}</p></div></div>}
            </>
          ) : (
            <>
              <section aria-labelledby="plans-title">
                <div className="nm-payment-section-heading"><h2 id="plans-title">Chọn gói phù hợp</h2><span>Gói trả phí · 30 ngày</span></div>
                <fieldset className="nm-plan-options"><legend className="sr-only">Gói chăm sóc</legend>
                  {subscriptionPlans.map((option) => <label key={option.tier} className={`nm-plan-option${plan.tier === option.tier ? ' is-selected' : ''}`}>
                    <input type="radio" name="subscription-plan" value={option.tier} checked={plan.tier === option.tier} onChange={() => choosePlan(option.tier)} />
                    <span className="nm-plan-icon"><PlanIcon tier={option.tier} /></span>
                    <span className="nm-plan-option-copy"><span className="nm-plan-option-name">{option.name}{subscription?.active && subscription.plan_tier === option.tier && <span className="nm-plan-tag">Đang dùng</span>}</span><span className="nm-plan-option-description">{option.description}</span></span>
                    <span className="nm-plan-option-price"><strong>{formatPaymentAmount(option.amount)}</strong><small>{option.tier === 'FREE' ? 'miễn phí' : '/ 30 ngày'}</small></span>
                  </label>)}
                </fieldset>
              </section>
              <details className="nm-payment-comparison" open>
                <summary>So sánh quyền lợi<span>Chi tiết các gói</span></summary>
                <div className="nm-payment-table-scroll" tabIndex={0} role="region" aria-label="Bảng so sánh quyền lợi có thể cuộn ngang"><table><caption className="sr-only">Quyền lợi của từng gói NutriMom</caption><thead><tr><th scope="col">Quyền lợi</th>{subscriptionPlans.map((option) => <th scope="col" key={option.tier} className={option.tier === plan.tier ? 'is-selected' : ''}>{option.name}</th>)}</tr></thead><tbody>{comparison.map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{row.values.map((value, index) => <td key={index} className={subscriptionPlans[index]?.tier === plan.tier ? 'is-selected' : ''}>{value === 'Có' ? <><Check size={18} weight="bold" /><span className="sr-only">Có</span></> : value}</td>)}</tr>)}</tbody></table></div>
              </details>
            </>
          )}
        </div>

        <aside className="nm-payment-summary" aria-labelledby="summary-title">
          <span className="nm-payment-summary-label" id="summary-title">{reviewing ? 'Tóm tắt thanh toán' : 'Gói bạn chọn'}</span>
          <div className="nm-payment-summary-plan"><span className="nm-plan-icon"><PlanIcon tier={plan.tier} size={27} /></span><div><h2>{plan.name}</h2><p>{plan.tier === 'FREE' ? 'Bắt đầu miễn phí' : '30 ngày đồng hành'}</p></div></div>
          {!reviewing && <ul className="nm-payment-benefits">{plan.benefits.map((benefit) => <li key={benefit}><Check size={16} weight="bold" />{benefit}</li>)}</ul>}
          <dl className="nm-payment-totals"><div><dt>{plan.tier === 'FREE' ? 'Gói Miễn phí' : `Gói ${plan.name} · 30 ngày`}</dt><dd>{formatPaymentAmount(payment?.amount ?? plan.amount)}</dd></div><div className="nm-payment-grand-total"><dt>Tổng thanh toán</dt><dd>{formatPaymentAmount(payment?.amount ?? plan.amount)}</dd></div></dl>
          {error && <div className="nm-payment-inline-error" role="alert"><WarningCircle size={18} /><span>{error}</span></div>}
          {plan.tier === 'FREE' ? <Link to="/app" className="nm-payment-primary">{subscription?.active && subscription.plan_tier !== 'FREE' ? 'Tiếp tục với gói hiện tại' : 'Tiếp tục miễn phí'}<ArrowRight size={18} /></Link> : payment ? (
            demo ? <button className="nm-payment-primary" onClick={() => void confirmDemo()} disabled={busy}>{busy ? <CircleNotch className="nm-payment-spinner" size={19} /> : <CheckCircle size={19} />}{busy ? 'Đang xác nhận…' : 'Xác nhận thử nghiệm'}</button> : payment.checkout_url ? <a className="nm-payment-primary" href={payment.checkout_url}>Mở cổng payOS<ArrowRight size={18} /></a> : <Link className="nm-payment-primary" to="/app/profile/support">Liên hệ hỗ trợ<ArrowRight size={18} /></Link>
          ) : <button className="nm-payment-primary" disabled={busy || subscriptionLoading || !!subscriptionError} onClick={() => reviewing ? void startPayment() : changeStep(true)}>{busy ? <CircleNotch className="nm-payment-spinner" size={19} /> : null}{busy ? 'Đang tạo thanh toán…' : reviewing ? 'Thanh toán qua payOS' : isCurrent ? 'Gia hạn gói' : 'Tiếp tục'}{!busy && <ArrowRight size={18} />}</button>}
          <p className="nm-payment-secure"><ShieldCheck size={16} />{reviewing ? 'Bạn sẽ thanh toán trên cổng payOS.' : 'Xem lại đơn trước khi thanh toán.'}</p>
          <Link className="nm-payment-help" to="/app/profile/support">Cần hỗ trợ chọn gói?</Link>
        </aside>
      </div>

      {!reviewing && <section className="nm-payment-faq" aria-labelledby="payment-faq-title"><h2 id="payment-faq-title">Trước khi mẹ chọn gói</h2><details><summary>Gói trả phí có thời hạn bao lâu?</summary><p>Mỗi lần thanh toán tương ứng 30 ngày. Nếu đang có gói trả phí còn hiệu lực, thời hạn được cộng thêm 30 ngày.</p></details><details><summary>Thanh toán và kích hoạt như thế nào?</summary><p>Bạn thanh toán qua VietQR trên payOS. NutriMom kiểm tra trạng thái đơn và hiển thị gói sau khi thanh toán được xác nhận.</p></details></section>}
    </main>
  )
}
