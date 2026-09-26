export interface RunAsyncActionOptions {
  action: () => Promise<void>
  minimumMs?: number
  wait?: (milliseconds: number) => Promise<void>
}

const defaultWait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

/** Waits for the real request and minimum feedback duration, while preserving rejection. */
export async function runAsyncAction({ action, minimumMs = 2000, wait = defaultWait }: RunAsyncActionOptions) {
  const [actionResult] = await Promise.allSettled([action(), wait(minimumMs)])
  if (actionResult.status === 'rejected') throw actionResult.reason
}

export function createAsyncActionGate() {
  let pending = false
  return {
    async run(action: () => Promise<void>) {
      if (pending) return false
      pending = true
      try {
        await action()
        return true
      } finally {
        pending = false
      }
    },
  }
}
