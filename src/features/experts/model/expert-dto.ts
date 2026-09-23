export type ExpertSpecialtyDto = 'PSYCHOLOGY' | 'OBSTETRICS' | 'HEALTH'

export interface ExpertSummaryDto {
  user_id: string
  full_name: string | null
  specialty: ExpertSpecialtyDto
  title: string | null
  workplace: string | null
  years_of_experience: number | null
  avatar_url: string | null
  average_rating: number | null
  rating_count: number | null
}
