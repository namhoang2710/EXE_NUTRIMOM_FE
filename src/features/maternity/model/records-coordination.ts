export function createRequestSequence() {
  let generation = 0
  return {
    begin: () => ++generation,
    current: () => generation,
    accepts: (request: number) => request === generation,
    invalidate: () => { generation += 1 },
  }
}
export function createPageLoadGate() {
  let pending: { generation: number; cursor: string } | null = null
  return {
    start(generation: number, cursor: string) {
      if (pending) return false
      pending = { generation, cursor }
      return true
    },
    finish(generation: number, cursor: string) {
      if (pending?.generation === generation && pending.cursor === cursor) pending = null
    },
    clear() { pending = null },
  }
}
export function mergeUniqueRecords<T extends { id: string }>(current: T[], incoming: T[]) {
  const known = new Set(current.map((item) => item.id))
  return [...current, ...incoming.filter((item) => {
    if (known.has(item.id)) return false
    known.add(item.id)
    return true
  })]
}
