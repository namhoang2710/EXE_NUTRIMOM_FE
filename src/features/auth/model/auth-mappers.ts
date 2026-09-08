import type { OtpChallengeDto, UserDto } from './auth-dto'
import type { OtpChallenge, User } from './auth-types'

export function normalizeUser(user: UserDto): User {
  return {
    id: user.id,
    phone: user.phone,
    displayName: user.display_name,
    roles: user.roles,
    status: user.status,
    createdAt: user.created_at,
  }
}

export function mapOtpChallenge(dto: OtpChallengeDto): OtpChallenge {
  return {
    challengeId: dto.challenge_id,
    maskedPhone: dto.masked_phone,
    deliveryChannel: dto.delivery_channel,
    expiresIn: dto.expires_in,
    resendAfter: dto.resend_after,
    debugCode: dto.debug_code,
  }
}
