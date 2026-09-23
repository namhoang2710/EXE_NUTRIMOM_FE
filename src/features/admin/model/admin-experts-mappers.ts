import type {
  AdminExpert,
  CreateAdminExpertInput,
  ExpertSpecialty,
  ExpertSpecialtyOption,
  ExpertStatus,
  UpdateAdminExpertInput,
} from './admin-experts'

export interface AdminExpertDto {
  user_id: string
  phone: string
  full_name: string
  specialty: ExpertSpecialty
  title: string | null
  workplace: string | null
  years_of_experience: number
  bio: string | null
  avatar_key: string | null
  avatar_url: string | null
  status: ExpertStatus
  average_rating: number
  rating_count: number
  version: number
  created_at: string
  updated_at: string
}

export interface ExpertSpecialtyDto {
  code: ExpertSpecialty
  display_name: string
  sort_order: number
}

export interface CreateAdminExpertDto {
  phone: string
  password: string
  full_name: string
  specialty: ExpertSpecialty
  title?: string
  workplace?: string
  years_of_experience: number
  bio?: string
}

export interface UpdateAdminExpertDto {
  full_name?: string
  specialty?: ExpertSpecialty
  title?: string
  workplace?: string
  years_of_experience?: number
  bio?: string
  status?: ExpertStatus
  version: number
}

export function mapAdminExpert(dto: AdminExpertDto): AdminExpert {
  return {
    userId: dto.user_id,
    phone: dto.phone,
    fullName: dto.full_name,
    specialty: dto.specialty,
    title: dto.title,
    workplace: dto.workplace,
    yearsOfExperience: dto.years_of_experience,
    bio: dto.bio,
    avatarKey: dto.avatar_key,
    avatarUrl: dto.avatar_url,
    status: dto.status,
    averageRating: Number(dto.average_rating),
    ratingCount: dto.rating_count,
    version: dto.version,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

export function mapExpertSpecialty(dto: ExpertSpecialtyDto): ExpertSpecialtyOption {
  return { code: dto.code, displayName: dto.display_name, sortOrder: dto.sort_order }
}

function optionalText(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function serializeCreateAdminExpert(input: CreateAdminExpertInput): CreateAdminExpertDto {
  const payload: CreateAdminExpertDto = {
    phone: input.phone.trim(), password: input.password, full_name: input.fullName.trim(),
    specialty: input.specialty, years_of_experience: input.yearsOfExperience,
  }
  const title = optionalText(input.title)
  const workplace = optionalText(input.workplace)
  const bio = optionalText(input.bio)
  if (title !== undefined) payload.title = title
  if (workplace !== undefined) payload.workplace = workplace
  if (bio !== undefined) payload.bio = bio
  return payload
}

export function serializeUpdateAdminExpert(input: UpdateAdminExpertInput): UpdateAdminExpertDto {
  const payload: UpdateAdminExpertDto = { version: input.version }
  if (input.fullName !== undefined) payload.full_name = input.fullName.trim()
  if (input.specialty !== undefined) payload.specialty = input.specialty
  if (input.title !== undefined) payload.title = input.title.trim()
  if (input.workplace !== undefined) payload.workplace = input.workplace.trim()
  if (input.yearsOfExperience !== undefined) payload.years_of_experience = input.yearsOfExperience
  if (input.bio !== undefined) payload.bio = input.bio.trim()
  if (input.status !== undefined) payload.status = input.status
  return payload
}
