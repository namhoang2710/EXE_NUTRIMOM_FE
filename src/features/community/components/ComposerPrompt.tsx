import { ImageSquare, PencilLine } from '@phosphor-icons/react'
import { initial } from '../model/community-time'

/** Ô "Mẹ đang nghĩ gì?" ở đầu feed — bấm vào mở form viết bài. */
export function ComposerPrompt({ name, onCompose }: { name: string; onCompose: () => void }) {
  return <section className="nm-community-prompt" aria-label="Viết bài mới">
    <span className="nm-community-avatar" aria-hidden="true">{initial(name)}</span>
    <button type="button" className="nm-community-prompt__input" onClick={onCompose}>{name.trim() ? `${name.trim()} ơi, mẹ đang nghĩ gì?` : 'Mẹ đang nghĩ gì?'}</button>
    <div className="nm-community-prompt__actions">
      <button type="button" className="nm-community-action" onClick={onCompose}><ImageSquare size={19} aria-hidden="true" />Ảnh</button>
      <button type="button" className="nm-community-action" onClick={onCompose}><PencilLine size={19} aria-hidden="true" />Chia sẻ</button>
    </div>
  </section>
}
