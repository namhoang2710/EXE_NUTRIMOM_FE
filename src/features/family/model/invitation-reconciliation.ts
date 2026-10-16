import type { FamilyInvitationSummary, FamilyRelationship, FamilyScope } from './family-types'
import { maskInvitationTarget } from './invitation-normalizers.ts'

export interface InvitationReconciliationCriteria {
  invitedEmail: string
  relationship: FamilyRelationship
  scopes: FamilyScope[]
  submittedAt: number
}

export type InvitationReconciliationResult =
  | { status: 'found'; invitation: FamilyInvitationSummary }
  | { status: 'ambiguous' | 'not_found' }

function sameScopes(first: FamilyScope[], second: FamilyScope[]) {
  return first.length === second.length && first.every((scope) => second.includes(scope))
}

export function identifyTimedOutInvitation(
  invitations: FamilyInvitationSummary[],
  criteria: InvitationReconciliationCriteria,
): InvitationReconciliationResult {
  const maskedTarget = maskInvitationTarget(criteria.invitedEmail.trim().toLowerCase(), 'EMAIL')
  const earliestExpected = criteria.submittedAt - 60_000
  const latestExpected = criteria.submittedAt + 5 * 60_000
  const candidates = invitations.filter((invitation) => {
    const createdAt = Date.parse(invitation.created_at)
    return invitation.target_type === 'EMAIL'
      && invitation.masked_target === maskedTarget
      && invitation.relationship === criteria.relationship
      && sameScopes(invitation.scopes, criteria.scopes)
      && Number.isFinite(createdAt)
      && createdAt >= earliestExpected
      && createdAt <= latestExpected
  })
  if (candidates.length === 1) return { status: 'found', invitation: candidates[0] }
  return { status: candidates.length > 1 ? 'ambiguous' : 'not_found' }
}

function waitForBackoff(delayMs: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason); return }
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export async function reconcileTimedOutInvitation(
  load: (signal?: AbortSignal) => Promise<FamilyInvitationSummary[]>,
  criteria: InvitationReconciliationCriteria,
  options: {
    signal?: AbortSignal
    wait?: (delayMs: number, signal?: AbortSignal) => Promise<void>
    backoffMs?: number
  } = {},
): Promise<InvitationReconciliationResult> {
  const wait = options.wait ?? waitForBackoff
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = identifyTimedOutInvitation(await load(options.signal), criteria)
    if (result.status !== 'not_found') return result
    if (attempt === 0) await wait(options.backoffMs ?? 1_700, options.signal)
  }
  return { status: 'not_found' }
}
