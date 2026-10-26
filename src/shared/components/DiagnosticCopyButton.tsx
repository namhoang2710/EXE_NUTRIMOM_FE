import { useState } from 'react'
import { copyDiagnosticSummary, type DiagnosticCategory } from '@/core/diagnostics/logger'

export function DiagnosticCopyButton({ feature, event, error }: { feature: DiagnosticCategory; event: string; error: unknown }) {
  const [copied, setCopied] = useState(false)
  return <button className="text-button" type="button" onClick={() => void copyDiagnosticSummary(feature, event, error).then(() => setCopied(true)).catch(() => setCopied(false))}>
    {copied ? 'Đã sao chép thông tin lỗi' : 'Sao chép thông tin lỗi'}
  </button>
}
