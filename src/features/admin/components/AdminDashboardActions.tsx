import { ArrowClockwise } from '@phosphor-icons/react'
import { useAdminCooldown } from '../hooks/useAdminCooldown'

export function AdminDashboardActions({ busy, valid, retry }: { busy:boolean; valid:boolean; retry:()=>void }) {
  const { seconds } = useAdminCooldown()
  return <div className="admin-dashboard-actions"><button className="admin-button secondary admin-dashboard-refresh" type="button" disabled={busy || !valid || seconds>0} onClick={retry}><ArrowClockwise size={18}/>{busy?'Đang cập nhật…':'Làm mới'}</button>{seconds>0&&<span role="status">Có thể thử lại sau {seconds} giây</span>}</div>
}
