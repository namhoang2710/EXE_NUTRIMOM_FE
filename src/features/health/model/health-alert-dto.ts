export interface HealthAlertDto {
  id: string
  measurement_id: string
  severity: string
  message: string
  created_at: string
  acknowledged_at: string | null
}
