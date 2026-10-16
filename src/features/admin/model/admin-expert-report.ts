import { mapAdminPage, object, AdminContractError, type AdminPage } from './admin-workspace-contract.ts'
import { mapExpertPerformance, type ExpertPerformance, type PerformanceScope } from './admin-expert-performance.ts'
export interface ExpertReport extends AdminPage<ExpertPerformance>{type:'EXPERT_PERFORMANCE';generated_at:string;snapshot:ExpertPerformance}
export function mapExpertReport(raw:unknown,expected?:PerformanceScope):ExpertReport {
  const p=object(raw,'expert_report'),s=object(p.summary,'expert_report.summary'),base=mapExpertPerformance(s.snapshot,expected)
  if(p.type!=='EXPERT_PERFORMANCE'||p.generated_at!==base.snapshot_at||p.timezone!==base.timezone)throw new AdminContractError('expert_report.snapshot')
  const period=object(p.period,'expert_report.period')
  for(const key of ['from_date','to_date','previous_from_date','previous_to_date'] as const)if(period[key]!==base.period[key])throw new AdminContractError('expert_report.period')
  const page=mapAdminPage(raw,item=>{
    const r=object(item,'expert_report.row')
    const row=mapExpertPerformance({...base,expert:r.expert,summary:r.summary,axes:r.axes,schedule_summary:r.schedule_summary,checkin_summary:r.checkin_summary,data_coverage:r.data_coverage})
    if(!row.expert||base.specialty&&row.expert.specialty!==base.specialty||base.expert&&row.expert.user_id!==base.expert.user_id||row.summary.total_experts!==1)throw new AdminContractError('expert_report.scope')
    return row
  })
  if(page.total_items!==base.summary.total_experts||new Set(page.items.map(r=>r.expert!.user_id)).size!==page.items.length)throw new AdminContractError('expert_report.total')
  return {...page,type:'EXPERT_PERFORMANCE',generated_at:base.snapshot_at,snapshot:base}
}
