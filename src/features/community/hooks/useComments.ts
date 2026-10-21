import { useCallback, useEffect, useRef, useState } from 'react'
import { communityApi } from '../api/community-api'
import { friendlyError, isAbort } from '../model/community-errors'
import type { CommunityComment } from '../model/community-types'

const PAGE_SIZE = 20

/** Bình luận của một bài: chỉ tải khi khu bình luận được mở, mỗi lần 20 bình luận. */
export function useComments(postId: string, open: boolean, onCountChange: (delta: number) => void) {
  const [items, setItems] = useState<CommunityComment[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const inFlightRef = useRef(false)
  // Khoá gửi bằng ref: state `sending` chưa kịp đổi khi bấm nhiều lần trong cùng một nhịp.
  const sendingRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)

  const load = useCallback(async (from: string | null) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const page = await communityApi.comments(postId, from, PAGE_SIZE, controller.signal)
      setItems((current) => {
        const seen = new Set(current.map((comment) => comment.id))
        return from ? [...current, ...page.items.filter((comment) => !seen.has(comment.id))] : page.items
      })
      setCursor(page.next_cursor ?? null)
      setHasMore(page.has_more)
      setLoaded(true)
    } catch (reason) {
      if (!isAbort(reason)) setError(friendlyError(reason).message)
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    if (open && !loaded) void load(null)
    return () => controllerRef.current?.abort()
  }, [open, loaded, load])

  const send = useCallback(async (content: string) => {
    if (sendingRef.current) return false
    sendingRef.current = true
    setSending(true)
    setError(null)
    try {
      const comment = await communityApi.addComment(postId, content)
      // Bình luận mới hiện cuối danh sách (danh sách xếp cũ → mới) nếu đã tải hết; nếu chưa thì vẫn thêm để người gửi thấy.
      setItems((current) => [...current, comment])
      onCountChange(1)
      return true
    } catch (reason) {
      setError(friendlyError(reason).message)
      return false
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }, [postId, onCountChange])

  const removingRef = useRef(new Set<string>())
  const remove = useCallback(async (commentId: string) => {
    if (removingRef.current.has(commentId)) return
    removingRef.current.add(commentId)
    try {
      await communityApi.deleteComment(commentId)
      setItems((current) => current.filter((comment) => comment.id !== commentId))
      onCountChange(-1)
    } catch (reason) {
      setError(friendlyError(reason).message)
    } finally {
      removingRef.current.delete(commentId)
    }
  }, [onCountChange])

  return { items, hasMore, loading, error, sending, loadMore: () => { if (cursor) void load(cursor) }, retry: () => void load(cursor), send, remove }
}
