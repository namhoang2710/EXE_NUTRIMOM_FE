import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { medicalRecordReminderPayload, medicalRecordReminderTitle } from '../src/features/calendar/model/calendar-helpers.ts'
import { performDialogAction, type ActionDialogEvent } from '../src/shared/model/action-dialog-state.ts'
import { createAsyncActionGate } from '../src/shared/model/async-action.ts'
import type { ReminderType } from '../src/features/calendar/model/calendar-types.ts'

const record = Object.freeze({ id: 'synthetic-record', title: 'Kết quả kiểm tra' })
const form = { startsAtLocal: '2099-10-13T09:00', remindEnabled: true, remindMinutesBefore: 1440, recordTitle: record.title }

test('blank reminder names always send the appropriate suggestion without renaming the medical record', () => {
  const labels: Record<ReminderType, string> = { FOLLOW_UP: 'Tái khám', ROUTINE_CHECKUP: 'Khám định kỳ', CUSTOM: 'Nhắc nhở' }
  for (const [type, prefix] of Object.entries(labels) as Array<[ReminderType, string]>) {
    for (const title of [undefined, '', '  ']) {
      const payload = medicalRecordReminderPayload({ ...form, type, title })
      assert.equal(payload.title, `${prefix}: ${record.title}`)
      assert.equal(payload.type, type)
      assert.equal('recordTitle' in payload, false)
      assert.equal(record.title, 'Kết quả kiểm tra')
    }
  }
})

test('editing the reminder name keeps the user name when type or record changes', () => {
  const entered = '  Mang theo kết quả kiểm tra  '
  for (const type of ['FOLLOW_UP', 'ROUTINE_CHECKUP', 'CUSTOM'] as const) {
    assert.equal(medicalRecordReminderPayload({ ...form, type, title: entered }).title, entered.trim())
    assert.equal(medicalRecordReminderTitle(type, 'Hồ sơ khác', entered), entered.trim())
  }
})

test('the displayed suggestion follows reminder type and selected record and fits the API length limit', () => {
  assert.equal(medicalRecordReminderTitle('CUSTOM', 'Hồ sơ A'), 'Nhắc nhở: Hồ sơ A')
  assert.equal(medicalRecordReminderTitle('ROUTINE_CHECKUP', 'Hồ sơ B'), 'Khám định kỳ: Hồ sơ B')
  const long = medicalRecordReminderTitle('FOLLOW_UP', '😀'.repeat(255))
  assert.ok(long.length <= 255)
  assert.match(long, /^Tái khám: /)
  assert.doesNotMatch(long, /[\uD800-\uDBFF]$/)
})

test('delete confirmation remains pending until API success, then notifies and closes without a success popup', async () => {
  let finish!: () => void
  const events: ActionDialogEvent[] = []
  const feedback: string[] = []
  const pending = performDialogAction(() => new Promise<void>((resolve) => { finish = resolve }), (event) => events.push(event), () => 'Không thể xóa hồ sơ.', {
    closeOnSuccess: true,
    onCompleted: () => feedback.push('toast'),
    onClose: () => feedback.push('close'),
  })
  assert.deepEqual(events, [{ type: 'START' }])
  assert.deepEqual(feedback, [])
  finish()
  assert.equal(await pending, true)
  assert.deepEqual(events, [{ type: 'START' }, { type: 'RESET' }])
  assert.deepEqual(feedback, ['toast', 'close'])
})

test('a failed delete retains the confirmation with an error and never emits success or closes it', async () => {
  const events: ActionDialogEvent[] = []
  let callbacks = 0
  const result = await performDialogAction(async () => { throw new Error('unavailable') }, (event) => events.push(event), () => 'Không thể xóa hồ sơ.', {
    closeOnSuccess: true,
    onCompleted: () => { callbacks += 1 }, onClose: () => { callbacks += 1 },
  })
  assert.equal(result, false)
  assert.deepEqual(events, [{ type: 'START' }, { type: 'FAIL', error: 'Không thể xóa hồ sơ.' }])
  assert.equal(callbacks, 0)
})

test('double delete produces one mutation, one toast and one close', async () => {
  const gate = createAsyncActionGate()
  let mutations = 0, toasts = 0, closes = 0
  let finish!: () => void
  const remove = () => gate.run(async () => {
    await performDialogAction(async () => { mutations += 1; await new Promise<void>((resolve) => { finish = resolve }) }, () => undefined, () => 'Không thể xóa.', {
      closeOnSuccess: true, onCompleted: () => { toasts += 1 }, onClose: () => { closes += 1 },
    })
  })
  const first = remove()
  assert.equal(await remove(), false)
  finish(); await first
  assert.equal(mutations, 1); assert.equal(toasts, 1); assert.equal(closes, 1)
})

test('other action dialogs retain their existing success presentation by default', async () => {
  const events: ActionDialogEvent[] = []
  await performDialogAction(async () => undefined, (event) => events.push(event), () => 'error')
  assert.deepEqual(events, [{ type: 'START' }, { type: 'SUCCEED' }])
})

test('records use one shared viewport toast and the reminder form uses plain language', async () => {
  const page = await readFile(new URL('../src/pages/RecordsPage.tsx', import.meta.url), 'utf8')
  const dialog = await readFile(new URL('../src/features/calendar/components/MedicalRecordReminderDialog.tsx', import.meta.url), 'utf8')
  assert.equal((page.match(/<GlobalActionToast\b/g) ?? []).length, 1)
  assert.doesNotMatch(page, /SuccessDialog|setSuccessMessage|xóa mềm|ghi audit/)
  assert.match(page, /Bạn có chắc chắn muốn xóa hồ sơ y tế\?/)
  assert.match(page, /closeOnSuccess/)
  assert.match(dialog, /Tên lịch nhắc/)
  assert.match(dialog, /Để trống để dùng tên gợi ý từ hồ sơ y tế/)
  assert.doesNotMatch(dialog, /Tiêu đề ghi đè|backend tự tạo/)
  assert.match(dialog, /recordTitle: selected\.title/)
})
