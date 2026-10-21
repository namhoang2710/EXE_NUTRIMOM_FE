import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { PinInput } from '@/components/base/input/pin-input'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
}

/** One native input owns typing, paste, selection and autofill for all six slots. */
export function OtpInput({ value, onChange, disabled, error }: OtpInputProps) {
  return (
    <PinInput size="md" disabled={disabled} invalid={Boolean(error)} className="otp-control">
      <PinInput.Label className="otp-label">Mã xác thực</PinInput.Label>
      <PinInput.Group maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={value} onChange={onChange} inputMode="numeric" autoComplete="one-time-code" containerClassName="otp-group">
        <PinInput.Slot index={0} />
        <PinInput.Slot index={1} />
        <PinInput.Slot index={2} />
        <PinInput.Separator className="otp-separator" />
        <PinInput.Slot index={3} />
        <PinInput.Slot index={4} />
        <PinInput.Slot index={5} />
      </PinInput.Group>
      <PinInput.Description isInvalid={Boolean(error)} role={error ? 'alert' : undefined}>{error || 'Nhập hoặc dán mã gồm 6 chữ số trong email.'}</PinInput.Description>
    </PinInput>
  )
}
