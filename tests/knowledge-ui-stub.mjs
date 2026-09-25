import http from 'node:http'

const summary = {
  id: 'article-1', slug: 'vitamin-d-khi-mang-thai', title: 'Vitamin D khi mang thai',
  excerpt: 'Tổng quan nhẹ nhàng về vitamin D trong thai kỳ và những điều mẹ nên trao đổi cùng bác sĩ.',
  category: 'nutrition', stage: 'trimester-1', topics: ['Vitamin', 'Chăm sóc hằng ngày'],
  publishedAt: '2026-09-01T00:00:00Z', author: { id: 'admin-1', name: 'Ban biên tập NutriMom' },
  coverImage: { url: 'http://127.0.0.1:5173/banner2.png', alt: 'Mẹ và em bé', caption: 'Ảnh minh họa' },
}

const detail = {
  ...summary, lead: 'Vitamin D là một phần trong bức tranh dinh dưỡng tổng thể của thai kỳ.', status: 'published',
  createdAt: '2026-08-20T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
  sections: [
    { id: 'section-1', heading: 'Tại sao vitamin D quan trọng?', paragraphs: ['Nhu cầu của mỗi người có thể khác nhau. Mẹ nên trao đổi với người theo dõi thai kỳ trước khi dùng sản phẩm bổ sung.'], bullets: ['Không tự ý tăng liều', 'Ưu tiên tư vấn phù hợp với hồ sơ sức khỏe'], sortOrder: 0 },
    { id: 'section-2', heading: 'Chuẩn bị câu hỏi cho buổi khám', paragraphs: ['Ghi lại sản phẩm đang dùng và những băn khoăn để cuộc trao đổi rõ ràng hơn.'], bullets: [], sortOrder: 1, image: summary.coverImage },
  ], source: { label: 'World Health Organization', href: 'https://www.who.int' },
}

const adminUser = { id: 'admin-1', phone: '0900000000', display_name: 'Content Admin', roles: ['ADMIN'], status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z' }

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1:8080')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (url.pathname === '/api/v1/auth/me') response.end(JSON.stringify({ data: adminUser, meta: { request_id: 'stub', server_time: new Date().toISOString() } }))
  else if (url.pathname === '/api/v1/admin/knowledge/articles/article-1') response.end(JSON.stringify({ data: detail, meta: { request_id: 'stub', server_time: new Date().toISOString() } }))
  else if (url.pathname === '/api/v1/admin/knowledge/articles') response.end(JSON.stringify({ data: { items: [detail], totalItems: 1, totalPages: 1, currentPage: 1, pageSize: 12 }, meta: { request_id: 'stub', server_time: new Date().toISOString() } }))
  else if (url.pathname === '/api/v1/knowledge/articles/vitamin-d-khi-mang-thai') response.end(JSON.stringify({ data: detail, meta: { request_id: 'stub', server_time: new Date().toISOString() } }))
  else if (url.pathname === '/api/v1/knowledge/articles') response.end(JSON.stringify({ data: { items: [summary], totalItems: 1, totalPages: 1, currentPage: 1, pageSize: Number(url.searchParams.get('pageSize') ?? 6) }, meta: { request_id: 'stub', server_time: new Date().toISOString() } }))
  else { response.statusCode = 404; response.end(JSON.stringify({ error: { code: 'ARTICLE_NOT_FOUND', message: 'Not found' } })) }
})

server.listen(8080, '127.0.0.1', () => console.log('Knowledge UI stub listening on 8080'))
