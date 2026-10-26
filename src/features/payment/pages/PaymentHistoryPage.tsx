import { ArrowClockwise, ArrowLeft, ArrowRight, ArrowUpRight, Receipt, ShieldCheck } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatedSelect } from '@/components/ui/animated-select'
import { getSessionScope } from '@/core/auth/token-store'
import { usePaymentHistory } from '../hooks/usePaymentHistory'
import { PaymentOrderDetail } from '../components/PaymentOrderDetail'
import { paymentDateTime as dateTime } from '../model/payment-lifecycle'
import { PaymentStatusBadge } from '../components/PaymentStatusBadge'
import { historyQueryString, parseHistoryQuery, paymentStatusLabels } from '../model/payment-history'
import { formatPaymentAmount } from '../model/subscription-plans'
import '../styles/payment-history.css'

const statusOptions = [{ value: '', label: 'Tất cả trạng thái' }, ...Object.entries(paymentStatusLabels).map(([value, label]) => ({ value, label }))]
const planOptions = [{ value: '', label: 'Tất cả gói' }, { value: 'PLAN_99K', label: 'Gói Cơ bản 99K' }, { value: 'PLAN_399K', label: 'Gói Toàn diện 399K' }]

export function PaymentHistoryPage() {
  const [params, setParams] = useSearchParams()
  const query = parseHistoryQuery(params)
  const resource = usePaymentHistory(query)
  const scope = getSessionScope()
  const [selection, setSelection] = useState<{ code: number; scope: string } | null>(null)
  const selected = selection?.scope === scope ? selection.code : null
  function setSelected(code: number | null) { setSelection(code === null ? null : { code, scope }) }
  const reduce = useReducedMotion()
  const key = historyQueryString(query)
  const data = resource.data
  useEffect(() => {
    if (resource.loading || resource.error || !data || data.items.length || query.page <= Math.max(1, data.total_pages)) return
    const next = new URLSearchParams(key)
    next.set('page', String(Math.max(1, data.total_pages)))
    setParams(next, { replace: true })
  }, [resource.loading, resource.error, data, query.page, key, setParams])
  function change(values: Record<string, string>) {
    const next = new URLSearchParams(key)
    next.set('page', '1')
    for (const [name, value] of Object.entries(values)) { if (value) next.set(name, value); else next.delete(name) }
    setParams(next)
  }
  const rowMotion = (index: number) => ({ initial: reduce ? false as const : { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: .26, delay: reduce ? 0 : Math.min(index, 8) * .035 } })
  return <main className="nm-history-page">
    <header className="nm-history-banner">
      <picture className="nm-history-banner-picture">
        <source type="image/webp" srcSet={`${import.meta.env.BASE_URL}bannerpayment-960.webp 960w, ${import.meta.env.BASE_URL}bannerpayment-1920.webp 1920w`} sizes="100vw" />
        <img src={`${import.meta.env.BASE_URL}bannerpayment.png`} width="2172" height="724" alt="" fetchPriority="high" decoding="async" />
      </picture>
      <div className="nm-history-banner-inner">
        <motion.div className="nm-history-heading" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}>
          <Link className="nm-history-back" to="/app/profile"><ArrowLeft size={16} aria-hidden="true" />Không gian cá nhân</Link><span className="nm-history-eyebrow">GÓI CHĂM SÓC CỦA BẠN</span><h1>Lịch sử giao dịch<span>.</span></h1><p>Mỗi lần đồng hành, được lưu lại rõ ràng.</p>
        </motion.div>
      </div>
    </header>
    <div className="nm-history-content">
    <section className="nm-history-card" aria-label="Giao dịch của bạn">
      <div className="nm-history-toolbar"><div><h2>Giao dịch của bạn</h2><p>Theo dõi gói đã mua và trạng thái từng đơn.</p></div><button className="nm-history-button is-secondary" type="button" disabled={resource.loading || resource.cooldown.blocked} onClick={resource.reload}><ArrowClockwise size={16} aria-hidden="true" />{resource.cooldown.remaining ? `Chờ ${resource.cooldown.remaining}s` : 'Làm mới'}</button></div>
      <div className="nm-history-filters"><AnimatedSelect label="Trạng thái" value={query.status ?? ''} options={statusOptions} onValueChange={(status) => change({ status })} /><AnimatedSelect label="Gói dịch vụ" value={query.planTier ?? ''} options={planOptions} onValueChange={(planTier) => change({ planTier })} /><span className="nm-history-timezone">Thời gian hiển thị theo giờ Việt Nam</span></div>
      <div aria-busy={resource.loading}>
        {resource.loading && !data ? <div className="nm-history-skeleton" role="status" aria-label="Đang tải lịch sử giao dịch">{[0, 1, 2, 3].map((i) => <div key={i}><span /><span /><span /></div>)}</div> : resource.error ? <div className="nm-history-empty" role="alert"><Receipt size={32} /><h3>Chưa thể tải giao dịch</h3><p>{resource.error}</p><button className="nm-history-button" type="button" disabled={resource.cooldown.blocked} onClick={resource.reload}>{resource.cooldown.remaining ? `Thử lại sau ${resource.cooldown.remaining}s` : 'Thử lại'}</button></div> : !data?.items.length ? <div className="nm-history-empty"><Receipt size={38} weight="duotone" aria-hidden="true" /><h3>{query.status || query.planTier || query.page > 1 ? 'Không có giao dịch phù hợp' : 'Chưa có giao dịch nào'}</h3><p>{query.status || query.planTier || query.page > 1 ? 'Thử đổi bộ lọc hoặc quay về trang đầu để xem thêm.' : 'Các giao dịch gói chăm sóc sẽ được lưu tại đây.'}</p>{query.status || query.planTier || query.page > 1 ? <button className="nm-history-button" type="button" onClick={() => setParams({})}>Xem tất cả giao dịch</button> : <Link className="nm-history-button" to="/app/pricing">Khám phá các gói<ArrowUpRight size={16} /></Link>}</div> : <>
          <div className="nm-history-table-wrap"><table className="nm-history-table"><caption className="sr-only">Lịch sử giao dịch gói dịch vụ</caption><thead><tr><th>Mã đơn / Ngày tạo</th><th>Gói dịch vụ / Giá trị</th><th>Trạng thái</th><th>Thanh toán lúc</th><th><span className="sr-only">Chi tiết</span></th></tr></thead><tbody key={key}>{data.items.map((item, index) => <motion.tr key={item.id} {...rowMotion(index)}><td><strong>#{item.order_code}</strong><small>{dateTime(item.created_at)}</small></td><td><strong>{item.plan_name}</strong><small>{formatPaymentAmount(item.amount)}</small></td><td><PaymentStatusBadge status={item.status} /></td><td>{dateTime(item.paid_at)}</td><td><button className="nm-history-view" type="button" aria-label={`Xem giao dịch ${item.order_code}`} onClick={() => setSelected(item.order_code)}>Chi tiết<ArrowUpRight size={15} aria-hidden="true" /></button></td></motion.tr>)}</tbody></table></div>
          <div className="nm-history-mobile-list" key={key}>{data.items.map((item, index) => <motion.article className="nm-history-mobile-item" key={item.id} {...rowMotion(index)}><div><strong>#{item.order_code}</strong><PaymentStatusBadge status={item.status} /></div><h3>{item.plan_name}</h3><strong>{formatPaymentAmount(item.amount)}</strong><dl><div><dt>Ngày tạo</dt><dd>{dateTime(item.created_at)}</dd></div><div><dt>Thanh toán</dt><dd>{dateTime(item.paid_at)}</dd></div></dl><button className="nm-history-view" type="button" onClick={() => setSelected(item.order_code)} aria-label={`Xem giao dịch ${item.order_code}`}>Chi tiết giao dịch<ArrowUpRight size={15} aria-hidden="true" /></button></motion.article>)}</div>
        </>}
      </div>
      <footer className="nm-history-pagination"><p role="status" aria-live="polite">{data ? `${data.total_items} giao dịch · Trang ${data.page} / ${Math.max(1, data.total_pages)}` : 'Lịch sử giao dịch'}</p><label>Số dòng<select value={query.pageSize} onChange={(event) => change({ pageSize: event.target.value })}>{[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select></label><div><button type="button" className="nm-history-page-button" aria-label="Trang trước" disabled={resource.loading || resource.cooldown.blocked || query.page <= 1} onClick={() => change({ page: String(query.page - 1) })}><ArrowLeft size={18} /></button><button type="button" className="nm-history-page-button" aria-label="Trang sau" disabled={resource.loading || resource.cooldown.blocked || !data || query.page >= data.total_pages} onClick={() => change({ page: String(query.page + 1) })}><ArrowRight size={18} /></button></div></footer>
    </section>
    <p className="nm-history-footnote"><ShieldCheck size={17} aria-hidden="true" />Trạng thái được ghi nhận theo từng mã đơn. Mở chi tiết để kiểm tra giao dịch đang chờ.</p>
    </div>
    {selected !== null && <PaymentOrderDetail key={`${getSessionScope()}:${selected}`} code={selected} initialStatus={data?.items.find((item) => item.order_code === selected)?.status} onClose={() => setSelected(null)} onUpdated={(order) => { const old = data?.items.find((item) => item.order_code === order.order_code); if (!old || old.status !== order.status || old.updated_at !== order.updated_at) resource.refreshAfterChange() }} />}
  </main>
}
