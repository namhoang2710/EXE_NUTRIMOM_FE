import { Briefcase, MapPin, Medal, Phone, Star } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { AccessibleDialog } from '@/shared/components/AccessibleDialog'
import type { ExpertProfile } from '../model/expert-console-types'
import { specialtyLabels } from '../model/expert-console-types'

function initials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]?.toLocaleUpperCase('vi')).join('') || 'NM'
}

export function ExpertProfileDialog({ open, profile, loading, error, onClose, onRetry }: {
  open: boolean
  profile: ExpertProfile | null
  loading: boolean
  error: string
  onClose: () => void
  onRetry: () => void
}) {
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => setImageFailed(false), [profile?.avatarUrl])
  return <AccessibleDialog open={open} title="Hồ sơ chuyên gia" description="Thông tin đang hiển thị trong hệ thống NutriMom." onClose={onClose} className="expert-dialog expert-profile-dialog" footer={<button className="expert-button primary" type="button" onClick={onClose}>Đóng</button>}>
    {loading ? <div className="expert-profile-dialog-skeleton" aria-busy="true" aria-label="Đang tải hồ sơ"><span /><i /><i /><i /></div>
      : error ? <div className="expert-profile-dialog-error" role="alert"><p>{error}</p><button className="expert-button secondary" type="button" onClick={onRetry}>Thử lại</button></div>
        : profile ? <div className="expert-profile-dialog-content">
          <div className="expert-profile-dialog-identity"><span className="expert-profile-dialog-avatar">{profile.avatarUrl && !imageFailed ? <img src={profile.avatarUrl} alt={`Ảnh đại diện của ${profile.fullName}`} onError={() => setImageFailed(true)} /> : <span aria-hidden="true">{initials(profile.fullName)}</span>}</span><div><h3>{profile.fullName}</h3><p>{profile.title || 'Chuyên gia NutriMom'}</p><span className={`expert-profile-status is-${profile.status.toLowerCase()}`}>{profile.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}</span></div></div>
          <dl className="expert-profile-dialog-facts">
            <div><dt><Phone size={17} aria-hidden="true" />Số điện thoại</dt><dd>{profile.phone}</dd></div>
            <div><dt><Briefcase size={17} aria-hidden="true" />Chuyên khoa</dt><dd>{specialtyLabels[profile.specialty]}</dd></div>
            <div><dt><MapPin size={17} aria-hidden="true" />Nơi công tác</dt><dd>{profile.workplace || 'Chưa cập nhật'}</dd></div>
            <div><dt><Medal size={17} aria-hidden="true" />Kinh nghiệm</dt><dd>{profile.yearsOfExperience} năm</dd></div>
            <div><dt><Star size={17} weight="fill" aria-hidden="true" />Đánh giá trung bình</dt><dd>{profile.ratingCount ? `${profile.averageRating.toFixed(1)} / 5` : 'Chưa có đánh giá'}</dd></div>
            <div><dt><Star size={17} aria-hidden="true" />Tổng lượt đánh giá</dt><dd>{profile.ratingCount}</dd></div>
          </dl>
          <section className="expert-profile-dialog-bio"><h3>Giới thiệu</h3><p>{profile.bio || 'Chưa cập nhật phần giới thiệu.'}</p></section>
        </div> : null}
  </AccessibleDialog>
}
