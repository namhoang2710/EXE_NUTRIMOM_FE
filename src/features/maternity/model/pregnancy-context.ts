import type { ActivePregnancy, Pregnancy, PregnancySummary } from '../../../types/domain.ts'

export function hasRunningPregnancyAge(pregnancy?: PregnancySummary | null): pregnancy is PregnancySummary & Pick<ActivePregnancy, 'gestational_week' | 'gestational_day' | 'trimester' | 'days_until_due'> {
  return pregnancy?.status === 'ACTIVE' && [pregnancy.gestational_week, pregnancy.gestational_day, pregnancy.trimester, pregnancy.days_until_due].every((value) => typeof value === 'number' && Number.isFinite(value))
}

export function isActivePregnancy(pregnancy?: Pregnancy | null): pregnancy is ActivePregnancy {
  return hasRunningPregnancyAge(pregnancy)
}
