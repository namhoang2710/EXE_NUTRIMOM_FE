import { useEffect, useRef } from 'react'

/**
 * Gọi `onReach` khi phần tử canh (sentinel) cuối danh sách tới gần màn hình.
 * Dùng IntersectionObserver thay cho sự kiện scroll; `onReach` tự kiểm tra có được tải tiếp hay không,
 * nên cuộn nhanh nhiều lần cũng chỉ ra một request. Observer được ngắt khi tắt hoặc unmount.
 */
export function useInfiniteScroll<T extends Element>(onReach: () => void, enabled: boolean, rootMargin = '600px 0px') {
  const sentinelRef = useRef<T>(null)
  const callbackRef = useRef(onReach)
  callbackRef.current = onReach

  useEffect(() => {
    const target = sentinelRef.current
    if (!enabled || !target || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) callbackRef.current()
    }, { rootMargin })
    observer.observe(target)
    return () => observer.disconnect()
  }, [enabled, rootMargin])

  return sentinelRef
}
