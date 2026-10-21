import { ChatCircle, Heart, LockKey, SignIn, UserPlus } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { rememberReturnPath } from '../model/community-return-path'

/** Nội dung tĩnh làm nền mờ — không gọi API nên khách không nhận được dữ liệu thật nào. */
const previewPosts = [
  { name: 'M', lines: [92, 78, 60], image: true },
  { name: 'H', lines: [86, 70], image: false },
  { name: 'T', lines: [95, 82, 54], image: false },
]

export function CommunityLockedView({ returnTo }: { returnTo: string }) {
  const authState = { from: returnTo }
  return <section className="nm-community-locked" aria-labelledby="nm-community-locked-title">
    <div className="nm-community-locked__preview" aria-hidden="true" inert>
      {previewPosts.map((post, index) => <article key={index} className="nm-community-card">
        <header className="nm-community-card__head"><span className="nm-community-avatar">{post.name}</span><span className="nm-community-locked__line is-name" /></header>
        {post.lines.map((width, line) => <span key={line} className="nm-community-locked__line" style={{ width: `${width}%` }} />)}
        {post.image && <span className="nm-community-locked__image" />}
        <footer className="nm-community-card__actions"><span><Heart size={18} /> 24</span><span><ChatCircle size={18} /> 8</span></footer>
      </article>)}
    </div>
    <div className="nm-community-locked__glass">
      <div className="nm-community-locked__notice">
        <span className="nm-community-locked__icon"><LockKey size={30} weight="duotone" aria-hidden="true" /></span>
        <h1 id="nm-community-locked-title">Cộng đồng dành cho mẹ</h1>
        <p>Đăng nhập hoặc tạo tài khoản để xem bài viết, chia sẻ kinh nghiệm và trò chuyện cùng các mẹ khác.</p>
        <div className="nm-community-locked__actions">
          <Link className="nm-primary-action" to="/login" state={authState} onClick={() => rememberReturnPath(returnTo)}>
            <SignIn size={18} aria-hidden="true" />Đăng nhập
          </Link>
          <Link className="nm-secondary-action" to="/register" state={authState} onClick={() => rememberReturnPath(returnTo)}>
            <UserPlus size={18} aria-hidden="true" />Đăng ký
          </Link>
        </div>
      </div>
    </div>
  </section>
}
