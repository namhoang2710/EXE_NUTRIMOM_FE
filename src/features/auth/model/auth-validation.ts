export function isValidPhone(value: string) {
  if (value.length > 20) return false
  const compact = value.replace(/[\s.()-]/g, '')
  return /^(?:0[35789]\d{8}|\+?84[35789]\d{8})$/.test(compact)
}

export function isValidRegisterPassword(value: string) {
  return !registerPasswordError(value)
}

export function isValidEmail(value: string) {
  return value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function registerPasswordError(value: string): string {
  const missing: string[] = []
  if (value.length < 8) missing.push(`thêm ${8 - value.length} ký tự`)
  if (value.length > 20) missing.push('tối đa 20 ký tự')
  if (!/[A-Z]/.test(value)) missing.push('chữ hoa')
  if (!/[a-z]/.test(value)) missing.push('chữ thường')
  if (!/[0-9]/.test(value)) missing.push('số')
  if (!/[^A-Za-z0-9\s]/.test(value)) missing.push('ký tự đặc biệt')
  if (/\s/.test(value)) missing.push('bỏ khoảng trắng')
  return missing.length ? `Cần: ${missing.join(', ')}.` : ''
}

export interface RegisterFormValues {
  displayName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  accepted: boolean
}

export function phoneError(value: string): string {
  if (isValidPhone(value)) return ''
  if (/[^0-9+\s.()-]/.test(value)) return 'Số điện thoại không được chứa chữ cái hoặc ký tự lạ.'
  return 'Nhập đủ 10 số, bắt đầu bằng 03, 05, 07, 08, 09 (hoặc +84).'
}

export function registerFieldError(field: keyof RegisterFormValues, form: RegisterFormValues): string {
  switch (field) {
    case 'displayName':
      return !form.displayName.trim() ? 'Vui lòng nhập tên hiển thị.'
        : form.displayName.length > 100 ? 'Tên hiển thị tối đa 100 ký tự.' : ''
    case 'email':
      return !form.email.trim() ? 'Vui lòng nhập địa chỉ email.'
        : form.email.trim().length > 255 ? 'Email tối đa 255 ký tự.'
          : !isValidEmail(form.email.trim()) ? 'Địa chỉ email chưa đúng định dạng.' : ''
    case 'phone': return form.phone.trim() ? phoneError(form.phone.trim()) : ''
    case 'password': return registerPasswordError(form.password)
    case 'confirmPassword':
      return !form.confirmPassword ? 'Vui lòng xác nhận mật khẩu.'
        : form.password !== form.confirmPassword ? 'Mật khẩu xác nhận chưa khớp.' : ''
    case 'accepted': return form.accepted ? '' : 'Vui lòng đồng ý điều khoản và chính sách riêng tư.'
  }
}

export function loginIdentifierError(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'Vui lòng nhập email hoặc số điện thoại.'
  if (value.length > 100) return 'Email hoặc số điện thoại tối đa 100 ký tự.'
  return trimmed.includes('@')
    ? isValidEmail(trimmed) ? '' : 'Địa chỉ email chưa đúng định dạng.'
    : phoneError(trimmed)
}

export function loginPasswordError(value: string): string {
  if (!value.trim()) return 'Vui lòng nhập mật khẩu.'
  return value.length > 72 ? 'Mật khẩu tối đa 72 ký tự.' : ''
}

export function mapRegisterFieldErrors(fields: Record<string, string>): Record<string, string> {
  const aliases: Record<string, string> = { display_name: 'displayName', accepted_terms: 'accepted', acceptedTerms: 'accepted' }
  return Object.fromEntries(Object.entries(fields).map(([key, message]) => [aliases[key] || key, message]))
}
