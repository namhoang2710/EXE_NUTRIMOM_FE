import type { ComparisonValues, CustomerSnapshot } from './admin-dashboard-overview.ts'

export interface MetricComparisonView {
  tone:'up'|'down'; badge:string; difference:number|null; known:boolean; accessible:string;
}
const percent=new Intl.NumberFormat('vi-VN',{minimumFractionDigits:1,maximumFractionDigits:1})
/** A zero baseline never becomes an invented 100%; absent history never becomes zero. */
export function metricComparison(values:ComparisonValues|null|undefined):MetricComparisonView {
  const current=values?.current_value,previous=values?.previous_value
  if(current==null||previous==null)return {tone:(current??0)>0?'up':'down',badge:'—',difference:null,known:false,accessible:'Chưa có dữ liệu so sánh'}
  const difference=current-previous,tone=difference>0?'up':'down'
  if(previous===0&&current>0)return {tone,badge:'Mới',difference,known:true,accessible:'Kỳ trước bằng 0, chưa tính được phần trăm tăng trưởng'}
  const change=previous===0?0:difference/previous*100
  return {tone,badge:`${change>0?'+':''}${percent.format(change)}%`,difference,known:true,accessible:`${percent.format(current)} so với ${percent.format(previous)}`}
}
export function signedMetric(value:number,formatter:(n:number)=>string) { return `${value>0?'+':value<0?'−':''}${formatter(Math.abs(value))}` }

/** Current adoption is a share of the validated customer snapshot, not historical growth. */
export function currentPlanShare(snapshot:CustomerSnapshot|null|undefined):{value:number|null;indicator:MetricComparisonView|null} {
  if(!snapshot||snapshot.total_customers===0)return {value:null,indicator:null}
  const value=snapshot.plan_399k_users/snapshot.total_customers*100
  return {value,indicator:{tone:value>0?'up':'down',badge:value>0?'Đang dùng':'Chưa dùng',difference:null,known:true,
    accessible:`${snapshot.plan_399k_users}/${snapshot.total_customers} khách hàng dùng gói 399K; tỷ lệ hiện tại, không so sánh theo tháng`}}
}
