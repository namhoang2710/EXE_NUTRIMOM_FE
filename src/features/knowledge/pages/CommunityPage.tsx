import { ArrowRight, ChatsCircle } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { communityPreview } from '../model/knowledge-static-content'
import './blog.css'

export function CommunityPage() {
  return <main className="nm-community-page"><section className="nm-community-page-inner"><span className="nm-community-page-icon"><ChatsCircle size={34} weight="duotone" aria-hidden="true" /></span><span className="nm-eyebrow">NutriMom · Cộng đồng</span><h1>{communityPreview.title}</h1><p>{communityPreview.description}</p><div className="nm-community-stages">{communityPreview.stages.map((stage) => <span key={stage}>{stage}</span>)}</div><span className="nm-coming-soon">Sắp ra mắt</span><Link className="nm-primary-action" to="/app/knowledge">Khám phá kiến thức <ArrowRight size={18} /></Link></section></main>
}
