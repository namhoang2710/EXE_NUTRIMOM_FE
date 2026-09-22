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
  assert.equal(validateExpertAvatar(new File(['not-an-image'], 'avatar.txt', { type: 'text/plain' })), 'Choose a JPEG, PNG or WebP image.')
  assert.equal(validateExpertAvatar(new File(['image'], 'avatar.webp', { type: 'image/webp' })), null)
})

test('API layer uses real endpoints, encoded ids, 204 handling and browser multipart boundary', async () => {
  const source = await readFile(new URL('../src/features/admin/api/admin-api.ts', import.meta.url), 'utf8')
  assert.match(source, /apiClient\.request<AdminExpertDto\[]>\('\/admin\/experts'/)
  assert.match(source, /encodeURIComponent\(userId\)/)
  assert.match(source, /method: 'DELETE'/)
  assert.match(source, /body\.append\('file', file\)/)
  assert.equal(source.includes("'Content-Type': 'multipart/form-data'"), false)
  assert.match(source, /\/reference-data\/specialties/)
})

test('expert UI keeps list unpaginated and implements create, detail, update, retry and soft deactivate flows', async () => {
  const page = await readFile(new URL('../src/features/admin/pages/AdminUsersPage.tsx', import.meta.url), 'utf8')
  const create = await readFile(new URL('../src/features/admin/components/AdminExpertCreateDialog.tsx', import.meta.url), 'utf8')
  const detail = await readFile(new URL('../src/features/admin/components/AdminExpertDetailDrawer.tsx', import.meta.url), 'utf8')
  const table = await readFile(new URL('../src/features/admin/components/AdminExpertsTable.tsx', import.meta.url), 'utf8')
  assert.match(page, /section === 'experts'/)
  assert.match(page, /setSection\('experts'\)/)
  assert.match(page, /Create expert/)
  assert.equal(page.includes('expertPage'), false)
  assert.match(create, /uploadSelectedAvatar\(expert\)/)
  assert.match(create, /Expert created successfully/)
  assert.match(create, /Retry avatar upload/)
  assert.match(create, /showPassword \? 'text' : 'password'/)
  assert.match(create, /showPassword \? 'Hide password' : 'Show password'/)
  assert.match(detail, /VERSION_CONFLICT/)
  assert.match(detail, /Deactivate expert/)
  assert.match(detail, /adminExpertsApi\.deactivate/)
  assert.equal(detail.includes('window.confirm'), false)
  assert.match(detail, /setEditTouched\(true\)/)
  assert.match(detail, /editTouched \|\| avatarTouched/)
  assert.match(detail, /admin-expert-drawer-confirm-backdrop/)
  assert.match(detail, /onClick=\{requestDismiss\}>Cancel/)
  assert.match(detail, /onClick=\{returnToDetail\}>Discard changes/)
  assert.match(table, /expert\.avatarUrl/)
  assert.match(table, /expert\.ratingCount \|\| 0/)
})
