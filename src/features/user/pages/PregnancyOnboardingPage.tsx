import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { userApi } from '../api/user-api'

export function PregnancyOnboardingPage() {
  const [method, setMethod] = useState<'estimated_due_date' | 'last_menstrual_period'>('estimated_due_date')
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { reloadProfile } = useAuth()
  const navigate = useNavigate()
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!date) { setError('Vui lòng chọn một ngày.'); return }
    setBusy(true); setError('')
    try {
      await userApi.createPregnancy({ [method]: date } as { estimated_due_date: string } | { last_menstrual_period: string })
      const profile = await reloadProfile()
      navigate(profile.onboarding_status === 'COMPLETED' ? '/app' : '/onboarding/pregnancy', { replace: true })
      if (profile.onboarding_status !== 'COMPLETED') setError('Hồ sơ chưa hoàn tất. Vui lòng kiểm tra lại thông tin thai kỳ.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể lưu thông tin thai kỳ.') }
    finally { setBusy(false) }
  }
  return <main className="nm-account-page"><div className="nm-account-intro"><span>NutriMom · Bước tiếp theo</span><h1>Hành trình của mẹ và bé</h1><p>Chọn một mốc thời gian để NutriMom đồng hành phù hợp hơn.</p></div><form className="nm-account-form" onSubmit={(event) => void submit(event)}><label>Cách tính<select value={method} onChange={(event) => { setMethod(event.target.value as typeof method); setDate('') }} disabled={busy}><option value="estimated_due_date">Ngày dự sinh</option><option value="last_menstrual_period">Ngày đầu kỳ kinh cuối</option></select></label><label>Ngày<input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={busy} required /></label>{error && <p className="nm-form-error" role="alert">{error}</p>}<div className="nm-form-actions"><button type="submit" className="nm-primary-action" disabled={busy}>{busy ? 'Đang lưu...' : 'Hoàn tất'}</button></div></form></main>
}
