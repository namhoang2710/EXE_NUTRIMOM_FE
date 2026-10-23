import { useCallback, useEffect, useRef, useState } from 'react'
import { communityApi } from '../api/community-api'
import { friendlyError } from '../model/community-errors'
import type { CommunityComment } from '../model/community-types'
import { useCursorCollection } from './useCursorCollection'

const commentKey = (item: CommunityComment) => item.id

/** Bình luận của một bài: chỉ tải khi khu bình luận được mở, mỗi lần 20 bình luận. */
export function useComments(postId: string, open: boolean, onCountChange: (delta: number) => void, deleteComment: (commentId: string) => Promise<unknown> = communityApi.deleteComment) {
  const loader = useCallback((cursor: string | null, signal: AbortSignal) => open
    ? communityApi.comments(postId, cursor, 20, signal)
    : Promise.resolve({ items: [], has_more: false }), [postId, open])
  const list = useCursorCollection(loader, commentKey)
  const { setItems } = list
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const deadline = useRef(0)
  // Khoá gửi bằng ref: state `sending` chưa kịp đổi khi bấm nhiều lần trong cùng một nhịp.
  const sendingRef = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const send = useCallback(async (content: string) => {
    if (sendingRef.current || Date.now() < deadline.current) return false
    sendingRef.current = true
    setSending(true)
    setError(null)
    try {
      const comment = await communityApi.addComment(postId, content)
      // Bình luận mới hiện cuối danh sách (danh sách xếp cũ → mới) nếu đã tải hết; nếu chưa thì vẫn thêm để người gửi thấy.
      if (mounted.current) {
        setItems((current) => current.some((item) => item.id === comment.id) ? current : [...current, comment])
        onCountChange(1)
      }
      return true
    } catch (reason) {
      const failure = friendlyError(reason); deadline.current = failure.retryAt
      if (mounted.current) setError(failure.message)
      return false
    } finally {
      sendingRef.current = false
      if (mounted.current) setSending(false)
    }
  }, [postId, onCountChange, setItems])

  const removingRef = useRef(new Set<string>())
  const remove = useCallback(async (commentId: string) => {
    if (removingRef.current.has(commentId) || Date.now() < deadline.current) return
    removingRef.current.add(commentId)
    try {
      await deleteComment(commentId)
      if (mounted.current) { setItems((current) => current.filter((comment) => comment.id !== commentId)); onCountChange(-1) }
    } catch (reason) {
      const failure = friendlyError(reason); deadline.current = failure.retryAt
      if (mounted.current) setError(failure.message)
    } finally {
      removingRef.current.delete(commentId)
    }
  }, [onCountChange, deleteComment, setItems])

  return { ...list, retry: () => { if (Date.now() >= deadline.current) { setError(null); list.retry() } }, error: error ?? list.error?.message ?? null, retryAt: list.error?.retryAt ?? deadline.current, sending, send, remove }
}
