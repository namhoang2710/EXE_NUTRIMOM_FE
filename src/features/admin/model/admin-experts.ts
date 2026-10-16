import { isValidPhone } from '../../auth/model/auth-validation.ts'
import { adminLabel } from './admin-workspace-query.ts'
export const expertSpecialties = ['PSYCHOLOGY', 'OBSTETRICS', 'HEALTH'] as const
export const expertStatuses = ['ACTIVE', 'INACTIVE'] as const

export type ExpertSpecialty = (typeof expertSpecialties)[number]
export type ExpertStatus = (typeof expertStatuses)[number]

export interface AdminExpert {
  userId: string
  phone: string
  fullName: string
  specialty: ExpertSpecialty
  title: string | null
  workplace: string | null
  yearsOfExperience: number
  bio: string | null
  avatarKey: string | null
  avatarUrl: string | null
  status: ExpertStatus
  averageRating: number
  ratingCount: number
  version: number
  createdAt: string
  updatedAt: string
}

export interface ExpertSpecialtyOption {
  code: ExpertSpecialty
  displayName: string
  sortOrder: number
}

export interface CreateAdminExpertInput {
  phone: string
  password: string
  fullName: string
  specialty: ExpertSpecialty
  title?: string
  workplace?: string
  yearsOfExperience: number
  bio?: string
}

export interface UpdateAdminExpertInput {
  fullName?: string
  specialty?: ExpertSpecialty
  title?: string
  workplace?: string
  yearsOfExperience?: number
  bio?: string
  status?: ExpertStatus
  version: number
}

export type ExpertFormErrors = Partial<Record<
  'phone' | 'password' | 'fullName' | 'specialty' | 'title' | 'workplace' | 'yearsOfExperience' | 'bio' | 'avatar' | 'status',
  string
>>

export function isExpertSpecialty(value: string): value is ExpertSpecialty {
  return expertSpecialties.includes(value as ExpertSpecialty)
}

export function validateExpertProfile(input: {
  fullName: string
  specialty: string
  title: string
  workplace: string
  yearsOfExperience: string
  bio: string
}, requireFullName = true): ExpertFormErrors {
  const errors: ExpertFormErrors = {}
  if (requireFullName && !input.fullName.trim()) errors.fullName = 'Vui lòng nhập họ tên.'
  else if (input.fullName.trim().length > 100) errors.fullName = 'Họ tên tối đa 100 ký tự.'
  if (!isExpertSpecialty(input.specialty)) errors.specialty = 'Vui lòng chọn chuyên khoa.'
  if (input.title.trim().length > 100) errors.title = 'Chức danh tối đa 100 ký tự.'
  if (input.workplace.trim().length > 255) errors.workplace = 'Nơi làm việc tối đa 255 ký tự.'
  const experience = Number(input.yearsOfExperience)
  if (!Number.isInteger(experience) || experience < 0 || experience > 80) errors.yearsOfExperience = 'Kinh nghiệm phải là số nguyên từ 0 đến 80.'
  if (input.bio.length > 4000) errors.bio = 'Giới thiệu tối đa 4.000 ký tự.'
  return errors
}

export function validateCreateExpert(input: Parameters<typeof validateExpertProfile>[0] & { phone: string; password: string }) {
  const errors = validateExpertProfile(input)
  if (!input.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại.'
  else if (!isValidPhone(input.phone.trim())) errors.phone = 'Số điện thoại Việt Nam chưa hợp lệ.'
  if (!input.password) errors.password = 'Vui lòng nhập mật khẩu.'
  else if (input.password.length < 8 || input.password.length > 72) errors.password = 'Mật khẩu cần từ 8 đến 72 ký tự.'
  return errors
}

export function validateExpertAvatar(file: File | null): string | null {
  if (!file) return null
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Chọn ảnh JPEG, PNG hoặc WebP.'
  if (file.size > 10 * 1024 * 1024) return 'Ảnh tối đa 10 MiB.'
  return null
}

export function formatExpertSpecialty(code: ExpertSpecialty, options: readonly ExpertSpecialtyOption[]) {
  return options.find((option) => option.code === code)?.displayName
    ?? adminLabel(code)
}

export function mapExpertFieldErrors(fields: Record<string, string>): ExpertFormErrors {
  const names: Record<string, keyof ExpertFormErrors> = { phone:'phone', password:'password', full_name:'fullName', fullName:'fullName', specialty:'specialty', title:'title', workplace:'workplace', years_of_experience:'yearsOfExperience', yearsOfExperience:'yearsOfExperience', bio:'bio', avatar:'avatar', file:'avatar', status:'status' }
  const result: ExpertFormErrors = {}
  for (const [name,message] of Object.entries(fields)) if (names[name]) result[names[name]] = message
  return result
}
