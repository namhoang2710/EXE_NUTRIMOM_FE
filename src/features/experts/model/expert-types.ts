export type ExpertSpecialty = 'PSYCHOLOGY' | 'OBSTETRICS' | 'HEALTH'

export interface Expert {
  userId: string
  fullName: string
  specialty: ExpertSpecialty
  title: string
  workplace: string
  yearsOfExperience: number
  avatarUrl: string | null
  averageRating: number
  ratingCount: number
}

export const expertSpecialtyLabels: Record<ExpertSpecialty, string> = {
  PSYCHOLOGY: 'Tâm lý',
  OBSTETRICS: 'Sản khoa',
  HEALTH: 'Sức khỏe',
}
