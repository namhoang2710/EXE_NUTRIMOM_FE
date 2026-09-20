import { CheckCircle, FirstAidKit, FloppyDisk } from '@phosphor-icons/react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AppShell } from '../components/AppShell'
import { StatusMessage } from '../components/StatusMessage'
import { careApi } from '../lib/domain-api'
import type { BirthPlan, CarePlan, Guidance, PreparationItem } from '../types/domain'

export function CarePage() {
  const [plan, setPlan] = useState<CarePlan | null>(null)
  const [items, setItems] = useState<PreparationItem[]>([])
  const [birthPlan, setBirthPlan] = useState<BirthPlan | null>(null)
  const [guidance, setGuidance] = useState<Guidance[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const load = useCallback(async () => { try { const [nextPlan, nextItems, nextBirth, nextGuidance] = await Promise.all([careApi.current(), careApi.items(), careApi.birthPlan(), careApi.guidance()]); setPlan(nextPlan); setItems(nextItems); setBirthPlan(nextBirth); setGuidance(nextGuidance.items) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải kế hoạch chăm sóc.') } }, [])
  useEffect(() => { void load() }, [load])
  async function toggle(item: PreparationItem) { try { const updated = await careApi.updateItem(item.id, { completed: !item.completed, version: item.version }); setItems((current) => current.map((value) => value.id === updated.id ? updated : value)) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể cập nhật checklist.') } }
  async function saveBirthPlan(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!birthPlan) return; const form = new FormData(event.currentTarget); try { const updated = await careApi.updateBirthPlan({ companion: String(form.get('companion') || ''), preferred_facility: String(form.get('preferred_facility') || ''), pain_management_note: String(form.get('pain_management_note') || ''), newborn_care_note: String(form.get('newborn_care_note') || ''), free_text_note: String(form.get('free_text_note') || ''), version: birthPlan.version }); setBirthPlan(updated); setMessage('Đã lưu kế hoạch sinh.') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể lưu kế hoạch sinh.') } }
  return <AppShell><div className="page-heading"><p className="welcome-kicker">Chăm sóc trước sinh</p><h1>Kế hoạch chăm sóc</h1><p>Theo dõi mốc khám, chuẩn bị và những lựa chọn quan trọng cho ngày sinh.</p></div>{error && <StatusMessage tone="error">{error}</StatusMessage>}{message && <StatusMessage tone="success">{message}</StatusMessage>}
    <section className="app-card"><div className="section-title-row"><div><p className="card-kicker">Tiến độ</p><h2>{plan ? `${plan.progress.completed}/${plan.progress.total} mốc đã hoàn thành` : 'Đang tải kế hoạch...'}</h2></div><FirstAidKit size={32} weight="duotone" /></div>{plan && <div className="milestone-list">{plan.milestones.map((milestone) => <article key={milestone.id}><span>Tuần {milestone.week}</span><div><strong>{milestone.title}</strong><p>{milestone.description}</p></div><em>{milestone.status}</em></article>)}</div>}</section>
    <div className="two-column"><section className="app-card"><h2>Checklist chuẩn bị</h2><div className="checklist">{items.map((item) => <label key={item.id}><input type="checkbox" checked={item.completed} onChange={() => void toggle(item)} /><span><strong>{item.title}</strong><small>{item.group_code}</small></span>{item.completed && <CheckCircle size={20} weight="fill" />}</label>)}{items.length === 0 && <p>Chưa có checklist cho thai kỳ hiện tại.</p>}</div></section>
      <section className="app-card"><h2>Kế hoạch sinh</h2>{birthPlan ? <form className="compact-form" onSubmit={saveBirthPlan}><label>Người đồng hành<input name="companion" defaultValue={birthPlan.companion || ''} /></label><label>Cơ sở dự kiến<input name="preferred_facility" defaultValue={birthPlan.preferred_facility || ''} /></label><label>Ghi chú giảm đau<textarea name="pain_management_note" defaultValue={birthPlan.pain_management_note || ''} /></label><label>Chăm sóc bé sơ sinh<textarea name="newborn_care_note" defaultValue={birthPlan.newborn_care_note || ''} /></label><label>Ghi chú khác<textarea name="free_text_note" defaultValue={birthPlan.free_text_note || ''} /></label><button className="primary-button"><FloppyDisk size={20} />Lưu kế hoạch</button></form> : <p>Chưa có kế hoạch sinh.</p>}</section></div>
    <section className="app-card content-card"><h2>Hướng dẫn đã được kiểm duyệt</h2>{guidance.length ? <div className="guidance-list">{guidance.map((item) => <article key={item.id}><strong>{item.title}</strong><p>{item.summary}</p><small>{item.source_name}{item.reviewer ? ` · ${item.reviewer}` : ''}</small>{item.source_url && <a className="text-link" href={item.source_url} target="_blank" rel="noreferrer">Xem nguồn</a>}</article>)}</div> : <p>Chưa có hướng dẫn phù hợp.</p>}</section>
  </AppShell>
}
