export interface SingleFlight {
  run<T>(key: string, request: () => Promise<T>): Promise<T>
  clear(key?: string): void
}

export function createSingleFlight(): SingleFlight {
  const requests = new Map<string, Promise<unknown>>()

  return {
    run<T>(key: string, request: () => Promise<T>) {
      const existing = requests.get(key)
      if (existing) return existing as Promise<T>

      const pending = Promise.resolve().then(request)
      requests.set(key, pending)

      const release = () => {
        if (requests.get(key) === pending) requests.delete(key)
      }
      void pending.then(release, release)

      return pending
    },
    clear(key?: string) {
      if (key) requests.delete(key)
      else requests.clear()
    },
  }
}
