import { useEffect, useState, useMemo } from 'react'
import {
  ArrowsClockwise,
  ArrowSquareOut,
  CaretRight,
  ChartBar,
  CreditCard,
  Eye,
  Funnel,
  LinkSimple,
  Money,
  TrendUp,
  Users,
} from '@phosphor-icons/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchTrafficSummary, type SourceMetricDto, type TrafficSummaryResponse } from '../api/admin-traffic'
import { AdminUtmModal } from './AdminUtmModal'
import '../styles/admin-traffic.css'

const SOURCE_COLORS: Record<string, string> = {
  TIKTOK: '#00b4d8',
  FACEBOOK: '#1877F2',
  INSTAGRAM: '#E1306C',
  GOOGLE: '#ea4335',
  DIRECT: '#7264ad',
  OTHER: '#6b7280',
}

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.28 6.28 0 0 0 1.86-4.47V8.78a8.18 8.18 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.86-.21z" />
    </svg>
  )
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95C18.05 21.45 22 17.19 22 12z" />
    </svg>
  )
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.24 10.285V14.4h6.887c-.297 1.87-2.186 5.485-6.887 5.485-4.145 0-7.527-3.435-7.527-7.685s3.382-7.685 7.527-7.685c2.355 0 3.93 1.005 4.83 1.865l3.29-3.17C18.665 1.545 15.68 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c7.06 0 11.75-4.965 11.75-11.96 0-.805-.085-1.42-.19-2.035H12.24z" />
    </svg>
  )
}

function DirectIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  )
}

function ChannelIcon({ source, size = 18 }: { source: string; size?: number }) {
  switch (source) {
    case 'TIKTOK':
      return <TikTokIcon size={size} />
    case 'FACEBOOK':
      return <FacebookIcon size={size} />
    case 'INSTAGRAM':
      return <InstagramIcon size={size} />
    case 'GOOGLE':
      return <GoogleIcon size={size} />
    case 'DIRECT':
      return <DirectIcon size={size} />
    default:
      return <ChartBar size={size} />
  }
}

const formatNumber = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0)
const formatMoney = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)

