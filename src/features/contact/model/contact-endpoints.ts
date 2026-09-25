export const contactEndpoints = {
  requests: '/contact-requests',
  request: (id: string) => `/contact-requests/${encodeURIComponent(id)}`,
  cancel: (id: string) => `/contact-requests/${encodeURIComponent(id)}/cancel`,
  adminRequests: '/admin/contact-requests',
  adminRequest: (id: string) => `/admin/contact-requests/${encodeURIComponent(id)}`,
  complete: (id: string) => `/admin/contact-requests/${encodeURIComponent(id)}/complete`,
} as const
