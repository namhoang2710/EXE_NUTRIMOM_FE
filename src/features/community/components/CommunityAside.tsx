import { HandHeart } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { CommunityRules } from './CommunityRules'

/** Cột phải trên desktop: thông báo cộng đồng + quy tắc. Nội dung tĩnh, không gọi API. */
export function CommunityAside({ notifications }: { notifications: ReactNode }) {
  return <aside className="nm-community-side is-right" aria-label="Thông tin cộng đồng">
    <section className="nm-community-widget">
      <h2>Thông báo của bạn</h2>
      <p>Lượt thích, bình luận và kết quả duyệt bài của bạn.</p>
      {notifications}
    </section>
    <CommunityRules />
    <section className="nm-community-widget is-soft">
      <h2><HandHeart size={20} weight="duotone" aria-hidden="true" />Bài viết được duyệt</h2>
      <p>Mỗi bài viết được quản trị viên xem trước khi hiển thị để cộng đồng luôn an toàn cho mẹ và bé.</p>
    </section>
  </aside>
}
