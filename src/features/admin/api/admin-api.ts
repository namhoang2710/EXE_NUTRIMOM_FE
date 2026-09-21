import {
  adminAppointments,
  adminConsultations,
  adminDashboardData,
  adminHealthAlerts,
  adminNutritionPlans,
  adminReports,
  adminUsers,
} from '../mock/admin-data'

function fromMock<T>(data: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 320)
  })
}

// Keep the API boundary stable: replace these mock-backed methods with apiClient
// requests when the corresponding admin endpoints become available.
export const adminApi = {
  getDashboard: () => fromMock(adminDashboardData),
  getUsers: () => fromMock(adminUsers),
  getAppointments: () => fromMock(adminAppointments),
  getConsultations: () => fromMock(adminConsultations),
  getReports: () => fromMock(adminReports),
  getHealthAlerts: () => fromMock(adminHealthAlerts),
  getNutritionPlans: () => fromMock(adminNutritionPlans),
}
