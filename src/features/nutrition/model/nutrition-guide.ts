export const nutritionGuide = [
  {
    id: 'welcome',
    title: 'Bữa ăn phù hợp với bạn, từng ngày',
    intro: 'Từ chọn món đến ghi lại bữa đã ăn, mình cùng đi từng bước nhé.',
    steps: [
      'Cho biết khẩu vị và những thành phần bạn cần tránh.',
      'Chọn thực đơn, chuẩn bị nguyên liệu rồi ghi món đã ăn.',
      'Bạn có thể đóng bất cứ lúc nào; lần sau sẽ tiếp tục từ trang đang đọc.',
    ],
    expected:
      'Bạn luôn là người chọn món và xác nhận bữa ăn. Chỉ xem hướng dẫn sẽ không thay đổi thông tin của bạn.',
  },
  {
    id: 'tabs',
    title: 'Bắt đầu từ đâu?',
    intro: 'Bốn mục nhỏ, mỗi mục giúp bạn làm một việc.',
    steps: [
      'Hôm nay: xem các bữa dự kiến và ghi món bạn đã ăn.',
      'Thực đơn: tạo, lưu, đổi món và mở danh sách mua sắm.',
      'Khám phá: tìm món, xem nguyên liệu và cách nấu.',
      'Nhật ký: xem lại, sửa hoặc xóa những món đã ghi.',
    ],
    expected:
      'Khi chưa có thực đơn, bắt đầu với Hồ sơ ăn uống. Khi đã có, bạn có thể xem bữa ăn ngay ở Hôm nay.',
  },
  {
    id: 'profile',
    title: 'Cho chúng mình biết về bạn',
    intro: 'Một vài thông tin giúp gợi ý gần với nhu cầu của bạn hơn.',
    steps: [
      'Bấm Hồ sơ ăn uống. Kiểm tra tuần thai và ngày dự sinh; nếu chưa có, chọn Cập nhật hồ sơ thai kỳ.',
      'Ở Dị ứng, chọn đúng tình trạng của bạn và các thành phần cần tránh. Nếu chưa rõ, hãy chọn chưa rõ.',
      'Bấm Lưu và tiếp tục khi thiết lập lần đầu, hoặc Lưu thay đổi khi sửa thông tin đã có.',
    ],
    expected:
      'Thông tin được lưu để dùng cho gợi ý tiếp theo. Dị ứng là điều cần tránh; món không thích sẽ được khai riêng ở Khẩu vị.',
  },
  {
    id: 'preferences',
    title: 'Chọn theo nhịp sống của bạn',
    intro: 'Bạn có thể bổ sung dần, không cần điền hết trong một lần.',
    steps: [
      'Ở Khẩu vị, chọn cách ăn và nguyên liệu không thích. Mục này có thể bỏ qua khi mới bắt đầu.',
      'Ở Sinh hoạt, chọn các bữa cần lập. Chọn Bữa phụ nếu muốn, rồi chọn số bữa phụ mỗi ngày.',
      'Điền thời gian nấu và ngân sách nếu có. Ở Năng lượng, bạn có thể chọn Để sau.',
      'Khi cần chỉnh, mở lại đúng mục trong Hồ sơ ăn uống rồi bấm Lưu thay đổi.',
    ],
    expected:
      'Các lựa chọn giúp sắp xếp gợi ý. Khi tạo thực đơn, bạn vẫn có thể chọn riêng ngày, bữa và các ưu tiên cho lần đó.',
  },
  {
    id: 'explore',
    title: 'Tìm một món bạn muốn ăn',
    intro: 'Xem trước nguyên liệu và cách nấu để dễ quyết định.',
    steps: [
      'Vào Khám phá. Chọn bữa ăn, loại món hoặc thời gian nấu để thu gọn danh sách.',
      'Bấm tên món để xem nguyên liệu, khẩu phần, cách nấu và lưu ý.',
      'Bấm Yêu thích món này nếu muốn lưu sở thích. Nếu không muốn được gợi ý món đó, chọn Không muốn gợi ý món này.',
    ],
    expected:
      'Yêu thích không tự thêm món vào thực đơn. Món chưa có ảnh vẫn có thể xem công thức và sẽ dùng hình thay thế.',
  },
  {
    id: 'create',
    title: 'Tạo thực đơn đầu tiên',
    intro: 'Lần đầu, bạn có thể thử một ngày và một bữa cho dễ làm quen.',
    steps: [
      'Vào Thực đơn. Chọn ngày bắt đầu, số ngày 1, 3 hoặc 7 và những bữa bạn cần.',
      'Bấm Tiếp tục chọn ưu tiên. Ngân sách và thời gian có thể để trống khi chưa cần đặt.',
      'Chỉ bật giới hạn bắt buộc khi bạn muốn áp dụng thật chặt. Món chưa có giá có thể không được chọn khi bắt buộc trong ngân sách.',
      'Bấm Tạo bản xem trước, chờ tìm món rồi xem từng bữa và ngày.',
    ],
    expected:
      'Bạn có một bản để xem và cân nhắc. Bản xem trước chưa được lưu và chưa phải là những món bạn đã ăn.',
  },
  {
    id: 'edit',
    title: 'Lưu và chỉnh cho vừa ý',
    intro: 'Bạn có thể thay đổi thực đơn sau khi đã lưu.',
    steps: [
      'Khi thấy phù hợp, bấm Lưu và tùy chỉnh.',
      'Trên từng món, bấm Đổi món / khẩu phần. Chọn món khác nếu có hoặc chỉnh số phần, rồi xác nhận.',
      'Bấm Giữ món nếu muốn giữ món đó cho lần tạo lại. Bấm Bỏ giữ khi đổi ý.',
      'Trong Điều chỉnh thực đơn, chọn Hoàn tác thao tác gần nhất nếu cần quay lại thay đổi vừa làm.',
    ],
    expected:
      'Món và số liệu dự kiến được cập nhật. Việc lưu hay sửa thực đơn không tự ghi nhật ký ăn uống.',
  },
  {
    id: 'shopping',
    title: 'Chuẩn bị nguyên liệu dễ hơn',
    intro: 'Đi từ thực đơn đã lưu đến danh sách cần chuẩn bị.',
    steps: [
      'Trong thực đơn đã lưu, bấm Mua sắm rồi Chọn phạm vi và món cần mua nguyên liệu. Chọn từ ngày, đến ngày; dùng hai mũi tên để xem và chọn món từng ngày, rồi bấm Áp dụng lựa chọn.',
      'Đánh dấu Đã mua cho món hàng đã mua. Mở Lượng đã có và chi tiết để đánh dấu Đã có hoặc chỉnh lượng.',
      'Bấm + Thêm dòng tự nhập để ghi thêm đồ cần mua. Bạn có thể sửa hoặc xóa dòng tự nhập đó.',
    ],
    expected:
      'Danh sách cho biết lượng còn cần mua. Đánh dấu mua sắm không có nghĩa bạn đã ăn và không làm thay đổi tổng đã ghi.',
  },
  {
    id: 'diary',
    title: 'Ăn rồi thì ghi lại',
    intro: 'Ghi đúng món và lượng thực tế bạn đã ăn.',
    steps: [
      'Ở Hôm nay hoặc Thực đơn, bấm Ghi đã ăn trên món bạn muốn ghi.',
      'Kiểm tra ngày, bữa và số phần thực tế. Bấm Xác nhận ghi nhật ký khi đã đúng.',
      'Vào Nhật ký để xem lại. Bạn có thể Sửa món đã ghi hoặc Xóa món đã ghi rồi xác nhận.',
      'Ăn món ngoài thực đơn? Chọn Ghi món, rồi chọn món trong danh mục hoặc Ghi món tự nhập.',
    ],
    expected:
      'Đã ghi chỉ tính những món bạn xác nhận. Món tự nhập lưu tên và lượng mô tả; hệ thống không đoán chất dinh dưỡng từ tên món.',
  },
  {
    id: 'update',
    title: 'Khi nhu cầu của bạn thay đổi',
    intro: 'Cập nhật theo ý bạn, giữ lại những bữa đã ghi.',
    steps: [
      'Mở Hồ sơ ăn uống để sửa thông tin. Thực đơn đang có vẫn được giữ lại.',
      'Nếu có món được đánh dấu Cần đổi, xem lý do rồi chủ động đổi hoặc bỏ giữ món đó.',
      'Muốn dùng thông tin mới cho thực đơn đang mở? Bấm Áp dụng cho thực đơn hiện tại, đọc thông báo rồi Xác nhận áp dụng.',
      'Muốn tìm lại các món còn lại? Vào Điều chỉnh thực đơn, chọn Tạo lại món chưa giữ rồi Xác nhận tạo lại.',
    ],
    expected:
      'Các bữa đã ghi nhật ký được giữ nguyên. Món đang giữ nhưng không còn phù hợp cần được bạn đổi hoặc bỏ giữ trước.',
  },
  {
    id: 'understand',
    title: 'Đọc kết quả và tiếp tục sử dụng',
    intro: 'Một vài điều nhỏ giúp bạn hiểu các con số trên trang.',
    steps: [
      'Dự kiến là từ thực đơn; Đã ghi là từ món bạn xác nhận đã ăn. Hai phần này được xem riêng, không cộng với nhau.',
      'Chưa đủ dữ liệu không có nghĩa là bằng 0. Giá và một số chất có thể chưa có thông tin đầy đủ.',
      'Chưa tìm được món? Đọc lý do rồi cân nhắc chỉnh thời gian hoặc ngân sách nếu phù hợp. Không bỏ dị ứng để tìm thêm món.',
      'Nếu được nhắc chờ, giữ nguyên lựa chọn và chờ hết thời gian rồi thử lại. Bạn không cần bấm liên tục.',
    ],
    expected:
      'Bạn có thể bắt đầu sử dụng ngay. Khi cần xem lại, nút Hướng dẫn sử dụng luôn ở phía trên Hồ sơ ăn uống.',
  },
] as const

export type GuideScene = (typeof nutritionGuide)[number]['id']
export const lastGuidePage = nutritionGuide.length - 1
export const guideStorageKey = (accountId: string) =>
  `nutrimom.nutrition.guide.v1:${accountId}`

export function readGuidePage(
  storage: Pick<Storage, 'getItem'>,
  accountId: string,
) {
  try {
    const value: unknown = JSON.parse(
      storage.getItem(guideStorageKey(accountId)) ?? '0',
    )
    return typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= lastGuidePage
      ? value
      : 0
  } catch {
    return 0
  }
}

export function rememberGuidePage(
  storage: Pick<Storage, 'setItem'>,
  accountId: string,
  page: number,
) {
  if (!Number.isInteger(page) || page < 0 || page > lastGuidePage) return
  try {
    storage.setItem(guideStorageKey(accountId), JSON.stringify(page))
  } catch {
    /* Reading remains available when storage is blocked. */
  }
}
