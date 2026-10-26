import { Dialog } from '@base-ui/react/dialog'
import { X } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

export function ResponsiveModal({ open, onOpenChange, title, children, className = '' }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode; className?: string;
}) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Backdrop className="nm-responsive-backdrop" />
      <Dialog.Popup className={`nm-responsive-modal ${className}`} data-ui-overlay="true" aria-describedby={undefined}>
        <header className="nm-responsive-modal-header"><Dialog.Title>{title}</Dialog.Title><Dialog.Close aria-label="Đóng"><X size={21} /></Dialog.Close></header>
        <div className="nm-responsive-modal-body">{children}</div>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
}
