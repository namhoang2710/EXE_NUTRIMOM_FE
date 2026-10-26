import assert from 'node:assert/strict'
import test from 'node:test'
import { getTheme, initializeTheme, setTheme, subscribeTheme } from '../src/core/theme/theme-store.ts'

const events = new EventTarget()
const values = new Map<string, string>()
Object.assign(globalThis, {
  localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } },
  window: { location: { pathname: '/app' }, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events) },
  document: { documentElement: { dataset: {} as Record<string, string> } },
})

test('a direct route receives the saved appearance before any page or toggle mounts', () => {
  values.set('nutrimom.theme', 'dark')
  const stop = initializeTheme()
  assert.equal(document.documentElement.dataset.theme, 'dark')
  stop()
})

test('appearance changes notify every subscriber and keep the document synchronized', () => {
  const stop = initializeTheme(); let changes = 0
  const unsubscribe = subscribeTheme(() => { changes++ })
  setTheme('light'); setTheme('dark')
  assert.equal(document.documentElement.dataset.theme, 'dark')
  assert.equal(getTheme(), 'dark'); assert.equal(changes, 2)
  unsubscribe(); setTheme('light'); assert.equal(changes, 2)
  stop()
})

test('other tabs synchronize only appearance storage events and listeners are cleaned up', () => {
  const stop = initializeTheme()
  values.set('nutrimom.theme', 'dark')
  events.dispatchEvent(Object.assign(new Event('storage'), { key: 'unrelated' }))
  assert.equal(document.documentElement.dataset.theme, 'light')
  events.dispatchEvent(Object.assign(new Event('storage'), { key: 'nutrimom.theme' }))
  assert.equal(document.documentElement.dataset.theme, 'dark')
  stop(); values.set('nutrimom.theme', 'light')
  events.dispatchEvent(Object.assign(new Event('storage'), { key: 'nutrimom.theme' }))
  assert.equal(document.documentElement.dataset.theme, 'dark')
})

test('storage restrictions still allow changing appearance in the current tab', () => {
  const storage = globalThis.localStorage
  Object.assign(globalThis, { localStorage: { getItem: () => { throw Error('Blocked') }, setItem: () => { throw Error('Blocked') } } })
  const stop = initializeTheme()
  setTheme('dark'); assert.equal(getTheme(), 'dark'); assert.equal(document.documentElement.dataset.theme, 'dark')
  stop(); Object.assign(globalThis, { localStorage: storage })
})
