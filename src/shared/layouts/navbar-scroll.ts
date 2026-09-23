export interface NavbarScrollState {
  lastY: number
  movement: number
  visible: boolean
}

export function nextNavbarScrollState(state: NavbarScrollState, scrollY: number, menuOpen: boolean): NavbarScrollState {
  const currentY = Math.max(0, scrollY)
  if (currentY < 30 || menuOpen) return { lastY: currentY, movement: 0, visible: true }

  const delta = currentY - state.lastY
  if (delta === 0) return state
  const movement = Math.sign(delta) === Math.sign(state.movement) ? state.movement + delta : delta
  if (Math.abs(movement) < 8) return { ...state, lastY: currentY, movement }
  return { lastY: currentY, movement: 0, visible: movement < 0 }
}
