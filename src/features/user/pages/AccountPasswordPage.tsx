import { LockKey } from '@phosphor-icons/react'

export function AccountPasswordPage() {
  return <main className="nm-account-workspace-page"><header className="nm-account-workspace-heading"><span>Thiết lập tài khoản</span><h1>Mật khẩu</h1><p>Quản lý cách bảo vệ tài khoản NutriMom của bạn.</p></header><section className="nm-account-state-card"><LockKey size={36} weight="duotone" aria-hidden="true" /><h2>Đổi mật khẩu chưa được hỗ trợ</h2><p>Backend hiện chưa cung cấp API đổi hoặc đặt lại mật khẩu. Bạn vẫn có thể dùng mã OTP để đăng nhập trong lần tiếp theo nếu tài khoản của bạn hỗ trợ phương thức này.</p></section></main>
}
