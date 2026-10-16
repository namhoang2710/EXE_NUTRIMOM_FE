/** Matches the shell's 720ms topbar entrance (desktop starts at 2500ms). */
export const dashboardKpiFrameMs=520
export const dashboardKpiNumberMs=1000
export function dashboardMilestones(mobile: boolean) {
  const frames = mobile ? 720 : 3220
  const numbers=frames+dashboardKpiFrameMs,sections=numbers+dashboardKpiNumberMs
  return { frames, numbers, sections, charts:sections+320 }
}
export function dashboardPhase(elapsed: number, mobile: boolean) {
  const at=dashboardMilestones(mobile)
  return { numbers:elapsed>=at.numbers, sections:elapsed>=at.sections, charts:elapsed>=at.charts }
}
