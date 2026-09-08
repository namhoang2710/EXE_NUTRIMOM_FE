export type ServiceIconName = 'calendar' | 'notebook' | 'chat' | 'heartbeat' | 'shield' | 'sparkle'

export interface ServiceContent {
  slug: string
  icon: ServiceIconName
  title: string
  summary: string
  tag: string
  description: string
  highlights: string[]
  steps: Array<{ title: string; text: string }>
}

export const services: ServiceContent[] = [
  {
    slug: 'pregnancy-tracking',
    icon: 'calendar',
    title: 'Theo dõi hành trình thai kỳ',
    summary: 'Ghi lại các mốc quan trọng và quản lý thông tin theo từng giai đoạn.',
    tag: 'Theo dõi',
    description: 'Một không gian giúp mẹ hình dung rõ hành trình theo tuần, lưu lại điều cần nhớ và chuẩn bị tốt hơn cho mỗi cột mốc tiếp theo.',
    highlights: ['Dòng thời gian theo từng giai đoạn', 'Ghi chú cột mốc đáng nhớ', 'Nhắc việc và lịch hẹn quan trọng'],
    steps: [
      { title: 'Bắt đầu từ thông tin cơ bản', text: 'Thiết lập mốc thai kỳ để nội dung được sắp xếp theo đúng giai đoạn.' },
      { title: 'Theo dõi điều quan trọng', text: 'Lưu ghi chú, lịch hẹn và những thay đổi mẹ muốn trao đổi với chuyên gia.' },
      { title: 'Nhìn lại hành trình', text: 'Các cột mốc được tập hợp rõ ràng để mẹ dễ dàng xem lại khi cần.' },
    ],
  },
  {
    slug: 'personal-health-records',
    icon: 'notebook',
    title: 'Hồ sơ sức khỏe cá nhân',
    summary: 'Sắp xếp dữ liệu của mẹ trong một không gian rõ ràng và thuận tiện.',
    tag: 'Hồ sơ',
    description: 'NutriMom hướng đến việc giúp mẹ tập hợp thông tin sức khỏe quan trọng ở một nơi, giảm cảm giác rời rạc khi cần xem lại hoặc chuẩn bị cho buổi tư vấn.',
    highlights: ['Thông tin được phân nhóm rõ ràng', 'Dễ xem lại trước mỗi buổi khám', 'Ưu tiên trải nghiệm riêng tư'],
    steps: [
      { title: 'Tạo hồ sơ riêng', text: 'Mỗi tài khoản có không gian cá nhân để lưu thông tin theo nhu cầu.' },
      { title: 'Sắp xếp theo chủ đề', text: 'Gom dữ liệu thành các nhóm dễ đọc thay vì ghi chú rời rạc.' },
      { title: 'Chủ động khi trao đổi', text: 'Xem lại thông tin cần thiết trước khi gặp bác sĩ hoặc chuyên gia.' },
    ],
  },
  {
    slug: 'expert-connection',
    icon: 'chat',
    title: 'Tư vấn và kết nối',
    summary: 'Tiếp cận nguồn hỗ trợ phù hợp để giải đáp những băn khoăn thường gặp.',
    tag: 'Kết nối',
    description: 'Một điểm bắt đầu rõ ràng để mẹ chuẩn bị câu hỏi, tìm đúng nhóm hỗ trợ và chủ động hơn trong những cuộc trao đổi quan trọng.',
    highlights: ['Chuẩn bị câu hỏi trước tư vấn', 'Tìm nội dung theo mối quan tâm', 'Kết nối đúng nhu cầu'],
    steps: [
      { title: 'Chọn điều đang quan tâm', text: 'Xác định chủ đề để thu hẹp nội dung và nguồn hỗ trợ phù hợp.' },
      { title: 'Chuẩn bị thông tin', text: 'Ghi lại triệu chứng, câu hỏi và bối cảnh cần thiết trước khi trao đổi.' },
      { title: 'Theo dõi sau tư vấn', text: 'Lưu lại những điều cần nhớ và bước tiếp theo đã được thống nhất.' },
    ],
  },
  {
    slug: 'care-knowledge',
    icon: 'heartbeat',
    title: 'Kiến thức chăm sóc',
    summary: 'Tìm hiểu nội dung sức khỏe được trình bày gần gũi và dễ áp dụng.',
    tag: 'Kiến thức',
    description: 'Thư viện bài viết giúp mẹ tiếp cận thông tin phổ thông theo cách dễ đọc, có nguồn tham khảo và luôn nhắc rõ giới hạn của nội dung trực tuyến.',
    highlights: ['Bài viết theo từng chủ đề', 'Nguồn tham khảo minh bạch', 'Ngôn ngữ gần gũi, dễ đọc'],
    steps: [
      { title: 'Khám phá theo chủ đề', text: 'Tìm bài viết về dinh dưỡng, vận động và chuẩn bị chăm sóc thai kỳ.' },
      { title: 'Đọc nguồn tham khảo', text: 'Mỗi bài nêu rõ nguồn y tế chính thống dùng để tổng hợp thông tin.' },
      { title: 'Trao đổi khi cần', text: 'Dùng bài viết để chuẩn bị câu hỏi, không thay thế chẩn đoán hay tư vấn cá nhân.' },
    ],
  },
  {
    slug: 'information-safety',
    icon: 'shield',
    title: 'Bảo vệ thông tin',
    summary: 'Ưu tiên sự riêng tư để mẹ an tâm lưu giữ dữ liệu cá nhân.',
    tag: 'An toàn',
    description: 'Thông tin cá nhân cần được quản lý có chủ đích. NutriMom trình bày rõ cách phiên đăng nhập hoạt động và những nguyên tắc an toàn người dùng nên biết.',
    highlights: ['Phiên đăng nhập được kiểm soát', 'Chủ động đăng xuất khi cần', 'Thông tin riêng tư không hiển thị công khai'],
    steps: [
      { title: 'Đăng nhập trên thiết bị tin cậy', text: 'Hạn chế lưu phiên trên thiết bị công cộng hoặc dùng chung.' },
      { title: 'Bảo vệ thông tin truy cập', text: 'Không chia sẻ mật khẩu, OTP hoặc mã xác minh cho người khác.' },
      { title: 'Kết thúc phiên chủ động', text: 'Đăng xuất khi hoàn tất, đặc biệt trên thiết bị không thuộc quyền sở hữu.' },
    ],
  },
  {
    slug: 'personalized-guidance',
    icon: 'sparkle',
    title: 'Gợi ý phù hợp',
    summary: 'Nhận trải nghiệm được định hướng theo nhu cầu và hành trình riêng.',
    tag: 'Cá nhân hóa',
    description: 'Thay vì đưa tất cả thông tin cùng lúc, trải nghiệm được định hướng theo giai đoạn và điều mẹ đang quan tâm để giảm quá tải khi tìm kiếm.',
    highlights: ['Ưu tiên nội dung liên quan', 'Dễ quay lại chủ đề đang theo dõi', 'Trải nghiệm nhẹ nhàng theo từng bước'],
    steps: [
      { title: 'Chọn mối quan tâm', text: 'Xác định nhóm nội dung phù hợp với nhu cầu hiện tại.' },
      { title: 'Nhận gợi ý có chọn lọc', text: 'Nội dung liên quan được ưu tiên để mẹ không phải tìm kiếm từ đầu.' },
      { title: 'Điều chỉnh theo hành trình', text: 'Mối quan tâm có thể thay đổi khi mẹ bước sang một giai đoạn mới.' },
    ],
  },
]

export function findService(slug: string | undefined) {
  return services.find((service) => service.slug === slug)
}
