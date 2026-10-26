import { useState, useMemo, useEffect } from 'react'
import { Check, Copy, LinkSimple } from '@phosphor-icons/react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'

interface AdminUtmModalProps {
  open: boolean
  onClose: () => void
  initialSource?: string
}

export function AdminUtmModal({ open, onClose, initialSource = 'tiktok' }: AdminUtmModalProps) {
  const [utmSource, setUtmSource] = useState(initialSource.toLowerCase())
  const [utmPage, setUtmPage] = useState('/')
  const [utmMedium, setUtmMedium] = useState('bio')
  const [utmCampaign, setUtmCampaign] = useState('launch_2026')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (initialSource) {
      setUtmSource(initialSource.toLowerCase())
    }
  }, [initialSource, open])

  const generatedUtmUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nutrimom.vn'
    const target = utmPage === '/' ? '' : utmPage
    return `${origin}${target}?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${encodeURIComponent(
      utmCampaign.trim() || 'marketing',
    )}`
  }, [utmSource, utmPage, utmMedium, utmCampaign])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedUtmUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard fallback
      const textarea = document.createElement('textarea')
      textarea.value = generatedUtmUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      title="Tạo link tiếp thị UTM"
      description="Tạo link chiến dịch gắn mã theo dõi để đo lường chính xác lượt truy cập, đăng ký và đơn hàng từ từng nền tảng."
      className="admin-utm-dialog"
    >
      <div className="admin-utm-modal-content">
        <div className="admin-utm-modal-grid">
          <div className="admin-utm-field">
            <label htmlFor="utm-source-select">Kênh tiếp thị (Source)</label>
            <select
              id="utm-source-select"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
            >
              <option value="tiktok">TikTok</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="google">Google Ads / Search</option>
              <option value="zalo">Zalo</option>
              <option value="direct">Trực tiếp (Direct)</option>
              <option value="other">Kênh khác</option>
            </select>
          </div>

          <div className="admin-utm-field">
            <label htmlFor="utm-page-select">Trang đích (Landing page)</label>
            <select
              id="utm-page-select"
              value={utmPage}
              onChange={(e) => setUtmPage(e.target.value)}
            >
              <option value="/">Trang chủ (/)</option>
              <option value="/entitlements">Bảng giá gói (/entitlements)</option>
              <option value="/register">Trang đăng ký (/register)</option>
              <option value="/recipes">Thực đơn dinh dưỡng (/recipes)</option>
              <option value="/knowledge">Cẩm nang kiến thức (/knowledge)</option>
            </select>
          </div>

          <div className="admin-utm-field">
            <label htmlFor="utm-medium-select">Vị trí đặt link (Medium)</label>
            <select
              id="utm-medium-select"
              value={utmMedium}
              onChange={(e) => setUtmMedium(e.target.value)}
            >
              <option value="bio">Link tiểu sử (Bio link)</option>
              <option value="video">Mô tả video / Ghim comment</option>
              <option value="reels">Reels / Shorts</option>
              <option value="post">Bài viết tin tức (Post)</option>
              <option value="cpc">Quảng cáo trả phí (CPC / Ads)</option>
            </select>
          </div>

          <div className="admin-utm-field">
            <label htmlFor="utm-campaign-input">Tên chiến dịch (Campaign)</label>
            <input
              id="utm-campaign-input"
              type="text"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              placeholder="VD: launch_2026, khuyenmai_tet"
            />
          </div>
        </div>

        <div className="admin-utm-preview-box">
          <span className="admin-utm-preview-label">
            <LinkSimple size={16} weight="bold" /> Link theo dõi đã tạo:
          </span>
          <div className="admin-utm-result">
            <code>{generatedUtmUrl}</code>
            <button
              type="button"
              className={`admin-utm-copy-btn ${copied ? 'copied' : ''}`}
              onClick={() => void handleCopyLink()}
            >
              {copied ? (
                <>
                  <Check size={16} weight="bold" />
                  Đã sao chép!
                </>
              ) : (
                <>
                  <Copy size={16} weight="bold" />
                  Sao chép link
                </>
              )}
            </button>
          </div>
        </div>

        <div className="admin-utm-modal-footer">
          <button type="button" className="admin-button secondary" onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className="admin-button primary"
            onClick={() => void handleCopyLink()}
          >
            {copied ? 'Đã sao chép vào bộ nhớ tạm' : 'Sao chép link & Đóng'}
          </button>
        </div>
      </div>
    </AccessibleDialog>
  )
}
