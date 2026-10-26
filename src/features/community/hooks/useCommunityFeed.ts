import { useCallback, useEffect, useReducer, useRef } from 'react'
import { communityApi } from '../api/community-api'
import { friendlyError, isAbort } from '../model/community-errors'
import { communityLimits } from '../model/community-topics'
import type { CommunityPost, FeedPage, FeedQuery } from '../model/community-types'
import { canLoadMore, feedReducer, initialFeedState } from '../model/feed-state'

export type FeedSource = { kind: 'feed'; query: FeedQuery } | { kind: 'mine' }

const AUTO_RETRY_DELAY_MS = 1500
const FILTER_DEBOUNCE_MS = 250

/**
 * Feed cuộn vô hạn theo cursor của BE.
 *
 * - Mỗi nguồn (bộ lọc) là một "thế hệ": đổi bộ lọc thì huỷ request cũ (AbortController) và bỏ qua
 *   kết quả về muộn của thế hệ cũ.
 * - `inFlight` là ref chứ không phải state nên hai lần gọi trong cùng một frame vẫn chỉ gửi một request.
 * - Lỗi mạng/5xx tự thử lại tối đa một lần; 429 thì không tự thử, chờ người dùng sau mốc Retry-After.
 */
export function useCommunityFeed(source: FeedSource) {
  const [state, dispatch] = useReducer(feedReducer, initialFeedState)
  const stateRef = useRef(state)
  stateRef.current = state
  const generationRef = useRef(0)
  const inFlightRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)
  const retryTimerRef = useRef<number | undefined>(undefined)
  const firstLoadRef = useRef(true)
  const sourceKey = JSON.stringify(source)

  const fetchPage = useCallback((cursor: string | null, signal: AbortSignal): Promise<FeedPage> => {
    const current = JSON.parse(sourceKey) as FeedSource
    return current.kind === 'mine'
      ? communityApi.myPosts(cursor, communityLimits.feedPageSize, undefined, signal)
      : communityApi.feed(current.query, cursor, communityLimits.feedPageSize, signal)
  }, [sourceKey])

  const load = useCallback(async (append: boolean, attempt = 0) => {
    if (inFlightRef.current) return
    const generation = generationRef.current
    const cursor = append ? stateRef.current.cursor : null
    inFlightRef.current = true
    const controller = new AbortController()
    controllerRef.current = controller
    if (append) dispatch({ type: 'loadingMore', generation })
    try {
      const page = await fetchPage(cursor, controller.signal)
      dispatch({ type: 'loaded', generation, page, append })
    } catch (reason) {
      if (isAbort(reason) || generation !== generationRef.current) return
      const error = friendlyError(reason)
      if (attempt === 0 && error.retryable && error.status !== 429) {
        retryTimerRef.current = window.setTimeout(() => {
          if (generation === generationRef.current) void load(append, 1)
        }, AUTO_RETRY_DELAY_MS)
        return
      }
      dispatch({ type: 'failed', generation, message: error.message, retryAt: error.retryAt, append })
    } finally {
      if (generation === generationRef.current) inFlightRef.current = false
    }
  }, [fetchPage])

  useEffect(() => {
    generationRef.current += 1
    controllerRef.current?.abort()
    window.clearTimeout(retryTimerRef.current)
    inFlightRef.current = false
    dispatch({ type: 'reset', generation: generationRef.current })
    // Lần đầu tải ngay; đổi bộ lọc thì chờ một nhịp để bấm liên tục nhiều chip chỉ ra một request.
    const delay = firstLoadRef.current ? 0 : FILTER_DEBOUNCE_MS
    firstLoadRef.current = false
    const timer = window.setTimeout(() => void load(false), delay)
    return () => {
      window.clearTimeout(timer)
      controllerRef.current?.abort()
      window.clearTimeout(retryTimerRef.current)
    }
  }, [load])

  const loadMore = useCallback(() => {
    if (canLoadMore(stateRef.current, inFlightRef.current)) void load(true)
  }, [load])

  const retry = useCallback(() => {
    if (Date.now() < stateRef.current.retryAt) return
    void load(stateRef.current.items.length > 0)
  }, [load])

  const reload = useCallback(() => {
    generationRef.current += 1
    controllerRef.current?.abort()
    inFlightRef.current = false
    dispatch({ type: 'reset', generation: generationRef.current })
    void load(false)
  }, [load])

  const patchPost = useCallback((postId: string, patch: Partial<CommunityPost>) => dispatch({ type: 'patch', postId, patch }), [])
  const removePost = useCallback((postId: string) => dispatch({ type: 'remove', postId }), [])
  const adjustComments = useCallback((postId: string, delta: number) => dispatch({ type: 'comments', postId, delta }), [])

  return { state, loadMore, retry, reload, patchPost, removePost, adjustComments }
}
