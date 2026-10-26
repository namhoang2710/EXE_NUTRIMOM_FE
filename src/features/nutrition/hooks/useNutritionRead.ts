import { useCallback, useEffect, useRef, useState } from 'react'
import { markNutritionRefresh } from '../api/nutrition-requests'

export function useNutritionRead<T>(
  key: string,
  read: (signal: AbortSignal) => Promise<T>,
  enabled = true,
  cached?: () => T | undefined,
) {
  const reader = useRef(read)
  const snapshotReader = useRef(cached)
  snapshotReader.current = cached
  const snapshot = enabled ? cached?.() : undefined
  const current = useRef({ key, enabled, mounted: true })
  current.current.key = key
  current.current.enabled = enabled
  const epoch = useRef(0)
  const refresh = useRef(false)
  reader.current = read
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{
    key: string
    data: T | null
    error: unknown
    loading: boolean
  }>(() => ({
    key,
    data: snapshot ?? null,
    error: null,
    loading: enabled && snapshot === undefined,
  }))
  useEffect(() => {
    const active = current.current
    active.mounted = true
    return () => {
      active.mounted = false
    }
  }, [])
  useEffect(() => {
    if (!enabled) {
      setState({ key, data: null, error: null, loading: false })
      return
    }
    const warm = !refresh.current ? snapshotReader.current?.() : undefined
    if (warm !== undefined) {
      epoch.current += 1
      setState({ key, data: warm, error: null, loading: false })
      return
    }
    const controller = new AbortController()
    if (refresh.current) {
      markNutritionRefresh(controller.signal)
      refresh.current = false
    }
    const load = reader.current
    const requestEpoch = ++epoch.current
    setState((previous) => ({
      key,
      data: previous.key === key ? previous.data : null,
      error: null,
      loading: true,
    }))
    // StrictMode replays effects synchronously. Let its cleanup cancel the first
    // setup before issuing a request (recommendations also create a server log).
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      void load(controller.signal).then(
        (data) => {
          if (!controller.signal.aborted && epoch.current === requestEpoch)
            setState({ key, data, error: null, loading: false })
        },
        (error: unknown) => {
          if (!controller.signal.aborted && epoch.current === requestEpoch)
            setState((previous) => ({
              key,
              data: previous.key === key ? previous.data : null,
              error,
              loading: false,
            }))
        },
      )
    })
    return () => controller.abort()
  }, [key, enabled, revision])
  const reload = useCallback(() => {
    if (!current.current.mounted || current.current.key !== key) return
    epoch.current += 1
    refresh.current = true
    setState((previous) => ({ ...previous, error: null, loading: true }))
    setRevision((value) => value + 1)
  }, [key])
  const replace = useCallback(
    (data: T) => {
      if (
        !current.current.mounted ||
        current.current.key !== key ||
        !current.current.enabled
      )
        return
      epoch.current += 1
      setState({ key, data, error: null, loading: false })
    },
    [key],
  )
  return {
    ...(enabled &&
    snapshot !== undefined &&
    (state.key !== key || state.data == null) &&
    !refresh.current
      ? { key, data: snapshot, error: null, loading: false }
      : state.key === key && enabled
        ? state
        : { data: null, error: null, loading: enabled }),
    reload,
    replace,
  }
}
