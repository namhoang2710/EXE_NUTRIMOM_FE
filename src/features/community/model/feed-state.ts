import type { CommunityPost, FeedPage } from './community-types.ts'

/**
 * Trạng thái feed thuần (không React) để test được.
 *
 * Mỗi lần đổi bộ lọc tăng `generation`; kết quả trả về muộn của thế hệ cũ bị bỏ qua nên không bao
 * giờ ghi đè dữ liệu của bộ lọc mới.
 */
export const FEED_MAX_ITEMS = 200

export type FeedStatus = 'loading' | 'ready' | 'loadingMore' | 'error' | 'errorMore'

export interface FeedState {
  generation: number
  items: CommunityPost[]
  pinned: CommunityPost[]
  cursor: string | null
  hasMore: boolean
  status: FeedStatus
  error: string | null
  retryAt: number
}

export type FeedAction =
  | { type: 'reset'; generation: number }
  | { type: 'loadingMore'; generation: number }
  | { type: 'loaded'; generation: number; page: FeedPage; append: boolean }
  | { type: 'failed'; generation: number; message: string; retryAt: number; append: boolean }
  | { type: 'patch'; postId: string; patch: Partial<CommunityPost> }
  | { type: 'remove'; postId: string }
  | { type: 'comments'; postId: string; delta: number }

export const initialFeedState: FeedState = {
  generation: 0, items: [], pinned: [], cursor: null, hasMore: false, status: 'loading', error: null, retryAt: 0,
}

export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'reset':
      return { ...initialFeedState, generation: action.generation }
    case 'loadingMore':
      if (action.generation !== state.generation) return state
      return { ...state, status: 'loadingMore', error: null }
    case 'loaded': {
      if (action.generation !== state.generation) return state
      const pinned = action.append ? state.pinned : action.page.pinned ?? []
      const pinnedIds = new Set(pinned.map((post) => post.id))
      const base = action.append ? state.items : []
      const seen = new Set(base.map((post) => post.id))
      const fresh = action.page.items.filter((post) => !seen.has(post.id) && !pinnedIds.has(post.id))
      const items = [...base, ...fresh]
      const capped = items.length >= FEED_MAX_ITEMS
      return {
        ...state,
        items,
        pinned,
        cursor: action.page.next_cursor ?? null,
        hasMore: action.page.has_more && !capped && Boolean(action.page.next_cursor),
        status: 'ready',
        error: null,
        retryAt: 0,
      }
    }
    case 'failed':
      if (action.generation !== state.generation) return state
      return { ...state, status: action.append ? 'errorMore' : 'error', error: action.message, retryAt: action.retryAt }
    case 'patch': {
      const apply = (post: CommunityPost) => (post.id === action.postId ? { ...post, ...action.patch } : post)
      return { ...state, items: state.items.map(apply), pinned: state.pinned.map(apply) }
    }
    case 'comments': {
      const apply = (post: CommunityPost) => (post.id === action.postId
        ? { ...post, comment_count: Math.max(0, post.comment_count + action.delta) } : post)
      return { ...state, items: state.items.map(apply), pinned: state.pinned.map(apply) }
    }
    case 'remove':
      return {
        ...state,
        items: state.items.filter((post) => post.id !== action.postId),
        pinned: state.pinned.filter((post) => post.id !== action.postId),
      }
  }
}

/** Có nên tự tải trang sau khi phần tử cuối lọt vào màn hình không. */
export function canLoadMore(state: FeedState, inFlight: boolean) {
  return !inFlight && state.status === 'ready' && state.hasMore && state.cursor !== null
}

/** Tim/bỏ tim lạc quan: đổi ngay trên giao diện, số tim thật lấy từ phản hồi của BE. */
export function optimisticLike(post: Pick<CommunityPost, 'liked_by_me' | 'like_count'>, liked: boolean) {
  if (post.liked_by_me === liked) return { liked_by_me: liked, like_count: post.like_count }
  return { liked_by_me: liked, like_count: Math.max(0, post.like_count + (liked ? 1 : -1)) }
}
