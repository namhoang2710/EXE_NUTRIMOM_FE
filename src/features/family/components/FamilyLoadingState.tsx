import { LoaderOne } from '@/components/ui/loader'

interface Props {
  label: string
  description?: string
}

export function FamilyLoadingState({ label, description = 'Thông tin sẽ xuất hiện ngay khi tải xong.' }: Props) {
  return (
    <div className="family-loading-state" role="status" aria-live="polite" aria-busy="true">
      <div className="family-loading-state-inner">
        <span className="family-loading-dots"><LoaderOne /></span>
        <strong>{label}</strong>
        <span>{description}</span>
      </div>
    </div>
  )
}
