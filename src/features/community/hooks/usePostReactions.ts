import { useCallback, useRef, useState } from 'react'
import { communityApi } from '../api/community-api'
import { friendlyError } from '../model/community-errors'
import type { CommunityPost } from '../model/community-types'
import { optimisticLike } from '../model/feed-state'

type Patch = (postId: string, patch: Partial<CommunityPost>) => void

/**
 * Tim và lưu lạc quan. Mỗi bài có một khoá riêng cho từng loại thao tác: bấm liên tục khi request
 * trước chưa xong sẽ bị bỏ qua, nên không có request trùng. Lỗi thì hoàn tác về giá trị cũ.
 */
export function usePostReactions(patchPost: Patch, onRemoved: (postId: string) => void) {
  const busyRef = useRef(new Set<string>())
  const [error, setError] = useState<string | null>(null)

  // Đang có request cho bài này thì bỏ qua cả lần bấm lẫn thay đổi lạc quan, để giao diện không lệch server.
  const run = useCallback(async (key: string, optimistic: () => void, action: () => Promise<void>, rollback: () => void, postId: string) => {
    if (busyRef.current.has(key)) return false
    busyRef.current.add(key)
    setError(null)
    optimistic()
    try {
      await action()
      return true
    } catch (reason) {
      rollback()
      const friendly = friendlyError(reason)
      if (friendly.status === 404) onRemoved(postId)
      setError(friendly.message)
      return false
    } finally {
      busyRef.current.delete(key)
    }
  }, [onRemoved])

  const toggleLike = useCallback((post: CommunityPost) => {
    const next = !post.liked_by_me
    const previous = { liked_by_me: post.liked_by_me, like_count: post.like_count }
    void run(`like:${post.id}`, () => patchPost(post.id, optimisticLike(post, next)), async () => {
      const result = await communityApi.like(post.id, next)
      patchPost(post.id, { liked_by_me: result.liked, like_count: result.like_count })
    }, () => patchPost(post.id, previous), post.id)
  }, [patchPost, run])

  const toggleSave = useCallback((post: CommunityPost) => {
    const next = !post.saved_by_me
    return run(`save:${post.id}`, () => patchPost(post.id, { saved_by_me: next }), async () => {
      const result = await communityApi.save(post.id, next)
      patchPost(post.id, { saved_by_me: result.saved })
    }, () => patchPost(post.id, { saved_by_me: post.saved_by_me }), post.id)
  }, [patchPost, run])

  return { toggleLike, toggleSave, error, clearError: () => setError(null) }
}
