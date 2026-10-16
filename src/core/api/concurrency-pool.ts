export function createConcurrencyPool(limit: number) {
  let running = 0
  const waiting: Array<() => void> = []
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    await new Promise<void>((resolve) => {
      if (running < limit) { running += 1; resolve() }
      else waiting.push(resolve)
    })
    try { return await task() }
    finally {
      const next = waiting.shift()
      if (next) next()
      else running -= 1
    }
  }
}
