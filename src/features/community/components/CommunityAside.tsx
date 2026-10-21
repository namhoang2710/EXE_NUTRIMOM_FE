import { HandHeart, ShieldCheck } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

const rules = [
  'Tôn trọng, lắng nghe và động viên nhau.',
  'Không quảng cáo, bán hàng hay để lại thông tin liên hệ.',
  'Thông tin sức khoẻ chỉ mang tính tham khảo — hãy hỏi bác sĩ khi cần.',
  'Không chia sẻ thông tin cá nhân của người khác.',
]

/** Cột phải trên desktop: thông báo cộng đồng + quy tắc. Nội dung tĩnh, không gọi API. */
export function CommunityAside({ notifications }: { notifications: ReactNode }) {
  return <aside className="nm-community-side is-right" aria-label="Thông tin cộng đồng">
    <section className="nm-community-widget">
      <h2>Thông báo của bạn</h2>
      <p>Lượt thích, bình luận và kết quả duyệt bài của bạn.</p>
      {notifications}
    </section>
    <section className="nm-community-widget">
      <h2><ShieldCheck size={20} weight="duotone" aria-hidden="true" />Quy tắc cộng đồng</h2>
      <ul>{rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
    </section>
    <section className="nm-community-widget is-soft">
      <h2><HandHeart size={20} weight="duotone" aria-hidden="true" />Bài viết được duyệt</h2>
      <p>Mỗi bài viết được quản trị viên xem trước khi hiển thị để cộng đồng luôn an toàn cho mẹ và bé.</p>
    </section>
  </aside>
}
