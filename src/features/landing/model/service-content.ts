export type ServiceIconName = 'calendar' | 'notebook' | 'chat' | 'heartbeat' | 'sparkle' | 'scan'

export type ServiceTone = 'rose' | 'sage' | 'lilac' | 'honey' | 'plum' | 'pearl'

interface ServiceStep {
  title: string
  text: string
}

interface ServiceStage extends ServiceStep {
  label: string
}

interface ServiceSnapshot {
  label: string
  value: string
}

export interface ServiceContent {
  slug: string
  icon: ServiceIconName
  tone: ServiceTone
  title: string
  summary: string
  tag: string
  description: string
  promise: string
  highlights: string[]
  steps: ServiceStep[]
  timeline: ServiceStage[]
  snapshot: ServiceSnapshot[]
}

export const services: ServiceContent[] = [
  {
    slug: 'pregnancy-tracking', icon: 'calendar', tone: 'rose', title: 'Theo dõi thai kỳ', tag: 'Hành trình 40 tuần',
    summary: 'Tuần thai, lịch khám, triệu chứng và mọi cột mốc quan trọng được đặt trên một hành trình dễ nhìn lại.',
    description: 'Theo dõi thai kỳ là không gian riêng giúp mẹ biết mình đang ở tuần nào, điều gì sắp đến và cần chuẩn bị gì. Lịch khám, triệu chứng, ghi chú, nhắc việc và những khoảnh khắc đáng nhớ được sắp xếp theo đúng tiến trình thai kỳ.',
    promise: 'Mẹ không cần ghi nhớ mọi thứ — chỉ cần mở NutriMom để thấy hành trình của mình đang ở đâu và bước tiếp theo là gì.',
    highlights: ['Lịch thai kỳ và tuần thai luôn cập nhật rõ ràng', 'Lưu mốc quan trọng, lịch khám và ghi chú cá nhân', 'Theo dõi triệu chứng, cảm xúc và việc cần chuẩn bị'],
    steps: [
      { title: 'Thiết lập thai kỳ', text: 'Nhập ngày dự sinh hoặc mốc thai hiện tại để tạo lịch theo dõi riêng.' },
      { title: 'Ghi nhận mỗi ngày', text: 'Lưu triệu chứng, lịch khám, ghi chú và những thay đổi mẹ muốn theo dõi.' },
      { title: 'Chuẩn bị đúng lúc', text: 'Nhận nhắc việc và xem lại các mốc trước mỗi lần khám hoặc giai đoạn mới.' },
    ],
    timeline: [
      { label: 'Tam cá nguyệt 1', title: 'Làm quen với thay đổi', text: 'Theo dõi triệu chứng ban đầu, lịch khám đầu tiên và những việc mẹ cần ưu tiên.' },
      { label: 'Tam cá nguyệt 2', title: 'Ghi dấu từng chuyển động', text: 'Cập nhật chỉ số, mốc siêu âm và những thay đổi của mẹ qua từng tuần.' },
      { label: 'Tam cá nguyệt 3', title: 'Sẵn sàng đón con', text: 'Tổng hợp lịch khám, việc cần chuẩn bị và các ghi chú quan trọng trước sinh.' },
    ],
    snapshot: [{ label: 'Thai tuần', value: '24 tuần + 3 ngày' }, { label: 'Lịch khám tiếp theo', value: '18 tháng 09' }, { label: 'Cần chuẩn bị', value: '3 việc trong tuần' }],
  },
  {
    slug: 'personal-health-records', icon: 'notebook', tone: 'sage', title: 'Hồ sơ sức khỏe cá nhân', tag: 'Hồ sơ khoa học',
    summary: 'Toàn bộ thông tin sức khỏe của mẹ được lưu trữ tập trung, có cấu trúc và thuận tiện khi cần xem lại.',
    description: 'Trong trang cá nhân, hồ sơ bao gồm thông tin cơ bản, thai kỳ, mốc thai, tiền sử bệnh, dị ứng, thuốc đang dùng, chỉ số sức khỏe, ghi chú, lịch khám và nhu cầu chăm sóc. Mỗi nhóm thông tin được trình bày khoa học để mẹ chủ động hơn khi tự theo dõi hoặc trao đổi với chuyên gia.',
    promise: 'Một hồ sơ liền mạch giúp thông tin sức khỏe không còn nằm rời rạc trong trí nhớ, tin nhắn hay nhiều cuốn sổ khác nhau.',
    highlights: ['Thông tin cơ bản, thai kỳ và mốc thai được kết nối', 'Quản lý tiền sử bệnh, dị ứng và thuốc đang dùng', 'Lưu chỉ số sức khỏe, lịch khám và nhu cầu chăm sóc'],
    steps: [
      { title: 'Tạo hồ sơ riêng', text: 'Bổ sung thông tin nền tảng và thiết lập những dữ liệu mẹ muốn theo dõi.' },
      { title: 'Cập nhật có hệ thống', text: 'Ghi nhận chỉ số, thuốc, dị ứng, lịch khám và ghi chú theo từng nhóm rõ ràng.' },
      { title: 'Xem lại khi cần', text: 'Tóm tắt hồ sơ trước buổi khám để trao đổi đầy đủ và đúng trọng tâm hơn.' },
    ],
    timeline: [
      { label: 'Khởi tạo', title: 'Bức tranh sức khỏe ban đầu', text: 'Tập hợp thông tin cơ bản, tiền sử và nhu cầu chăm sóc của riêng mẹ.' },
      { label: 'Theo dõi', title: 'Dữ liệu thay đổi theo thời gian', text: 'Cập nhật mốc thai, chỉ số sức khỏe, thuốc và lịch khám trong cùng một nơi.' },
      { label: 'Đồng hành lâu dài', title: 'Hồ sơ luôn sẵn sàng', text: 'Dễ dàng nhìn lại lịch sử để chuẩn bị cho những quyết định chăm sóc tiếp theo.' },
    ],
    snapshot: [{ label: 'Nhóm hồ sơ', value: '8 mục đã sắp xếp' }, { label: 'Chỉ số gần nhất', value: 'Đã cập nhật hôm nay' }, { label: 'Quyền riêng tư', value: 'Chỉ bạn kiểm soát' }],
  },
  {
    slug: 'expert-connection', icon: 'chat', tone: 'lilac', title: 'Tư vấn & kết nối', tag: 'Điểm bắt đầu hỗ trợ',
    summary: 'Chọn đúng chủ đề, chuẩn bị câu hỏi và tìm nguồn hỗ trợ phù hợp thay vì tự xoay xở giữa quá nhiều thông tin.',
    description: 'Mẹ bắt đầu bằng việc chọn chủ đề cần tư vấn, ghi lại câu hỏi và xem hướng dẫn chuẩn bị. NutriMom giúp kết nối nhu cầu đó với nguồn hỗ trợ phù hợp, để mỗi cuộc trao đổi rõ ràng, hữu ích và bớt áp lực hơn.',
    promise: 'Đây là điểm bắt đầu hỗ trợ có định hướng — giúp mẹ giảm lo lắng, chủ động hơn và chuẩn bị tốt hơn trước khi trao đổi.',
    highlights: ['Chọn chủ đề và xác định điều đang cần hỗ trợ', 'Chuẩn bị câu hỏi, triệu chứng và bối cảnh liên quan', 'Lưu hướng dẫn và bước tiếp theo sau trao đổi'],
    steps: [
      { title: 'Chọn điều đang băn khoăn', text: 'Xác định chủ đề như dinh dưỡng, giấc ngủ, vận động, tâm lý hoặc chuẩn bị sinh.' },
      { title: 'Chuẩn bị cuộc trao đổi', text: 'Sắp xếp câu hỏi cùng dữ liệu liên quan để không bỏ sót điều quan trọng.' },
      { title: 'Kết nối và theo dõi', text: 'Tiếp cận nguồn hỗ trợ phù hợp, lưu hướng dẫn và chủ động với bước kế tiếp.' },
    ],
    timeline: [
      { label: 'Trước tư vấn', title: 'Làm rõ nhu cầu', text: 'Mẹ chọn chủ đề, xem gợi ý câu hỏi và bổ sung thông tin cần thiết.' },
      { label: 'Khi kết nối', title: 'Trao đổi đúng trọng tâm', text: 'Thông tin đã chuẩn bị giúp cuộc trò chuyện mạch lạc và giảm cảm giác lo lắng.' },
      { label: 'Sau tư vấn', title: 'Biết mình cần làm gì', text: 'Các ghi chú và việc cần theo dõi được lưu lại để mẹ dễ thực hiện.' },
    ],
    snapshot: [{ label: 'Chủ đề đã chọn', value: 'Dinh dưỡng thai kỳ' }, { label: 'Câu hỏi chuẩn bị', value: '4 câu hỏi trọng tâm' }, { label: 'Bước tiếp theo', value: 'Đã lưu vào lịch' }],
  },
  {
    slug: 'care-knowledge', icon: 'heartbeat', tone: 'honey', title: 'Kiến thức chăm sóc', tag: 'Nội dung chọn lọc',
    summary: 'Những bài viết phù hợp với từng giai đoạn, được chọn lọc để mẹ đọc nhẹ nhàng và áp dụng dễ hơn.',
    description: 'Một lớp nội dung hỗ trợ được chọn lọc cho mẹ, gồm chia sẻ hữu ích từ cộng đồng, bài viết biên tập kỹ và nội dung dựa trên nguồn y tế được công nhận. NutriMom trình bày gần gũi, dễ đọc và luôn đặt kiến thức bên cạnh hành trình chăm sóc — không biến trải nghiệm thành một bản tin sức khỏe.',
    promise: 'Mẹ nhận đúng nội dung mình cần ở đúng giai đoạn, thay vì phải tự lọc giữa quá nhiều bài viết và lời khuyên rời rạc.',
    highlights: ['Chia sẻ thực tế từ cộng đồng được chọn lọc', 'Bài viết biên tập kỹ, nhẹ nhàng và dễ áp dụng', 'Nội dung tham khảo nguồn y tế được công nhận'],
    steps: [
      { title: 'Chọn theo nhu cầu', text: 'Xem nội dung gắn với tuần thai, mối quan tâm và mục tiêu chăm sóc hiện tại.' },
      { title: 'Đọc phần cần thiết', text: 'Mỗi bài được trình bày ngắn gọn, có cấu trúc và nêu rõ nguồn tham khảo.' },
      { title: 'Đưa vào hành trình', text: 'Lưu điều hữu ích hoặc dùng làm nền tảng để chuẩn bị câu hỏi cho chuyên gia.' },
    ],
    timeline: [
      { label: 'Khám phá', title: 'Nội dung đến đúng lúc', text: 'Ưu tiên chủ đề phù hợp với giai đoạn và những điều mẹ đang quan tâm.' },
      { label: 'Chọn lọc', title: 'Đọc với sự an tâm', text: 'Phân biệt chia sẻ cộng đồng, bài biên tập và nội dung có nguồn y tế.' },
      { label: 'Ứng dụng', title: 'Biến hiểu biết thành chuẩn bị', text: 'Lưu điều quan trọng và trao đổi thêm với chuyên gia khi cần.' },
    ],
    snapshot: [{ label: 'Dành cho bạn', value: 'Tuần thai 24' }, { label: 'Mức độ đọc', value: '5 phút · dễ hiểu' }, { label: 'Nguồn nội dung', value: 'Được phân loại rõ' }],
  },
  {
    slug: 'food-scan-ai', icon: 'scan', tone: 'plum', title: 'AI scan món ăn', tag: 'Tính năng nổi bật',
    summary: 'Chụp một bữa ăn, hiểu ngay thành phần dinh dưỡng và biết nên bổ sung điều gì cho thai kỳ khỏe mạnh.',
    description: 'Chụp hoặc tải ảnh món ăn, AI sẽ nhận diện món và khẩu phần, phân tích dinh dưỡng, đánh giá chất lượng, lượng dùng, nguy cơ thiếu hoặc thừa chất rồi gợi ý cách bổ sung. Kết quả được đặt trong bối cảnh thai kỳ để hữu ích hơn cho mỗi bữa ăn.',
    promise: 'Từ một bức ảnh, mẹ có thêm dữ liệu để theo dõi bữa ăn, tránh thiếu hụt chất và xây dựng thực đơn phù hợp hơn.',
    highlights: ['Nhận diện món ăn và ước tính thành phần dinh dưỡng', 'Đánh giá lượng dùng, chất thiếu và chất có xu hướng dư', 'Gợi ý bổ sung để hỗ trợ thai kỳ khỏe mạnh'],
    steps: [
      { title: 'Chụp hoặc tải ảnh', text: 'Đưa bữa ăn vào NutriMom bằng camera hoặc một hình ảnh có sẵn.' },
      { title: 'AI phân tích', text: 'Hệ thống nhận diện món, ước tính khẩu phần và đánh giá các nhóm chất chính.' },
      { title: 'Nhận gợi ý phù hợp', text: 'Xem điểm cân bằng, chất cần bổ sung và gợi ý cho những bữa tiếp theo.' },
    ],
    timeline: [
      { label: 'Bữa sáng', title: 'Bắt đầu ngày đủ chất', text: 'Theo dõi năng lượng và nhóm chất quan trọng từ bữa ăn đầu ngày.' },
      { label: 'Trong ngày', title: 'Nhìn ra khoảng thiếu hụt', text: 'Các lần scan giúp mẹ hiểu tổng thể chất đã đủ, thiếu hoặc có xu hướng dư.' },
      { label: 'Gợi ý tiếp theo', title: 'Cân bằng bằng lựa chọn nhỏ', text: 'NutriMom đề xuất món bổ sung và thực đơn gần với thói quen của mẹ.' },
    ],
    snapshot: [{ label: 'Điểm cân bằng', value: '8,6 / 10' }, { label: 'Nên bổ sung', value: 'Sắt · Chất xơ' }, { label: 'Gợi ý bữa sau', value: '2 lựa chọn phù hợp' }],
  },
  {
    slug: 'personalized-guidance', icon: 'sparkle', tone: 'pearl', title: 'Gợi ý phù hợp', tag: 'Cho mẹ & gia đình',
    summary: 'Gợi ý cá nhân hóa cho mẹ và người chồng, thay đổi theo từng tuần thai, nhu cầu và nhịp sống của gia đình.',
    description: 'AI gợi ý thực đơn, bài tập theo tuần hoặc tháng thai, cách giải tỏa stress và mức độ phù hợp với từng giai đoạn. Người chồng cũng nhận được gợi ý nấu ăn, hỗ trợ vợ và cùng tạo nhịp chăm sóc nhẹ nhàng hơn trong gia đình.',
    promise: 'Không phải lời khuyên chung cho tất cả — mỗi gợi ý được điều chỉnh theo giai đoạn, hồ sơ và người sẽ thực hiện.',
    highlights: ['Thực đơn và bài tập theo thai tuần hoặc tháng', 'Gợi ý giải stress và chăm sóc theo mức độ phù hợp', 'Hướng dẫn người chồng nấu ăn và hỗ trợ vợ'],
    steps: [
      { title: 'Hiểu bối cảnh của bạn', text: 'Thai tuần, hồ sơ, sở thích và nhu cầu được dùng để xác định điều phù hợp.' },
      { title: 'Nhận gợi ý vừa đủ', text: 'Mẹ và người chồng thấy các đề xuất riêng, rõ người làm và thời điểm thực hiện.' },
      { title: 'Điều chỉnh theo phản hồi', text: 'Đánh dấu mức độ phù hợp để những gợi ý tiếp theo ngày càng sát với gia đình.' },
    ],
    timeline: [
      { label: 'Buổi sáng', title: 'Một khởi đầu nhẹ nhàng', text: 'Gợi ý bữa sáng và vận động phù hợp với năng lượng của mẹ.' },
      { label: 'Trong ngày', title: 'Hỗ trợ đúng người', text: 'Mỗi thành viên nhận việc nhỏ, cụ thể để việc chăm sóc không dồn lên một người.' },
      { label: 'Cuối ngày', title: 'Lắng nghe và điều chỉnh', text: 'Phản hồi ngắn giúp hệ thống hiểu điều gì thực sự phù hợp với gia đình.' },
    ],
    snapshot: [{ label: 'Cho mẹ', value: '3 gợi ý hôm nay' }, { label: 'Cho người đồng hành', value: '2 việc có thể hỗ trợ' }, { label: 'Mức độ phù hợp', value: 'Rất phù hợp' }],
  },
]

export function findService(slug: string | undefined) {
  return services.find((service) => service.slug === slug)
}
