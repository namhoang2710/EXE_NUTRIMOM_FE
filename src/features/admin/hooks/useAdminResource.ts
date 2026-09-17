import { useCallback, useEffect, useState } from 'react'

export type ResourceState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: string }

export function useAdminResource<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading', data: null, error: null })
  const [requestKey, setRequestKey] = useState(0)

  useEffect(() => {
    let active = true
    setState({ status: 'loading', data: null, error: null })

    loader()
      .then((data) => {
        if (active) setState({ status: 'success', data, error: null })
      })
      .catch(() => {
        if (active) setState({ status: 'error', data: null, error: 'Unable to load this data. Please try again.' })
      })

    return () => {
      active = false
    }
  }, [loader, requestKey])

  const retry = useCallback(() => setRequestKey((key) => key + 1), [])
  return { ...state, retry }
}
