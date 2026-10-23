import { communityTopics } from '../model/community-topics'
import type { PostTopic } from '../model/community-types'
import { CommunitySelect } from './CommunitySelect'

export type CommunityTab = 'all' | 'saved' | 'mine'

interface Props {
  tab: CommunityTab
  topic?: PostTopic
  hasImages: boolean
  onChange: (next: { tab?: CommunityTab; topic?: PostTopic | null; hasImages?: boolean }) => void
}

const tabs: Array<{ value: CommunityTab; label: string }> = [
  { value: 'all', label: 'Bài viết' },
  { value: 'saved', label: 'Đã lưu' },
  { value: 'mine', label: 'Bài của tôi' },
]

export function CommunityFilters({ tab, topic, hasImages, onChange }: Props) {
  return <div className="nm-community-filters">
    <div className="nm-community-tabs" role="tablist" aria-label="Danh sách bài viết">
      {tabs.map((item) => <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} className={tab === item.value ? 'is-active' : ''} onClick={() => onChange({ tab: item.value })}>{item.label}</button>)}
    </div>
    {tab !== 'mine' && <div className="nm-community-mobile-filters">
      <CommunitySelect label="Chủ đề" value={topic ?? ''} options={[{ value: '', label: 'Tất cả chủ đề' }, ...communityTopics]} onChange={(value) => onChange({ topic: value ? value as PostTopic : null })} />
      <label className="nm-community-switch"><input type="checkbox" checked={hasImages} onChange={(event) => onChange({ hasImages: event.target.checked })} />Có ảnh</label>
    </div>}
  </div>
}
