import { BotAvatar, botAvatarTypes, type BotAvatarState, type BotAvatarType } from 'bot-avatars'
import { memo } from 'react'

const avatarLabels: Record<BotAvatarState, string> = {
  default: 'Trợ lý NutriMom',
  working: 'Trợ lý NutriMom đang tìm câu trả lời',
  sleeping: 'Trợ lý NutriMom đang nghỉ',
}

// Keep the approved fallback local to this shared wrapper. Version 0.2.2 exports cat.
const NUTRIMOM_BOT_TYPE: BotAvatarType = botAvatarTypes.includes('cat') ? 'cat' : 'flower'

interface NutriMomBotAvatarProps {
  state?: BotAvatarState
  size?: number | string
  className?: string
  interactive?: boolean
  decorative?: boolean
  paused?: boolean
}

export const NutriMomBotAvatar = memo(function NutriMomBotAvatar({
  state = 'default',
  size = 40,
  className,
  interactive = false,
  decorative = false,
  paused = false,
}: NutriMomBotAvatarProps) {
  return <BotAvatar
    type={NUTRIMOM_BOT_TYPE}
    face="mouth"
    state={state}
    shading="fabric"
    brightness={1.28}
    saturation={2.05}
    shadow={1.05}
    highlight={1.55}
    light={300}
    rim={0.85}
    spread={1.55}
    lightFront={36}
    shine={0.18}
    sheen={0.12}
    backSoftness={0.9}
    interactive={interactive}
    paused={paused}
    size={size}
    className={className}
    aria-hidden={decorative || undefined}
    aria-label={decorative ? undefined : avatarLabels[state]}
  />
})
