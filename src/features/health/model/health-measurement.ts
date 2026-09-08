export interface HealthMeasurement {
  id: string
  metric: string
  value: number
  unit: string
  measuredAt: string
}

export interface HealthAlert {
  id: string
  measurementId: string
  severity: string
  message: string
  createdAt: string
  acknowledgedAt: string | null
}

export type HealthViewState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; measurements: HealthMeasurement[]; alerts: HealthAlert[] }
