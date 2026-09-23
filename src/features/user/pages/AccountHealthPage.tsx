import { Heartbeat } from '@phosphor-icons/react'

export function AccountHealthPage() {
  return <main className="nm-account-workspace-page"><header className="nm-account-workspace-heading"><span>Không gian cá nhân</span><h1>Mục sức khỏe</h1><p>Nơi lưu giữ hồ sơ sức khỏe của bạn trong tương lai.</p></header><section className="nm-account-state-card"><Heartbeat size={36} weight="duotone" aria-hidden="true" /><h2>Hồ sơ sức khỏe sắp có mặt</h2><p>Khi tính năng này được triển khai, các thông tin sức khỏe của bạn sẽ được sắp xếp tại đây. Hiện chưa có dữ liệu hoặc thao tác cần thực hiện.</p></section></main>
}
