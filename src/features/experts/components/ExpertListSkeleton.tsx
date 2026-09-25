export function ExpertListSkeleton() {
  return (
    <div className="expert-list" aria-label="Đang tải danh sách bác sĩ" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div className="expert-card expert-card--skeleton" key={item} aria-hidden="true">
          <div className="expert-skeleton__portrait" />
          <div className="expert-skeleton__body">
            <span className="expert-skeleton__line is-short" />
            <span className="expert-skeleton__line is-title" />
            <span className="expert-skeleton__line" />
            <span className="expert-skeleton__line is-medium" />
            <span className="expert-skeleton__button" />
          </div>
        </div>
      ))}
    </div>
  )
}
