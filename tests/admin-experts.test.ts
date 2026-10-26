import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { validateCreateExpert, validateExpertAvatar, validateExpertProfile } from '../src/features/admin/model/admin-experts.ts'
import { mapAdminExpert, mapExpertSpecialty, serializeCreateAdminExpert, serializeUpdateAdminExpert } from '../src/features/admin/model/admin-experts-mappers.ts'

const expertDto = {
  user_id: 'expert/one', phone: '+84900000000', full_name: 'Dr An', specialty: 'PSYCHOLOGY' as const,
  title: 'Counsellor', workplace: null, years_of_experience: 5, bio: null, avatar_key: null,
  avatar_url: 'https://cdn.example/avatar.jpg', status: 'ACTIVE' as const, average_rating: 4.75,
  rating_count: 12, version: 3, created_at: '2026-09-20T10:00:00Z', updated_at: '2026-09-22T10:00:00Z',
}

test('maps the Admin Expert snake_case contract without inventing roles', () => {
  const expert = mapAdminExpert(expertDto)
  assert.equal(expert.userId, 'expert/one')
  assert.equal(expert.fullName, 'Dr An')
  assert.equal(expert.yearsOfExperience, 5)
  assert.equal(expert.averageRating, 4.75)
  assert.equal(expert.avatarUrl, 'https://cdn.example/avatar.jpg')
  assert.equal('roles' in expert, false)
  assert.deepEqual(mapExpertSpecialty({ code: 'HEALTH', display_name: 'Sức khỏe', sort_order: 3 }), { code: 'HEALTH', displayName: 'Sức khỏe', sortOrder: 3 })
})

test('serializes create with exact snake_case fields and omits blank optional values', () => {
  assert.deepEqual(serializeCreateAdminExpert({
    phone: ' +84900000000 ', password: 'safe-password', fullName: ' Dr An ', specialty: 'PSYCHOLOGY',
    title: ' ', workplace: ' Clinic ', yearsOfExperience: 5, bio: '',
  }), {
    phone: '+84900000000', password: 'safe-password', full_name: 'Dr An', specialty: 'PSYCHOLOGY',
    workplace: 'Clinic', years_of_experience: 5,
  })
})

test('serializes PATCH fields with required version and excludes immutable/system fields', () => {
  const payload = serializeUpdateAdminExpert({ fullName: 'Dr B', specialty: 'HEALTH', title: '', status: 'INACTIVE', version: 8 })
  assert.deepEqual(payload, { full_name: 'Dr B', specialty: 'HEALTH', title: '', status: 'INACTIVE', version: 8 })
  for (const forbidden of ['phone', 'password', 'average_rating', 'rating_count', 'avatar_key', 'avatar_url', 'user_id', 'created_at', 'updated_at']) assert.equal(forbidden in payload, false)
})

test('validates create/profile limits and avatar type/size before requests', () => {
  const invalid = validateCreateExpert({ phone: '', password: 'short', fullName: '', specialty: '', title: '', workplace: '', yearsOfExperience: '81', bio: '' })
  assert.ok(invalid.phone); assert.ok(invalid.password); assert.ok(invalid.fullName); assert.ok(invalid.specialty); assert.ok(invalid.yearsOfExperience)
  assert.deepEqual(validateExpertProfile({ fullName: 'An', specialty: 'HEALTH', title: '', workplace: '', yearsOfExperience: '0', bio: '' }), {})
  assert.equal(validateExpertAvatar(new File(['not-an-image'], 'avatar.txt', { type: 'text/plain' })), 'Chọn ảnh JPEG, PNG hoặc WebP.')
  assert.equal(validateExpertAvatar(new File(['image'], 'avatar.webp', { type: 'image/webp' })), null)
})

test('expert API uses guarded shared reads, encoded IDs and multipart without a custom boundary', async () => {
  const source = await readFile(new URL('../src/features/admin/api/admin-api.ts', import.meta.url), 'utf8')
  assert.match(source, /adminRead\('\/admin\/experts'/)
  assert.match(source, /encodeURIComponent\(userId\)/)
  assert.match(source, /method: 'DELETE'/)
  assert.match(source, /body.append\('file', file\)/)
  assert.match(source, /retryAfterRefresh: false/)
  assert.match(source, /\/reference-data\/specialties/)
  assert.doesNotMatch(source, /Content-Type.*multipart\/form-data/)
})

test('experts have a paginated workspace reusing create, avatar and version-protected edit flows', async () => {
  const page = await readFile(new URL('../src/features/admin/pages/AdminExpertsPage.tsx', import.meta.url), 'utf8')
  const create = await readFile(new URL('../src/features/admin/components/AdminExpertCreateDialog.tsx', import.meta.url), 'utf8')
  const detail = await readFile(new URL('../src/features/admin/components/AdminExpertDetailDrawer.tsx', import.meta.url), 'utf8')
  assert.match(page, /\/admin\/experts\/page/)
  assert.match(page, /WorkspacePagination/)
  assert.match(page, /AdminExpertCreateDialog/)
  assert.match(create, /uploadSelectedAvatar\(expert\)/)
  assert.match(create, /mutationLock.current/)
  assert.match(detail, /reason.code === 'VERSION_CONFLICT'/)
  assert.match(detail, /version: detail.version/)
  assert.match(detail, /disabled=\{busy \|\| versionConflict\}/)
  assert.match(detail, /mapExpertFieldErrors/)
  assert.match(detail, /adminExpertsApi.deactivate/)
})
