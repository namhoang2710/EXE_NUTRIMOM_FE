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
  'phone' | 'password' | 'fullName' | 'specialty' | 'title' | 'workplace' | 'yearsOfExperience' | 'bio' | 'avatar',
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
  if (requireFullName && !input.fullName.trim()) errors.fullName = 'Full name is required.'
  else if (input.fullName.trim().length > 100) errors.fullName = 'Full name must not exceed 100 characters.'
  if (!isExpertSpecialty(input.specialty)) errors.specialty = 'Select a specialty.'
  if (input.title.trim().length > 100) errors.title = 'Professional title must not exceed 100 characters.'
  if (input.workplace.trim().length > 255) errors.workplace = 'Workplace must not exceed 255 characters.'
  const experience = Number(input.yearsOfExperience)
  if (!Number.isInteger(experience) || experience < 0 || experience > 80) errors.yearsOfExperience = 'Experience must be a whole number from 0 to 80.'
  if (input.bio.length > 4000) errors.bio = 'Bio must not exceed 4,000 characters.'
  return errors
}

export function validateCreateExpert(input: Parameters<typeof validateExpertProfile>[0] & { phone: string; password: string }) {
  const errors = validateExpertProfile(input)
  if (!input.phone.trim()) errors.phone = 'Phone is required.'
  if (!input.password) errors.password = 'Password is required.'
  else if (input.password.length < 8 || input.password.length > 72) errors.password = 'Password must contain 8–72 characters.'
  return errors
}

export function validateExpertAvatar(file: File | null): string | null {
  if (!file) return null
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Choose a JPEG, PNG or WebP image.'
  if (file.size > 10 * 1024 * 1024) return 'The image must not exceed 10 MiB.'
  return null
}

export function formatExpertSpecialty(code: ExpertSpecialty, options: readonly ExpertSpecialtyOption[]) {
  return options.find((option) => option.code === code)?.displayName
    ?? code.toLowerCase().replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase())
}