export function AdminTrafficAnalytics() {
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<TrafficSummaryResponse | null>(null)
  const [utmModalOpen, setUtmModalOpen] = useState(false)
  const [targetUtmSource, setTargetUtmSource] = useState('tiktok')

  const dateRange = useMemo(() => {
    const to = new Date().toISOString().slice(0, 10)
    let from: string | undefined
    const now = new Date()

    if (range === '7d') {
      const d = new Date(now.setDate(now.getDate() - 7))
      from = d.toISOString().slice(0, 10)
    } else if (range === '30d') {
      const d = new Date(now.setDate(now.getDate() - 30))
      from = d.toISOString().slice(0, 10)
    } else if (range === '90d') {
      const d = new Date(now.setDate(now.getDate() - 90))
      from = d.toISOString().slice(0, 10)
    } else {
      from = undefined // All time
    }
    return { from, to }
  }, [range])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchTrafficSummary(dateRange.from, dateRange.to)
      setSummary(res)
    } catch (err) {
      console.error('Failed to load traffic summary', err)
      setError('Không thể tải dữ liệu phân tích lưu lượng. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [dateRange])

  // Donut chart data for Traffic Share
  const donutChartData = useMemo(() => {
    if (!summary || !summary.metrics) return []
    const active = summary.metrics.filter((m) => m.visits > 0)
    if (active.length === 0) {
      return summary.metrics.map((m) => ({
        name: m.display_name,
        source: m.source,
        value: m.visits || (m.signups > 0 ? m.signups : 0),
        share: m.traffic_share,
        color: SOURCE_COLORS[m.source] || '#9ca3af',
      }))
    }
    return active.map((m) => ({
      name: m.display_name,
      source: m.source,
      value: m.visits,
      share: m.traffic_share,
      color: SOURCE_COLORS[m.source] || '#9ca3af',
    }))
  }, [summary])

  // Bar chart data for cross-channel comparison
  const barChartData = useMemo(() => {
    if (!summary || !summary.metrics) return []
    return summary.metrics.map((m) => ({
      name:
        m.source === 'TIKTOK'
          ? 'TikTok'
          : m.source === 'FACEBOOK'
          ? 'Facebook'
          : m.source === 'INSTAGRAM'
          ? 'Instagram'
          : m.source === 'GOOGLE'
          ? 'Google'
          : m.source === 'DIRECT'
          ? 'Trực tiếp'
          : 'Khác',
      fullName: m.display_name,
      source: m.source,
      'Lượt truy cập': m.visits,
      'Đăng ký mới': m.signups,
      'Mua gói': m.purchases,
      revenue: m.revenue,
    }))
  }, [summary])

  // Focused platform metric
  const focusedMetric: SourceMetricDto | undefined = useMemo(() => {
    if (selectedPlatform === 'ALL' || !summary?.metrics) return undefined
    return summary.metrics.find((m) => m.source === selectedPlatform)
  }, [selectedPlatform, summary])

  const openUtmForSource = (source: string) => {
    setTargetUtmSource(source.toLowerCase())
    setUtmModalOpen(true)
  }

  return (
    <section className="admin-traffic-section" aria-labelledby="traffic-analytics-heading">
      <div className="admin-traffic-card">
        {/* Header */}
        <div className="admin-traffic-header">
          <div className="admin-traffic-title-group">
            <h2 id="traffic-analytics-heading">
              <TrendUp size={24} weight="bold" color="#7264ad" />
              Lưu lượng & Hiệu quả tiếp thị
            </h2>
            <p>Thống kê lưu lượng truy cập đa kênh và hiệu quả chuyển đổi người dùng.</p>
          </div>

          <div className="admin-traffic-actions">
            <div className="admin-traffic-pill-group">
              <button
                type="button"
                className={`admin-traffic-pill ${range === '7d' ? 'active' : ''}`}
                onClick={() => setRange('7d')}
              >
                7 ngày
              </button>
              <button
                type="button"
                className={`admin-traffic-pill ${range === '30d' ? 'active' : ''}`}
                onClick={() => setRange('30d')}
              >
                30 ngày
              </button>
              <button
                type="button"
                className={`admin-traffic-pill ${range === '90d' ? 'active' : ''}`}
                onClick={() => setRange('90d')}
              >
                90 ngày
              </button>
              <button
                type="button"
                className={`admin-traffic-pill ${range === 'all' ? 'active' : ''}`}
                onClick={() => setRange('all')}
              >
                Tất cả
              </button>
            </div>

            <button
              type="button"
              className="admin-traffic-btn-refresh"
              onClick={loadData}
              disabled={loading}
              title="Làm mới dữ liệu"
            >
              <ArrowsClockwise size={16} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>

            <button
              type="button"
              className="admin-traffic-btn-utm-trigger"
              onClick={() => openUtmForSource('tiktok')}
              title="Tạo link gắn mã UTM theo dõi chiến dịch"
            >
              <LinkSimple size={16} weight="bold" />
              Tạo link UTM
            </button>

            <a
              href={summary?.ga4_console_url || 'https://analytics.google.com/'}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-traffic-btn-ga4"
              title="Mở Google Analytics 4 Console"
            >
              Báo cáo GA4
              <ArrowSquareOut size={15} weight="bold" />
            </a>
          </div>
        </div>

        {error && <div className="admin-dashboard-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* KPI Ribbon (Toàn hệ thống) */}
        <div className="admin-traffic-kpi-grid">
          <div className="admin-traffic-kpi-card">
            <span className="admin-traffic-kpi-label">
              <Eye size={16} weight="duotone" color="#3b82f6" />
              Tổng lượt truy cập
            </span>
            <span className="admin-traffic-kpi-value">{formatNumber(summary?.total_visits || 0)}</span>
            <span className="admin-traffic-kpi-sub">Lượt xem trang từ mọi kênh</span>
          </div>

          <div className="admin-traffic-kpi-card">
            <span className="admin-traffic-kpi-label">
              <Users size={16} weight="duotone" color="#10b981" />
              Đăng ký mới
            </span>
            <span className="admin-traffic-kpi-value">{formatNumber(summary?.total_signups || 0)}</span>
            <span className="admin-traffic-kpi-sub">Tài khoản mẹ bầu tạo mới</span>
          </div>

          <div className="admin-traffic-kpi-card">
            <span className="admin-traffic-kpi-label">
              <CreditCard size={16} weight="duotone" color="#8b5cf6" />
              Giao dịch trả phí
            </span>
            <span className="admin-traffic-kpi-value">{formatNumber(summary?.total_purchases || 0)}</span>
            <span className="admin-traffic-kpi-sub">Khách mua gói 99K / 399K</span>
          </div>

          <div className="admin-traffic-kpi-card">
            <span className="admin-traffic-kpi-label">
              <Money size={16} weight="duotone" color="#f59e0b" />
              Doanh thu mang lại
            </span>
            <span className="admin-traffic-kpi-value">{formatMoney(summary?.total_revenue || 0)}</span>
            <span className="admin-traffic-kpi-sub">Từ khách hàng được ghi nhận</span>
          </div>

          <div className="admin-traffic-kpi-card">
            <span className="admin-traffic-kpi-label">
              <TrendUp size={16} weight="duotone" color="#ec4899" />
              Tỷ lệ chuyển đổi (CR)
            </span>
            <span className="admin-traffic-kpi-value">{(summary?.overall_conversion_rate || 0).toFixed(1)}%</span>
            <span className="admin-traffic-kpi-sub">Lượt truy cập ➔ Đăng ký</span>
          </div>
        </div>

        {/* Platform Selector Filter Tabs */}
        <div className="admin-traffic-platform-tabs-wrap">
          <div className="admin-traffic-tabs-header">
            <span className="admin-traffic-tabs-title">
              <Funnel size={16} weight="bold" />
              Lọc theo kênh:
            </span>
            {selectedPlatform !== 'ALL' && (
              <button
                type="button"
                className="admin-traffic-btn-reset-filter"
                onClick={() => setSelectedPlatform('ALL')}
              >
                Quay lại xem tất cả kênh
              </button>
            )}
          </div>

          <div className="admin-traffic-channel-tabs">
            <button
              type="button"
              className={`admin-channel-tab ${selectedPlatform === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedPlatform('ALL')}
            >
              <ChartBar size={16} weight="bold" />
              Tất cả kênh
            </button>
            {summary?.metrics?.map((m) => {
              const isSelected = selectedPlatform === m.source
              const color = SOURCE_COLORS[m.source] || '#7264ad'
              return (
                <button
                  key={m.source}
                  type="button"
                  className={`admin-channel-tab ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedPlatform(m.source)}
                  style={{
                    borderColor: isSelected ? color : undefined,
                  }}
                >
                  <span style={{ color: isSelected ? color : 'inherit', display: 'inline-flex' }}>
                    <ChannelIcon source={m.source} size={15} />
                  </span>
                  <span>{m.display_name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* FOCUSED PLATFORM VIEW (Khi người dùng chọn 1 kênh cụ thể) */}
        {focusedMetric ? (
          <div className="admin-platform-focus-box">
            <div
              className="admin-focus-banner"
              style={{ borderLeftColor: SOURCE_COLORS[focusedMetric.source] || '#7264ad' }}
            >
              <div className="admin-focus-header">
                <div className="admin-focus-title-wrap">
                  <div
                    className="admin-focus-icon-badge"
                    style={{ backgroundColor: SOURCE_COLORS[focusedMetric.source] || '#7264ad' }}
                  >
                    <ChannelIcon source={focusedMetric.source} size={24} />
                  </div>
                  <div>
                    <h3 className="admin-focus-title">
                      Chỉ số chi tiết: {focusedMetric.display_name}
                    </h3>
                    <p className="admin-focus-sub">
                      Hiệu quả tiếp cận và tỷ lệ chuyển đổi của kênh {focusedMetric.display_name} trong giai đoạn được chọn.
                    </p>
                  </div>
                </div>

                <div className="admin-focus-banner-actions">
                  <button
                    type="button"
                    className="admin-focus-btn-utm"
                    onClick={() => openUtmForSource(focusedMetric.source)}
                  >
                    <LinkSimple size={15} weight="bold" />
                    Tạo link UTM cho kênh này
                  </button>
                  <button
                    type="button"
                    className="admin-traffic-btn-reset-filter"
                    onClick={() => setSelectedPlatform('ALL')}
                  >
                    Đóng chi tiết
                  </button>
                </div>
              </div>

              {/* 3-Step Funnel Metrics for Focused Platform */}
              <div className="admin-focus-funnel-grid">
                <div className="admin-focus-funnel-card step-visit">
                  <div className="admin-funnel-card-header">
                    <span className="step-num">Bước 1</span>
                    <span className="step-tag">Tiếp cận</span>
                  </div>
                  <div className="admin-funnel-card-value">{formatNumber(focusedMetric.visits)}</div>
                  <div className="admin-funnel-card-label">Lượt truy cập trang</div>
                  <div className="admin-funnel-card-sub">Chiếm {focusedMetric.traffic_share}% tổng traffic</div>
                </div>

                <div className="admin-focus-funnel-arrow">
                  <CaretRight size={22} weight="bold" />
                  <span className="funnel-cr-badge">{focusedMetric.conversion_rate.toFixed(1)}%</span>
                </div>

                <div className="admin-focus-funnel-card step-signup">
                  <div className="admin-funnel-card-header">
                    <span className="step-num">Bước 2</span>
                    <span className="step-tag">Tạo tài khoản</span>
                  </div>
                  <div className="admin-funnel-card-value">{formatNumber(focusedMetric.signups)}</div>
                  <div className="admin-funnel-card-label">Mẹ bầu đăng ký</div>
                  <div className="admin-funnel-card-sub">CR: {focusedMetric.conversion_rate.toFixed(1)}%</div>
                </div>

                <div className="admin-focus-funnel-arrow">
                  <CaretRight size={22} weight="bold" />
                  <span className="funnel-cr-badge">
                    {focusedMetric.signups > 0
                      ? ((focusedMetric.purchases / focusedMetric.signups) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>

                <div className="admin-focus-funnel-card step-purchase">
                  <div className="admin-funnel-card-header">
                    <span className="step-num">Bước 3</span>
                    <span className="step-tag">Doanh thu</span>
                  </div>
                  <div className="admin-funnel-card-value">{formatNumber(focusedMetric.purchases)}</div>
                  <div className="admin-funnel-card-label">Khách mua gói thành công</div>
                  <div className="admin-funnel-card-sub" style={{ color: '#059669', fontWeight: 600 }}>
                    Doanh thu: {formatMoney(focusedMetric.revenue)}
                  </div>
                </div>
              </div>

              {/* Visual Funnel Bar Chart for this Platform */}
              <div className="admin-focus-chart-row">
                <div className="admin-focus-chart-box">
                  <div className="admin-traffic-chart-title">
                    <span>Biểu đồ phễu chuyển đổi kênh {focusedMetric.display_name}</span>
                  </div>
                  <div style={{ width: '100%', height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: '1. Lượt xem trang', value: focusedMetric.visits, fill: '#3b82f6' },
                          { name: '2. Đăng ký tài khoản', value: focusedMetric.signups, fill: '#10b981' },
                          { name: '3. Khách mua gói', value: focusedMetric.purchases, fill: '#8b5cf6' },
                        ]}
                        margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4b5563' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <Tooltip formatter={(val: any) => [formatNumber(Number(val)), 'Số lượng']} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                          {[{ fill: '#3b82f6' }, { fill: '#10b981' }, { fill: '#8b5cf6' }].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="admin-focus-metric-summary">
                  <h4>Hiệu quả tài chính kênh</h4>
                  <div className="admin-focus-summary-list">
                    <div className="admin-focus-summary-row">
                      <span>Doanh thu bình quân mỗi đơn (AOV):</span>
                      <strong>
                        {focusedMetric.purchases > 0
                          ? formatMoney(Math.round(focusedMetric.revenue / focusedMetric.purchases))
                          : '0 đ'}
                      </strong>
                    </div>
                    <div className="admin-focus-summary-row">
                      <span>Doanh thu trên mỗi lượt xem (RPV):</span>
                      <strong>
                        {focusedMetric.visits > 0
                          ? formatMoney(Math.round(focusedMetric.revenue / focusedMetric.visits))
                          : '0 đ'}
                      </strong>
                    </div>
                    <div className="admin-focus-summary-row">
                      <span>Tỷ lệ hoàn tất thanh toán:</span>
                      <strong>
                        {focusedMetric.signups > 0
                          ? `${((focusedMetric.purchases / focusedMetric.signups) * 100).toFixed(1)}%`
                          : '0%'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ALL PLATFORMS VIEW (Biểu đồ so sánh + Bảng tổng hợp chi tiết) */
          <>
            {/* COMPARATIVE CHARTS ROW */}
            <div className="admin-traffic-charts-row">
              {/* Grouped Bar Chart: Comparison across platforms */}
              <div className="admin-traffic-chart-box admin-traffic-barchart-box">
                <div className="admin-traffic-chart-title">
                  <span>Biểu đồ so sánh lưu lượng & chuyển đổi giữa các nền tảng</span>
                  <small style={{ color: '#6b7280' }}>Lượt xem · Đăng ký · Đơn mua</small>
                </div>

                <div style={{ width: '100%', height: 270 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4b5563' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          formatNumber(Number(val)),
                          name === 'visits' ? 'Lượt xem' : name === 'signups' ? 'Đăng ký' : 'Mua gói',
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                      <Bar dataKey="Lượt truy cập" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="Đăng ký mới" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="Mua gói" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Donut Chart: Traffic Share */}
              <div className="admin-traffic-chart-box admin-traffic-donutchart-box">
                <div className="admin-traffic-chart-title">
                  <span>Thị phần truy cập theo kênh</span>
                  <small style={{ color: '#6b7280' }}>
                    {donutChartData.length} kênh có lưu lượng
                  </small>
                </div>

                <div className="admin-traffic-donut-wrap">
                  {donutChartData.length > 0 ? (
                    <>
                      <div style={{ width: '100%', height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip
                              formatter={(value: any, name: any) => [
                                `${formatNumber(Number(value))} lượt (${donutChartData.find((d) => d.name === name)?.share ?? 0}%)`,
                                name,
                              ]}
                            />
                            <Pie
                              data={donutChartData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius="60%"
                              outerRadius="88%"
                              paddingAngle={3}
                              stroke="none"
                            >
                              {donutChartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="admin-traffic-donut-legend">
                        {donutChartData.map((item) => (
                          <div
                            key={item.name}
                            className="admin-traffic-legend-item"
                            onClick={() => setSelectedPlatform(item.source)}
                            style={{ cursor: 'pointer' }}
                          >
                            <span className="admin-traffic-dot" style={{ backgroundColor: item.color }} />
                            <span>{item.name}</span>
                            <strong>{item.share}%</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#9ca3af', fontSize: '0.875rem', padding: '2rem 0', textAlign: 'center' }}>
                      Chưa có lượt truy cập ghi nhận theo kênh
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Comparison Table */}
            <div className="admin-traffic-table-section">
              <div className="admin-traffic-table-header">
                <h4>Bảng tổng hợp chi tiết chỉ số từng kênh tiếp thị</h4>
                <span className="table-header-sub">Bấm vào dòng bất kỳ để xem phân tích chuyên sâu của kênh đó</span>
              </div>

              <div className="admin-traffic-table-wrap">
                <table className="admin-traffic-table">
                  <thead>
                    <tr>
                      <th>Kênh tiếp thị</th>
                      <th>Lượt truy cập</th>
                      <th>Thị phần</th>
                      <th>Đăng ký mới</th>
                      <th>Giao dịch mua gói</th>
                      <th>Tỷ lệ chuyển đổi (CR)</th>
                      <th>Doanh thu mang lại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary?.metrics?.map((row) => (
                      <tr
                        key={row.source}
                        className={selectedPlatform === row.source ? 'row-selected' : ''}
                        onClick={() => setSelectedPlatform(row.source)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span className={`admin-traffic-channel-badge badge-${row.source}`}>
                            <ChannelIcon source={row.source} size={16} />
                            {row.display_name}
                          </span>
                        </td>
                        <td><strong>{formatNumber(row.visits)}</strong></td>
                        <td>{row.traffic_share}%</td>
                        <td>{formatNumber(row.signups)}</td>
                        <td>{formatNumber(row.purchases)}</td>
                        <td>
                          <span className="admin-traffic-cr-pill">{row.conversion_rate.toFixed(1)}%</span>
                        </td>
                        <td><strong>{formatMoney(row.revenue)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <AdminUtmModal
        open={utmModalOpen}
        onClose={() => setUtmModalOpen(false)}
        initialSource={targetUtmSource}
      />
    </section>
  )
}
