export const adminNavigationGroups = [
  { label: 'Vận hành', items: [{ label: 'Tổng quan', to: '/admin', end: true, icon: 'overview' }] },
  { label: 'Chuyên gia & người dùng', items: [{ label: 'Người dùng', to: '/admin/users', icon: 'users' }, { label: 'Chuyên gia', to: '/admin/experts', icon: 'experts' }] },
  { label: 'Quản lý tư vấn', items: [{ label: 'Lịch tư vấn', to: '/admin/appointments', icon: 'appointments' }, { label: 'Lịch sử tư vấn', to: '/admin/consultations', icon: 'consultations' }] },
  { label: 'Hỗ trợ người dùng', items: [{ label: 'Hỗ trợ', to: '/admin/support', icon: 'support' }, { label: 'Cộng đồng', to: '/admin/community', icon: 'community' }, { label: 'Kiến thức', to: '/admin/knowledge', icon: 'knowledge' }] },
  { label: 'Báo cáo tổng', items: [{ label: 'Doanh thu & Gói dịch vụ', to: '/admin/revenue', icon: 'revenue' }, { label: 'Báo cáo', to: '/admin/reports', icon: 'reports' }] },
  { label: 'Lịch sử thông báo', items: [{ label: 'Thông báo', to: '/admin/notifications', icon: 'notifications' }, { label: 'Đánh giá', to: '/admin/reviews', icon: 'support' }] },
] as const
