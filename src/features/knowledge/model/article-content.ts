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

export const blogPosts: BlogPost[] = [
  {
    slug: 'dinh-duong-can-bang-trong-thai-ky',
    title: 'Dinh dưỡng cân bằng trong thai kỳ: bắt đầu từ điều đơn giản',
    excerpt: 'Một cách tiếp cận nhẹ nhàng để xây dựng bữa ăn đa dạng và chuẩn bị câu hỏi dinh dưỡng cho buổi khám.',
    category: 'Dinh dưỡng',
    readTime: '5 phút đọc',
    publishedAt: '12.08.2026',
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
    source: { label: 'ACOG – Healthy Eating During Pregnancy', href: 'https://www.acog.org/womens-health/faqs/healthy-eating-during-pregnancy' },
  },
  {
    slug: 'van-dong-nhe-nhang-khi-mang-thai',
    title: 'Vận động nhẹ nhàng khi mang thai: lắng nghe cơ thể trước tiên',
    excerpt: 'Những nguyên tắc cơ bản giúp mẹ trao đổi với bác sĩ và xây dựng thói quen vận động phù hợp.',
    category: 'Vận động',
    readTime: '4 phút đọc',
    publishedAt: '10.08.2026',
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
    source: { label: 'CDC – Pregnant & Postpartum Activity', href: 'https://www.cdc.gov/physical-activity-basics/guidelines/healthy-pregnant-or-postpartum-women.html' },
  },
  {
    slug: 'chuan-bi-cho-buoi-kham-thai',
    title: 'Chuẩn bị cho buổi khám thai: những điều nên ghi lại',
    excerpt: 'Một danh sách đơn giản giúp mẹ tận dụng tốt hơn thời gian trao đổi với nhân viên y tế.',
    category: 'Theo dõi thai kỳ',
    readTime: '4 phút đọc',
    publishedAt: '08.08.2026',
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
    source: { label: 'WHO – Antenatal care recommendations', href: 'https://www.who.int/publications/i/item/9789241549912/' },
  },
]

export function findBlogPost(slug: string | undefined) {
  return blogPosts.find((post) => post.slug === slug)
}
