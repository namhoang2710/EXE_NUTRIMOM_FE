import { Bell, Check, Database, LockKey, ShieldCheck, SlidersHorizontal } from '@phosphor-icons/react'
import { useState } from 'react'
import { PageHeading } from '../components/AdminUI'

function SettingToggle({ label, description, initial = false }: { label: string; description: string; initial?: boolean }) {
  const [enabled, setEnabled] = useState(initial)
  return <div className="admin-setting-row"><div><strong>{label}</strong><span>{description}</span></div><button className={`admin-switch${enabled ? ' enabled' : ''}`} type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled((value) => !value)}><span /></button></div>
}

export function AdminSettingsPage() {
  const [saved, setSaved] = useState(false)
  return <div className="admin-page">
    <PageHeading title="Settings" description="Configure workspace preferences, security and notifications." actions={<button className="admin-button primary" type="button" onClick={() => setSaved(true)}><Check size={18} />{saved ? 'Saved' : 'Save changes'}</button>} />
    <div className="admin-settings-grid">
      <aside className="admin-card admin-settings-nav"><button className="is-active" type="button"><SlidersHorizontal size={19} />General</button><button type="button"><Bell size={19} />Notifications</button><button type="button"><LockKey size={19} />Security</button><button type="button"><Database size={19} />Data & retention</button></aside>
      <section className="admin-card admin-settings-panel">
        <div className="admin-settings-heading"><span><ShieldCheck size={23} weight="duotone" /></span><div><h2>Workspace preferences</h2><p>General controls for the NutriMom admin workspace.</p></div></div>
        <div className="admin-form-grid"><label><span>Workspace name</span><input defaultValue="NutriMom Operations" /></label><label><span>Default timezone</span><select defaultValue="asia-saigon"><option value="asia-saigon">Asia/Saigon (UTC+7)</option><option value="utc">UTC</option></select></label><label><span>Support email</span><input type="email" defaultValue="support@nutrimom.vn" /></label><label><span>Default language</span><select defaultValue="en"><option value="en">English</option><option value="vi">Vietnamese</option></select></label></div>
        <div className="admin-settings-section"><h3>Operational controls</h3><SettingToggle label="New registration alerts" description="Notify administrators when a specialist registers." initial /><SettingToggle label="Daily operations digest" description="Send a daily performance summary at 08:00." initial /><SettingToggle label="Maintenance mode" description="Temporarily prevent non-admin access to the platform." /></div>
      </section>
    </div>
  </div>
}
