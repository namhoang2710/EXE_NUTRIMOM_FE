const DEVICE_ID_KEY = 'nutrimom.device-id'

function createDeviceId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

export function getDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing

  const value = createDeviceId()
  localStorage.setItem(DEVICE_ID_KEY, value)
  return value
}
