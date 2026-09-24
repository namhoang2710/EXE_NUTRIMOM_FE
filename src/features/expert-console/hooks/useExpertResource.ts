import { useCallback, useEffect, useRef, useState } from 'react'

export function useExpertResource<T>(loader: (signal: AbortSignal) => Promise<T>, dependencies: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const activeRequest = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    setLoading(true)
    setError('')
    try {
      const result = await loader(controller.signal)
      if (!controller.signal.aborted) setData(result)
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : 'Không thể tải dữ liệu. Vui lòng thử lại.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  useEffect(() => {
    void load()
    return () => activeRequest.current?.abort()
  }, [load])

  return { data, loading, error, reload: load, setData }
}

