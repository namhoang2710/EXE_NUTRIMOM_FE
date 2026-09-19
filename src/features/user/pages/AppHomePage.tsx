import { ArrowRight, BookOpenText } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function AppHomePage() {
  const { profile } = useAuth()
  return <main className="nm-app-home"><div className="nm-app-home-inner"><span className="nm-eyebrow">Không gian của bạn</span><h1>Chào {profile?.salutation || profile?.display_name || 'bạn'},<br /><em>mỗi ngày thêm an tâm.</em></h1><p>Những bài viết được biên tập cẩn thận đang chờ bạn khám phá và lưu lại cho hành trình của mình.</p><Link className="nm-primary-action" to="/app/knowledge">Khám phá kiến thức <ArrowRight size={19} /></Link><div className="nm-app-home-note"><BookOpenText size={25} /><span>Một góc nhỏ để đọc, hiểu và chăm sóc bản thân theo nhịp riêng.</span></div></div><img className="nm-app-home-image" src="/benner_blog1.png" alt="" /></main>
}
