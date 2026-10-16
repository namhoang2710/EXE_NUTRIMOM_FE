import { useAdminCooldown } from '../hooks/useAdminCooldown'
export function AdminRetryButton({ retry }: { retry:()=>void }) {
  const {seconds}=useAdminCooldown()
  return <><button type="button" className="admin-button secondary" disabled={seconds>0} onClick={retry}>Thử lại</button>{seconds>0&&<p role="status">Có thể thử lại sau {seconds} giây</p>}</>
}
