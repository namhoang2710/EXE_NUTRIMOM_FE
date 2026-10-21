let chartPromise: Promise<typeof import('./AdminDashboardRedesignCharts')> | undefined
export function preloadDashboardCharts() { return chartPromise ??= import('./AdminDashboardRedesignCharts') }
