import type { Gender, ProfilePatch, UserProfile } from './user-types.ts'

export function profileDraft(profile: UserProfile | null) {
  return { display_name: profile?.display_name ?? '', email: profile?.email ?? '', date_of_birth: profile?.date_of_birth ?? '', gender: profile?.gender ?? '' }
}
export function reconcileProfileDraft(current: ReturnType<typeof profileDraft>, latest: UserProfile, dirty: boolean) {
  return dirty ? current : profileDraft(latest)
}
export function buildProfilePatch(profile: UserProfile, draft: ReturnType<typeof profileDraft>): ProfilePatch | null {
  const body: ProfilePatch = { version: profile.version }
  if (draft.display_name.trim() !== profile.display_name) body.display_name = draft.display_name.trim()
  if (draft.email !== (profile.email ?? '')) body.email = draft.email
  if (draft.date_of_birth && draft.date_of_birth !== (profile.date_of_birth ?? '')) body.date_of_birth = draft.date_of_birth
  if (draft.gender && draft.gender !== (profile.gender ?? '')) body.gender = draft.gender as Gender
  return Object.keys(body).length > 1 ? body : null
}
