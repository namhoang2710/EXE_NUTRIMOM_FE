import { BookmarkSimple, Hash, ImageSquare, Newspaper, PencilLine, UserCircle } from '@phosphor-icons/react'
import type { ComponentType } from 'react'
import { communityTopics } from '../model/community-topics'
import type { PostTopic } from '../model/community-types'
import type { CommunityTab } from './CommunityFilters'

interface Props {
  tab: CommunityTab
  topic?: PostTopic
  hasImages: boolean
  onChange: (next: { tab?: CommunityTab; topic?: PostTopic | null; hasImages?: boolean }) => void
  onCompose: () => void
}

const tabs: Array<{ value: CommunityTab; label: string; icon: ComponentType<{ size?: number; weight?: 'regular' | 'fill' | 'duotone' }> }> = [
  { value: 'all', label: 'Bảng tin', icon: Newspaper },
  { value: 'saved', label: 'Đã lưu', icon: BookmarkSimple },
  { value: 'mine', label: 'Bài của tôi', icon: UserCircle },
]

/** Cột trái trên desktop: điều hướng danh sách + chủ đề dạng menu dọc. */
export function CommunitySidebar({ tab, topic, hasImages, onChange, onCompose }: Props) {
  return <aside className="nm-community-side is-left" aria-label="Điều hướng cộng đồng">
    <div className="nm-community-side__brand">
      <span className="nm-eyebrow">NutriMom · Cộng đồng</span>
      <h1>Cộng đồng dành cho mẹ</h1>
      <p>Chia sẻ hành trình mang thai, hỏi đáp và động viên nhau mỗi ngày.</p>
    </div>
    <button type="button" className="nm-primary-action nm-community-side__compose" onClick={onCompose}><PencilLine size={18} aria-hidden="true" />Viết bài</button>

    <nav className="nm-community-menu" aria-label="Danh sách bài viết">
      {tabs.map(({ value, label, icon: Icon }) => <button key={value} type="button" aria-current={tab === value ? 'page' : undefined} className={tab === value ? 'is-active' : ''} onClick={() => onChange({ tab: value })}>
        <Icon size={20} weight={tab === value ? 'fill' : 'regular'} />{label}
      </button>)}
    </nav>

    {tab !== 'mine' && <div className="nm-community-menu" role="group" aria-label="Chủ đề">
      <p className="nm-community-menu__title">Chủ đề</p>
      <button type="button" aria-pressed={!topic} className={!topic ? 'is-active' : ''} onClick={() => onChange({ topic: null })}><Hash size={18} />Tất cả chủ đề</button>
      {communityTopics.map((item) => <button key={item.value} type="button" aria-pressed={topic === item.value} className={topic === item.value ? 'is-active' : ''} onClick={() => onChange({ topic: item.value })}>
        <Hash size={18} />{item.label}
      </button>)}
      <label className="nm-community-menu__toggle"><input type="checkbox" checked={hasImages} onChange={(event) => onChange({ hasImages: event.target.checked })} /><ImageSquare size={18} aria-hidden="true" />Chỉ bài có ảnh</label>
    </div>}
  </aside>
}
