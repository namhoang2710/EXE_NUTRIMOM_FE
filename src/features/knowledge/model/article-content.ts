export interface BlogSection {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  category: string
  readTime: string
  publishedAt: string
  lead: string
  sections: BlogSection[]
  source: { label: string; href: string }
}

// Mock content is kept separate from the UI so it can be replaced by CMS data later.
export const blogPosts: BlogPost[] = [
  {
    slug: 'dinh-duong-can-bang-trong-thai-ky',
    title: 'Dinh dưỡng cân bằng trong thai kỳ: bắt đầu từ điều đơn giản',
    excerpt: 'Một cách tiếp cận nhẹ nhàng để xây dựng bữa ăn đa dạng và chuẩn bị câu hỏi dinh dưỡng cho buổi khám.',
    category: 'Dinh dưỡng',
    readTime: '5 phút đọc',
    publishedAt: '08.09.2026',
    lead: 'Ăn uống lành mạnh trong thai kỳ không có nghĩa là phải ăn gấp đôi. Điều quan trọng hơn là lựa chọn đa dạng, cân bằng và phù hợp với tình trạng sức khỏe riêng.',
    sections: [
      {
        heading: 'Ưu tiên sự đa dạng trong mỗi ngày',
        paragraphs: ['Các nhóm thực phẩm khác nhau đóng góp những dưỡng chất khác nhau. Một chế độ ăn đa dạng thường dễ duy trì hơn những quy tắc quá khắt khe.'],
        bullets: ['Rau và trái cây với nhiều màu sắc', 'Nguồn đạm phù hợp', 'Ngũ cốc, sữa hoặc lựa chọn thay thế phù hợp', 'Nước trong suốt cả ngày'],
      },
      {
        heading: 'Thực phẩm bổ sung cần được trao đổi',
        paragraphs: ['Nhu cầu vitamin và khoáng chất có thể thay đổi theo từng người. Không nên tự tăng liều sản phẩm bổ sung; hãy trao đổi với bác sĩ hoặc chuyên gia theo dõi thai kỳ.'],
      },
      {
        heading: 'Ghi lại điều cơ thể phản hồi',
        paragraphs: ['Nếu một món ăn gây khó chịu hoặc mẹ gặp vấn đề kéo dài với ăn uống, hãy ghi lại thời điểm và biểu hiện để trao đổi trong buổi khám thay vì tự loại bỏ nhiều nhóm thực phẩm.'],
      },
    ],
    source: { label: 'ACOG — Healthy Eating During Pregnancy', href: 'https://www.acog.org/womens-health/faqs/healthy-eating-during-pregnancy' },
  },
  {
    slug: 'giac-ngu-em-diu-cho-me-bau',
    title: 'Giấc ngủ êm dịu hơn khi cơ thể đang đổi thay',
    excerpt: 'Những điều chỉnh nhỏ cho buổi tối giúp mẹ tạo nhịp nghỉ ngơi dễ chịu và biết khi nào nên tìm hỗ trợ.',
    category: 'Sống khỏe',
    readTime: '6 phút đọc',
    publishedAt: '05.09.2026',
    lead: 'Thay đổi hormone, cảm giác khó chịu và nhiều suy nghĩ có thể làm giấc ngủ trong thai kỳ trở nên chập chờn. Một nhịp tối đều đặn là điểm khởi đầu nhẹ nhàng để cơ thể được nghỉ ngơi.',
    sections: [
      {
        heading: 'Tạo tín hiệu nghỉ ngơi cho cơ thể',
        paragraphs: ['Giảm ánh sáng, tạm rời màn hình và lặp lại một vài hoạt động thư giãn có thể giúp cơ thể nhận biết đã đến giờ nghỉ. Hãy chọn điều đơn giản mà mẹ có thể duy trì.'],
      },
      {
        heading: 'Sắp xếp không gian dễ chịu',
        paragraphs: ['Phòng ngủ thoáng, nhiệt độ phù hợp và gối hỗ trợ đúng vị trí có thể giúp mẹ thoải mái hơn. Không có một tư thế duy nhất phù hợp với tất cả mọi người.'],
        bullets: ['Giữ giờ ngủ và thức tương đối ổn định', 'Hạn chế đồ uống chứa caffeine vào cuối ngày', 'Trao đổi với bác sĩ trước khi dùng bất kỳ sản phẩm hỗ trợ ngủ nào'],
      },
      {
        heading: 'Khi giấc ngủ cần được quan tâm thêm',
        paragraphs: ['Nếu mất ngủ kéo dài, ngáy lớn kèm khó thở, lo âu nhiều hoặc kiệt sức ban ngày, mẹ nên chia sẻ sớm với nhân viên y tế đang theo dõi thai kỳ.'],
      },
    ],
    source: { label: 'NHS — Tiredness and sleep problems in pregnancy', href: 'https://www.nhs.uk/pregnancy/related-conditions/common-symptoms/tiredness/' },
  },
  {
    slug: 'van-dong-nhe-nhang-khi-mang-thai',
    title: 'Vận động nhẹ nhàng khi mang thai: lắng nghe cơ thể trước tiên',
    excerpt: 'Những nguyên tắc cơ bản giúp mẹ xây dựng thói quen vận động phù hợp và an toàn hơn.',
    category: 'Vận động',
    readTime: '4 phút đọc',
    publishedAt: '02.09.2026',
    lead: 'Đối với thai kỳ khỏe mạnh, vận động mức độ vừa thường được xem là an toàn và có lợi. Tuy nhiên, tình trạng của mỗi người khác nhau nên kế hoạch cần được trao đổi với người theo dõi thai kỳ.',
    sections: [
      {
        heading: 'Bắt đầu từ hoạt động quen thuộc',
        paragraphs: ['Đi bộ, một số hình thức yoga hoặc vận động dưới nước là những ví dụ thường được nhắc đến. Cường độ và thời lượng nên tăng dần theo khả năng thay vì cố đạt mục tiêu ngay lập tức.'],
      },
      {
        heading: 'Nhịp độ vừa phải và đều đặn',
        paragraphs: ['CDC khuyến nghị người mang thai khỏe mạnh hướng tới tổng cộng 150 phút hoạt động aerobic mức độ vừa mỗi tuần, có thể chia thành nhiều khoảng ngắn. Hãy hỏi bác sĩ xem khuyến nghị này có phù hợp với bạn không.'],
      },
      {
        heading: 'Khi nào nên dừng và hỏi ý kiến',
        paragraphs: ['Nếu có triệu chứng bất thường, tình trạng sức khỏe đặc biệt hoặc được khuyến cáo hạn chế vận động, hãy dừng hoạt động và liên hệ nhân viên y tế. Nội dung trực tuyến không thể đánh giá an toàn cho từng cá nhân.'],
      },
    ],
    source: { label: 'CDC — Pregnant & Postpartum Activity', href: 'https://www.cdc.gov/physical-activity-basics/guidelines/healthy-pregnant-or-postpartum-women.html' },
  },
  {
    slug: 'chuan-bi-cho-buoi-kham-thai',
    title: 'Chuẩn bị cho buổi khám thai: những điều nên ghi lại',
    excerpt: 'Một danh sách đơn giản giúp mẹ tận dụng tốt hơn thời gian trao đổi với nhân viên y tế.',
    category: 'Thai kỳ',
    readTime: '4 phút đọc',
    publishedAt: '29.08.2026',
    lead: 'Chăm sóc trước sinh không chỉ là kiểm tra sức khỏe mà còn là cơ hội để mẹ đặt câu hỏi, chia sẻ điều đang lo lắng và chuẩn bị cho những giai đoạn tiếp theo.',
    sections: [
      {
        heading: 'Ghi lại thay đổi và câu hỏi',
        paragraphs: ['Trước buổi khám, mẹ có thể ghi ngắn gọn các thay đổi đã nhận thấy, thuốc hoặc sản phẩm bổ sung đang dùng và câu hỏi muốn được giải đáp.'],
        bullets: ['Triệu chứng mới hoặc kéo dài', 'Danh sách thuốc và sản phẩm bổ sung', 'Thói quen ăn uống, ngủ và vận động', 'Điều khiến mẹ cảm thấy lo lắng'],
      },
      {
        heading: 'Mang theo thông tin cần thiết',
        paragraphs: ['Nếu có kết quả kiểm tra, hồ sơ từ cơ sở khác hoặc ghi chú theo dõi tại nhà, hãy sắp xếp chúng theo thời gian để dễ trao đổi.'],
      },
      {
        heading: 'Xác nhận bước tiếp theo',
        paragraphs: ['Trước khi kết thúc, mẹ có thể xác nhận lịch hẹn tiếp theo, dấu hiệu nào cần liên hệ sớm và những hướng dẫn cần thực hiện tại nhà.'],
      },
    ],
    source: { label: 'WHO — Antenatal care recommendations', href: 'https://www.who.int/publications/i/item/9789241549912/' },
  },
  {
    slug: 'cham-soc-tinh-than-sau-sinh',
    title: 'Chăm sóc tinh thần sau sinh: mẹ cũng cần được ôm ấp',
    excerpt: 'Nhận biết cảm xúc, xây vòng tròn hỗ trợ và tìm trợ giúp sớm khi những ngày đầu trở nên quá sức.',
    category: 'Sau sinh',
    readTime: '7 phút đọc',
    publishedAt: '25.08.2026',
    lead: 'Sau sinh là một giai đoạn chuyển tiếp lớn. Niềm vui có thể đi cùng mệt mỏi, lo lắng hoặc buồn bã; những cảm xúc ấy xứng đáng được lắng nghe mà không phán xét.',
    sections: [
      {
        heading: 'Cho phép mình nói thật về cảm xúc',
        paragraphs: ['Không cần phải ổn mọi lúc. Chia sẻ cụ thể với một người tin cậy về điều mẹ đang trải qua có thể giúp mọi người hiểu cách hỗ trợ phù hợp hơn.'],
      },
      {
        heading: 'Biến lời đề nghị giúp đỡ thành việc cụ thể',
        paragraphs: ['Một bữa ăn, một giờ trông bé hoặc một cuộc gọi ngắn có thể tạo ra khoảng nghỉ quý giá. Mẹ có thể viết sẵn vài việc nhỏ để người thân dễ dàng chung tay.'],
        bullets: ['Nhờ người thân chuẩn bị một bữa ăn', 'Chia ca chăm bé khi có thể', 'Dành một khoảng ngắn để tắm, ăn hoặc nghỉ', 'Giữ liên hệ với người khiến mẹ thấy an toàn'],
      },
      {
        heading: 'Tìm hỗ trợ chuyên môn sớm',
        paragraphs: ['Nếu cảm giác buồn, lo âu, tội lỗi hoặc mất kết nối kéo dài hay ảnh hưởng đến sinh hoạt, hãy liên hệ bác sĩ hoặc dịch vụ hỗ trợ tâm lý. Nếu có ý nghĩ làm hại bản thân hoặc em bé, cần tìm trợ giúp khẩn cấp ngay.'],
      },
    ],
    source: { label: 'WHO — Maternal mental health', href: 'https://www.who.int/teams/mental-health-and-substance-use/promotion-prevention/maternal-mental-health' },
  },
  {
    slug: 'nuoi-con-bang-sua-me-nhung-ngay-dau',
    title: 'Nuôi con bằng sữa mẹ những ngày đầu: dịu dàng với cả hai',
    excerpt: 'Một góc nhìn thực tế về nhịp bú, dấu hiệu cần hỗ trợ và cách giảm áp lực cho mẹ sau sinh.',
    category: 'Sau sinh',
    readTime: '6 phút đọc',
    publishedAt: '20.08.2026',
    lead: 'Mỗi hành trình nuôi con đều khác nhau. Thay vì chạy theo một khuôn mẫu hoàn hảo, mẹ có thể quan sát em bé, chăm sóc cơ thể mình và tìm hỗ trợ chuyên môn khi cần.',
    sections: [
      {
        heading: 'Học tín hiệu của em bé',
        paragraphs: ['Những dấu hiệu sớm như quay đầu tìm, đưa tay lên miệng hoặc cử động môi có thể xuất hiện trước khi bé khóc. Đáp ứng sớm đôi khi giúp cả mẹ và bé bình tĩnh hơn.'],
      },
      {
        heading: 'Sự thoải mái của mẹ rất quan trọng',
        paragraphs: ['Tư thế phù hợp và khớp ngậm tốt có thể giảm khó chịu. Đau kéo dài, tổn thương đầu ti hoặc lo lắng bé không bú đủ là những lý do chính đáng để tìm người hỗ trợ có chuyên môn.'],
      },
      {
        heading: 'Không biến việc cho bú thành thước đo',
        paragraphs: ['Hoàn cảnh sức khỏe và lựa chọn của mỗi gia đình khác nhau. Mục tiêu là em bé được nuôi dưỡng an toàn và người mẹ được tôn trọng, cung cấp đủ thông tin để ra quyết định.'],
      },
    ],
    source: { label: 'UNICEF — Breastfeeding', href: 'https://www.unicef.org/parenting/food-nutrition/breastfeeding' },
  },
  {
    slug: 'chuan-bi-suc-khoe-truoc-khi-mang-thai',
    title: 'Chuẩn bị sức khỏe trước khi mang thai: bắt đầu cùng nhau',
    excerpt: 'Những cuộc trò chuyện và thói quen nhỏ giúp hai bạn bước vào hành trình mới chủ động hơn.',
    category: 'Chuẩn bị',
    readTime: '5 phút đọc',
    publishedAt: '16.08.2026',
    lead: 'Chăm sóc sức khỏe trước khi mang thai là dịp để nhìn lại thói quen, tiền sử sức khỏe và những điều hai bạn cần chuẩn bị — không phải một danh sách để tạo thêm áp lực.',
    sections: [
      {
        heading: 'Bắt đầu bằng một cuộc hẹn sức khỏe',
        paragraphs: ['Trao đổi với nhân viên y tế về bệnh nền, thuốc đang dùng, tiền sử tiêm chủng và kế hoạch mang thai giúp xác định những điều cần ưu tiên cho từng người.'],
      },
      {
        heading: 'Xây nền tảng từ thói quen hằng ngày',
        paragraphs: ['Bữa ăn đa dạng, vận động phù hợp, ngủ đủ và tránh thuốc lá, rượu bia là những nền tảng có lợi cho sức khỏe tổng thể. Thay đổi nhỏ nhưng đều đặn thường bền vững hơn.'],
      },
      {
        heading: 'Cùng chia sẻ trách nhiệm',
        paragraphs: ['Sự chuẩn bị không chỉ thuộc về người sẽ mang thai. Hai bạn có thể cùng sắp xếp lịch khám, tìm hiểu thông tin và tạo môi trường sống hỗ trợ sức khỏe cho cả gia đình.'],
        bullets: ['Ghi lại thuốc và thực phẩm bổ sung đang dùng', 'Rà soát lịch tiêm chủng với nhân viên y tế', 'Thống nhất cách chia sẻ việc nhà và tài chính', 'Dành chỗ cho những cảm xúc chưa chắc chắn'],
      },
    ],
    source: { label: 'CDC — Planning for Pregnancy', href: 'https://www.cdc.gov/pregnancy/about/index.html' },
  },
]

export function findBlogPost(slug: string | undefined) {
  return blogPosts.find((post) => post.slug === slug)
}
