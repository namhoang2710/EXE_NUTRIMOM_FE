import assert from 'node:assert/strict'
import test from 'node:test'
import { adminCommunityTab, approveAndPin, canEditAdminPost, postStatusFilter } from '../src/features/community/model/admin-community.ts'
import { communityEndpoints } from '../src/features/community/model/community-endpoints.ts'
import type { AdminPostItem } from '../src/features/community/model/community-types.ts'

test('admin community accepts supported views and safely defaults unknown URL state', () => {
  assert.equal(adminCommunityTab('pinned'), 'pinned')
  assert.equal(adminCommunityTab('reports'), 'reports')
  assert.equal(adminCommunityTab('made-up'), 'feed')
  assert.equal(postStatusFilter('REMOVED'), 'REMOVED')
  assert.equal(postStatusFilter('DRAFT'), undefined)
})
test('admin list encodes the actual pinned query and has a dedicated publishing endpoint', () => {
  assert.equal(communityEndpoints.admin.posts(undefined, null, 20, true), '/admin/community/posts?pinned=true&limit=20')
  assert.equal(communityEndpoints.admin.posts('PENDING', 'cursor/+?', 20), '/admin/community/posts?status=PENDING&cursor=cursor%2F%2B%3F&limit=20')
  assert.equal(communityEndpoints.admin.create, '/admin/community/posts')
})
test('moderator response flags do not hide an editable own post, but never grant editing another author', () => {
  const item = { post: { author: { id: 'admin-a' }, status: 'APPROVED', can_edit: false }, open_report_count: 0 } as AdminPostItem
  assert.equal(canEditAdminPost(item, 'admin-a'), true)
  assert.equal(canEditAdminPost(item, 'admin-b'), false)
  assert.equal(canEditAdminPost({ ...item, deleted_at: '2026-10-21T00:00:00Z' }, 'admin-a'), false)
  assert.equal(canEditAdminPost({ ...item, post: { ...item.post, status: 'REMOVED' } }, 'admin-a'), false)
})
test('approve and pin preserves successful approval when pin fails', async () => {
  const sequence: string[] = []
  const pinError = new Error('pin capacity reached')
  const result = await approveAndPin(async () => { sequence.push('approve'); return { status: 'APPROVED', pinned: false } }, async () => { sequence.push('pin'); throw pinError })
  assert.deepEqual(sequence, ['approve', 'pin'])
  assert.equal(result.item.status, 'APPROVED')
  assert.equal(result.pinError, pinError)
})
test('approve and pin never attempts pin if approval fails', async () => {
  let pinCalls = 0
  await assert.rejects(approveAndPin(async () => { throw new Error('approval failed') }, async () => { pinCalls++; return 'ok' }), /approval failed/)
  assert.equal(pinCalls, 0)
})
