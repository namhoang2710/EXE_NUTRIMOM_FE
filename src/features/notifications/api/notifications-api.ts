import { apiClient } from '@/core/api/api-client'
import { getSessionScope } from '@/core/auth/token-store'
import { requireCurrentScope } from '@/core/api/profile-requests'
import { createExpertReadCoordinator } from '@/features/expert-console/model/expert-read-coordinator'
import { buildNotificationsPath } from '../model/notification-helpers'
import { normalizeNotificationPage } from '../model/notification-normalizers'
import type { NotificationItem } from '../model/notification-types'
const reads=createExpertReadCoordinator(60_000)
function read<T>(key:string,load:()=>Promise<T>,signal?:AbortSignal){reads.setScope(getSessionScope());return reads.run(key,load,signal,15_000)}
async function mutate<T>(load:()=>Promise<T>){
  const scope=getSessionScope();reads.setScope(scope);reads.assertAvailable()
  try{const result=await load();requireCurrentScope(scope);reads.invalidate();return result}
  catch(error){if(scope===getSessionScope())reads.recordFailure(error);throw error}
}
if(typeof window!=='undefined')for(const event of ['nutrimom:session-cleared','nutrimom:session-changed'])window.addEventListener(event,()=>reads.clear())
export const notificationsApi={
  list:(cursor?:string,unreadOnly=false,signal?:AbortSignal)=>read(`list:${cursor??''}:${unreadOnly}`,async()=>normalizeNotificationPage(await apiClient.request<unknown>(buildNotificationsPath(cursor, unreadOnly)+'&audience=USER')),signal),
  unreadCount:()=>read('count',async()=>{const result=await apiClient.request<{count:number}>('/notifications/unread-count?audience=USER');if(!Number.isSafeInteger(result.count)||result.count<0)throw new Error('Số thông báo chưa đọc không hợp lệ.');return result.count}),
  markRead:(id:string)=>mutate(()=>apiClient.request<NotificationItem>(`/notifications/${encodeURIComponent(id)}/read`,{method:'POST'})),
  markAllRead:()=>mutate(()=>apiClient.request<{updated:number}>('/notifications/read-all?audience=USER',{method:'POST'})),
  isCoolingDown:()=>reads.isCoolingDown(),
}
