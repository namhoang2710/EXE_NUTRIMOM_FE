import { useEffect, useState, useMemo } from 'react'
import {
  ArrowsClockwise,
  ArrowSquareOut,
  Check,
  Copy,
  CreditCard,
  Eye,
  Money,
  TrendUp,
  Users,
} from '@phosphor-icons/react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { fetchTrafficSummary, type TrafficSummaryResponse } from '../api/admin-traffic'
import '../styles/admin-traffic.css'

const SOURCE_COLORS: Record<string, string> = {
  TIKTOK: '#00f2fe',
  FACEBOOK: '#1877F2',
  INSTAGRAM: '#E1306C',
  GOOGLE: '#ea4335',
  DIRECT: '#8b5cf6',
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

function ChannelIcon({ source, size = 18 }: { source: string; size?: number }) {
  switch (source) {
    case 'TIKTOK':
      return <TikTokIcon size={size} />
    case 'FACEBOOK':
      return <FacebookIcon size={size} />
    case 'INSTAGRAM':
      return <InstagramIcon size={size} />
    default:
      return null
  }
}

const formatNumber = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0)
const formatMoney = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)

export function AdminTrafficAnalytics() {
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<TrafficSummaryResponse | null>(null)

  // UTM Generator State
  const [utmSource, setUtmSource] = useState('tiktok')
  const [utmPage, setUtmPage] = useState('/')
  const [utmMedium, setUtmMedium] = useState('bio')
  const [utmCampaign, setUtmCampaign] = useState('launch_2026')
  const [copied, setCopied] = useState(false)

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

  // Chart data
  const chartData = useMemo(() => {
    if (!summary || !summary.metrics) return []
    return summary.metrics
      .filter((m) => m.visits > 0)
      .map((m) => ({
        name: m.display_name,
        source: m.source,
        value: m.visits,
        share: m.traffic_share,
        color: SOURCE_COLORS[m.source] || '#9ca3af',
      }))
  }, [summary])

  // Generated UTM URL
  const generatedUtmUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nutrimom.vn'
    const target = utmPage === '/' ? '' : utmPage
    return `${origin}${target}?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${encodeURIComponent(
      utmCampaign.trim() || 'social',
    )}`
  }, [utmSource, utmPage, utmMedium, utmCampaign])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedUtmUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <section className="admin-traffic-section" aria-labelledby="traffic-analytics-heading">
      <div className="admin-traffic-card">
        {/* Header */}
        <div className="admin-traffic-header">
          <div className="admin-traffic-title-group">
            <h2 id="traffic-analytics-heading">
              <TrendUp size={24} weight="bold" color="#7264ad" />
              Lưu lượng & Chuyển đổi Marketing
            </h2>
            <p>
              Đo lường người dùng từ TikTok (@nutrimom202), Facebook, Instagram và theo dõi hành trình chuyển đổi.
            </p>
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

            <a
              href={summary?.ga4_console_url || 'https://analytics.google.com/'}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-traffic-btn-ga4"
              title="Xem số liệu chi tiết trên Google Analytics 4 Console"
            >
              GA4 Console ({summary?.ga4_property_id || 'G-NUTRIMOM2026'})
              <ArrowSquareOut size={15} weight="bold" />
            </a>
          </div>
        </div>

        {error && <div className="admin-dashboard-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* KPI Ribbon */}
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

        {/* Visual Charts Row */}
        <div className="admin-traffic-charts-row">
          {/* Donut Chart: Traffic Share */}
          <div className="admin-traffic-chart-box">
            <div className="admin-traffic-chart-title">
              <span>Thị phần truy cập theo kênh</span>
              <small style={{ color: '#6b7280', fontWeight: 'normal' }}>
                {chartData.length} kênh hoạt động
              </small>
            </div>

            <div className="admin-traffic-donut-wrap">
              {chartData.length > 0 ? (
                <>
                  <div style={{ width: 180, height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          formatter={(value: any, name: any) => [
                            `${formatNumber(Number(value))} lượt (${
                              chartData.find((c) => c.name === name)?.share || 0
                            }%)`,
                            name,
                          ]}
                        />
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="65%"
                          outerRadius="90%"
                          paddingAngle={3}
                          stroke="none"
                        >
                          {chartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="admin-traffic-donut-legend">
                    {chartData.map((item) => (
                      <div key={item.name} className="admin-traffic-legend-item">
                        <span className="admin-traffic-dot" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                        <strong>{item.share}%</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Chưa có lượt truy cập ghi nhận</div>
              )}
            </div>
          </div>

          {/* Funnel: Channel Conversion */}
          <div className="admin-traffic-chart-box">
            <div className="admin-traffic-chart-title">
              <span>Hiệu quả chuyển đổi từng kênh</span>
              <small style={{ color: '#6b7280', fontWeight: 'normal' }}>Truy cập ➔ Đăng ký ➔ Mua gói</small>
            </div>

            <div className="admin-traffic-funnel-list">
              {summary?.metrics?.map((m) => {
                const maxVisits = Math.max(...(summary.metrics.map((x) => x.visits) || [1]), 1)
                const widthPercent = Math.max(Math.round((m.visits / maxVisits) * 100), 4)
                const barColor = SOURCE_COLORS[m.source] || '#7264ad'

                return (
                  <div key={m.source} className="admin-traffic-funnel-row">
                    <div className="admin-traffic-funnel-info">
                      <span className="admin-traffic-funnel-name">
                        <ChannelIcon source={m.source} size={15} />
                        {m.display_name}
                      </span>
                      <span className="admin-traffic-funnel-stat">
                        {formatNumber(m.visits)} xem · <strong>{formatNumber(m.signups)} ĐK</strong> ·{' '}
                        {formatNumber(m.purchases)} mua
                      </span>
                    </div>
                    <div className="admin-traffic-bar-track">
                      <div
                        className="admin-traffic-bar-fill"
                        style={{
                          width: `${widthPercent}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="admin-traffic-table-wrap">
          <table className="admin-traffic-table">
            <thead>
              <tr>
                <th>Kênh tiếp thị</th>
                <th>Lượt truy cập</th>
                <th>Thị phần</th>
                <th>Đăng ký mới</th>
                <th>Mua gói</th>
                <th>Tỷ lệ CR</th>
                <th>Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {summary?.metrics?.map((row) => (
                <tr key={row.source}>
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

        {/* Marketing UTM Link Builder */}
        <div className="admin-utm-creator">
          <div className="admin-utm-creator-title">
            <TikTokIcon size={20} />
            Công cụ tạo link UTM cho bài đăng TikTok & Mạng xã hội
          </div>
          <p className="admin-utm-creator-desc">
            Khi đăng video TikTok (@nutrimom202) hoặc bài viết FB/Instagram, dùng link này gắn vào Bio hoặc comment để hệ thống tự động ghi nhận lượt xem, đăng ký và đơn hàng về đúng kênh!
          </p>

          <div className="admin-utm-form">
            <div className="admin-utm-field">
              <label>Kênh đăng bài (Source)</label>
              <select value={utmSource} onChange={(e) => setUtmSource(e.target.value)}>
                <option value="tiktok">TikTok (@nutrimom202)</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="google">Google Ads</option>
              </select>
            </div>

            <div className="admin-utm-field">
              <label>Trang đích (Landing)</label>
              <select value={utmPage} onChange={(e) => setUtmPage(e.target.value)}>
                <option value="/">Trang chủ (/)</option>
                <option value="/entitlements">Bảng giá gói (/entitlements)</option>
                <option value="/register">Trang đăng ký (/register)</option>
                <option value="/recipes">Thực đơn dinh dưỡng (/recipes)</option>
              </select>
            </div>

            <div className="admin-utm-field">
              <label>Vị trí đặt link (Medium)</label>
              <select value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)}>
                <option value="bio">Link tiểu sử (Bio link)</option>
                <option value="video">Mô tả video / Ghim comment</option>
                <option value="reels">Reels / Shorts</option>
                <option value="post">Bài viết tin tức</option>
              </select>
            </div>

            <div className="admin-utm-field">
              <label>Tên chiến dịch (Campaign)</label>
              <input
                type="text"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                placeholder="VD: launch_2026, khuyenmai_tet"
              />
            </div>
          </div>

          <div className="admin-utm-result">
            <code>{generatedUtmUrl}</code>
            <button
              type="button"
              className="admin-utm-copy-btn"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check size={14} weight="bold" style={{ display: 'inline', marginRight: 4 }} />
                  Đã sao chép!
                </>
              ) : (
                <>
                  <Copy size={14} weight="bold" style={{ display: 'inline', marginRight: 4 }} />
                  Sao chép link
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
