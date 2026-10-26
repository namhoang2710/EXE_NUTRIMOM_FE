/** Khung xương có hình dáng gần giống thẻ bài thật (avatar, tên, vài dòng chữ, ảnh, nút). */
export function PostCardSkeleton({ count = 1, withImage = true }: { count?: number; withImage?: boolean }) {
  return <>
    {Array.from({ length: count }, (_, index) => <article key={index} className="nm-community-card is-skeleton" aria-hidden="true">
      <header className="nm-community-card__head">
        <span className="nm-skeleton-block is-avatar" />
        <span className="nm-community-skeleton-meta"><span className="nm-skeleton-block" style={{ width: '38%' }} /><span className="nm-skeleton-block is-small" style={{ width: '22%' }} /></span>
      </header>
      <span className="nm-skeleton-block" style={{ width: '94%' }} />
      <span className="nm-skeleton-block" style={{ width: '82%' }} />
      <span className="nm-skeleton-block" style={{ width: '58%' }} />
      {withImage && index % 2 === 0 && <span className="nm-skeleton-block is-image" />}
      <footer className="nm-community-card__actions"><span className="nm-skeleton-block is-pill" /><span className="nm-skeleton-block is-pill" /><span className="nm-skeleton-block is-pill" /></footer>
    </article>)}
  </>
}
