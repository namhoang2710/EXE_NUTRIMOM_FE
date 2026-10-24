import { AccessibleDialog } from './AccessibleDialog'

export function DiscardDraftDialog({ open, onContinue, onDiscard }: { open: boolean; onContinue: () => void; onDiscard: () => void }) {
  return <AccessibleDialog open={open} title="Bỏ thay đổi chưa lưu?" description="Nội dung và tệp chỉ được giữ trong lần mở này. Tiếp tục chỉnh sửa để giữ lại bản nháp." onClose={onContinue}
    footer={<><button className="secondary-button" type="button" onClick={onContinue}>Tiếp tục chỉnh sửa</button><button className="primary-button" type="button" onClick={onDiscard}>Bỏ thay đổi</button></>}><p>Chỉ dữ liệu đã được máy chủ xác nhận mới được lưu.</p></AccessibleDialog>
}
