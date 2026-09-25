export function isValidPhone(value: string) {
  if (value.length > 20) return false
  const digits = value.replace(/[\s.()-]/g, '').replace(/^\+/, '')
  return /^(?:0[35789]\d{8}|84[35789]\d{8})$/.test(digits)
}

export function isValidRegisterPassword(value: string) {
  return value.length >= 8 && value.length <= 72 && /[A-Za-z]/.test(value) && /\d/.test(value)
}
