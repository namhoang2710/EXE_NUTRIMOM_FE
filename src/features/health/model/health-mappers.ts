import type { HealthAlertDto } from './health-alert-dto'
import type { HealthMeasurementDto } from './health-measurement-dto'
import type { HealthAlert, HealthMeasurement } from './health-measurement'

export function mapHealthMeasurement(dto: HealthMeasurementDto): HealthMeasurement {
  return {
    id: dto.id,
    metric: dto.metric,
    value: dto.value,
    unit: dto.unit,
    measuredAt: dto.measured_at,
  }
}

export function mapHealthAlert(dto: HealthAlertDto): HealthAlert {
  return {
    id: dto.id,
    measurementId: dto.measurement_id,
    severity: dto.severity,
    message: dto.message,
    createdAt: dto.created_at,
    acknowledgedAt: dto.acknowledged_at,
  }
}
