const apiBase = process.env.NUTRIMOM_API_BASE ?? 'http://127.0.0.1:8080/api/v1'
const expertPhone = process.env.NUTRIMOM_EXPERT_QA_PHONE
const expertPassword = process.env.NUTRIMOM_EXPERT_QA_PASSWORD
const userPhone = process.env.NUTRIMOM_USER_QA_PHONE
const userPassword = process.env.NUTRIMOM_USER_QA_PASSWORD
if (!expertPhone || !expertPassword || !userPhone || !userPassword) throw new Error('Missing E2E credentials')

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Device-Id': 'codex-expert-api-e2e',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `${method} ${path} failed with ${response.status}`)
    error.code = payload?.error?.code
    error.status = response.status
    throw error
  }
  return payload?.data
}

async function login(phone, password, deviceId) {
  return request('/auth/login', { method: 'POST', body: { phone, password, device_id: deviceId } })
}

async function loginOrRegisterUser() {
  try {
    return await login(userPhone, userPassword, 'codex-user-api-e2e')
  } catch {
    return request('/auth/register', { method: 'POST', body: { phone: userPhone, password: userPassword, device_id: 'codex-user-api-e2e', display_name: 'Nguoi dung QA', accepted_terms: true } })
  }
}

function vietnamDate(offsetDays) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + offsetDays))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

async function findWindow(token, offset, reserved = []) {
  for (let day = offset; day < offset + 14; day += 1) {
    const date = vietnamDate(day)
    const schedule = await request(`/expert/schedule?date=${date}`, { token })
    for (const slot of schedule.slots) {
      const start = slot.start_time.slice(0, 5)
      const reservedByRun = reserved.some((item) => item.slot_date === date && item.start_time === start)
      if (!schedule.day_off && slot.state === 'OPEN' && !slot.past && !reservedByRun) return { slot_date: date, start_time: start }
    }
  }
  throw new Error('No free slot window found')
}

async function expectCode(action, code) {
  try {
    await action()
  } catch (error) {
    if (error.code === code) return { code, status: error.status, message: error.message }
    throw error
  }
  throw new Error(`Expected ${code}`)
}

const expertAuth = await login(expertPhone, expertPassword, 'codex-expert-api-e2e')
const userAuth = await loginOrRegisterUser()
const expertToken = expertAuth.access_token
const userToken = userAuth.access_token
const expertId = expertAuth.user.id
const runId = Date.now()
const reserved = []

const profileBefore = await request('/expert/me', { token: expertToken })

const directWindow = await findWindow(expertToken, 3, reserved)
reserved.push(directWindow)
const directRequest = await request('/consultation-requests', { token: userToken, method: 'POST', body: { assignment_type: 'DIRECT', expert_user_id: expertId, slot_date: directWindow.slot_date, start_time: `${directWindow.start_time}:00`, note: `E2E direct ${runId}` } })
const bookedSlot = (await request(`/expert/schedule?date=${directWindow.slot_date}`, { token: expertToken })).slots.find((slot) => slot.start_time.slice(0, 5) === directWindow.start_time)
const assignedDirect = (await request('/expert/consultation-requests?type=assigned&page=1&pageSize=100', { token: expertToken })).items.find((item) => item.id === directRequest.id)
await request(`/expert/consultation-requests/${encodeURIComponent(directRequest.id)}/complete`, { token: expertToken, method: 'POST' })
const completedDirect = (await request('/consultation-requests?page=1&pageSize=100', { token: userToken })).items.find((item) => item.id === directRequest.id)
await request(`/consultation-requests/${encodeURIComponent(directRequest.id)}/review`, { token: userToken, method: 'POST', body: { rating: 5, comment: `E2E review ${runId}` } })
const expertReview = (await request('/expert/reviews?sort=newest&page=1&pageSize=100', { token: expertToken })).items.find((item) => item.request_id === directRequest.id)
const profileAfter = await request('/expert/me', { token: expertToken })

const randomWindow = await findWindow(expertToken, 4, reserved)
reserved.push(randomWindow)
const randomRequest = await request('/consultation-requests', { token: userToken, method: 'POST', body: { assignment_type: 'RANDOM', specialty: 'HEALTH', note: `E2E random ${runId}` } })
const poolBeforeAccept = (await request('/expert/consultation-requests?type=pool&page=1&pageSize=100', { token: expertToken })).items.some((item) => item.id === randomRequest.id)
const acceptedRandom = await request(`/expert/consultation-requests/${encodeURIComponent(randomRequest.id)}/accept`, { token: expertToken, method: 'POST', body: { slot_date: randomWindow.slot_date, start_time: `${randomWindow.start_time}:00` } })
const poolAfterAccept = (await request('/expert/consultation-requests?type=pool&page=1&pageSize=100', { token: expertToken })).items.some((item) => item.id === randomRequest.id)
await request(`/expert/consultation-requests/${encodeURIComponent(randomRequest.id)}/complete`, { token: expertToken, method: 'POST' })
const completedRandom = (await request('/consultation-requests?page=1&pageSize=100', { token: userToken })).items.find((item) => item.id === randomRequest.id)

const claimedWindow = await findWindow(expertToken, 5, reserved)
reserved.push(claimedWindow)
const claimedRequest = await request('/consultation-requests', { token: userToken, method: 'POST', body: { assignment_type: 'RANDOM', specialty: 'HEALTH', note: `E2E claimed ${runId}` } })
await request(`/expert/consultation-requests/${encodeURIComponent(claimedRequest.id)}/accept`, { token: expertToken, method: 'POST', body: { slot_date: claimedWindow.slot_date, start_time: `${claimedWindow.start_time}:00` } })
const alreadyClaimed = await expectCode(() => request(`/expert/consultation-requests/${encodeURIComponent(claimedRequest.id)}/accept`, { token: expertToken, method: 'POST', body: { slot_date: claimedWindow.slot_date, start_time: `${claimedWindow.start_time}:00` } }), 'REQUEST_ALREADY_CLAIMED')
await request(`/expert/consultation-requests/${encodeURIComponent(claimedRequest.id)}/complete`, { token: expertToken, method: 'POST' })

const unavailableWindow = await findWindow(expertToken, 6, reserved)
reserved.push(unavailableWindow)
const bookedForConflict = await request('/consultation-requests', { token: userToken, method: 'POST', body: { assignment_type: 'DIRECT', expert_user_id: expertId, slot_date: unavailableWindow.slot_date, start_time: `${unavailableWindow.start_time}:00`, note: `E2E booked conflict ${runId}` } })
const waitingForSlot = await request('/consultation-requests', { token: userToken, method: 'POST', body: { assignment_type: 'RANDOM', specialty: 'HEALTH', note: `E2E slot conflict ${runId}` } })
const slotUnavailable = await expectCode(() => request(`/expert/consultation-requests/${encodeURIComponent(waitingForSlot.id)}/accept`, { token: expertToken, method: 'POST', body: { slot_date: unavailableWindow.slot_date, start_time: `${unavailableWindow.start_time}:00` } }), 'SLOT_UNAVAILABLE')
const closeBooked = await expectCode(() => request('/expert/schedule/slot', { token: expertToken, method: 'PUT', body: { slot_date: unavailableWindow.slot_date, start_time: `${unavailableWindow.start_time}:00`, closed: true } }), 'SLOT_UNAVAILABLE')
await request(`/expert/consultation-requests/${encodeURIComponent(bookedForConflict.id)}/complete`, { token: expertToken, method: 'POST' })
await request(`/consultation-requests/${encodeURIComponent(waitingForSlot.id)}/cancel`, { token: userToken, method: 'POST' })

console.log(JSON.stringify({
  direct: {
    slotBookedAfterUserAction: bookedSlot?.state === 'BOOKED',
    visibleInAssigned: assignedDirect?.status === 'PENDING_CONSULTATION',
    completedForUser: completedDirect?.status === 'COMPLETED',
    canReviewAfterComplete: completedDirect?.can_review === true,
    reviewVisibleForExpert: expertReview?.rating === 5,
    ratingCountDelta: profileAfter.rating_count - profileBefore.rating_count,
  },
  random: {
    visibleInPool: poolBeforeAccept,
    removedFromPool: !poolAfterAccept,
    assignedToSelectedSlot: acceptedRandom.slot?.slot_date === randomWindow.slot_date && acceptedRandom.slot?.start_time.slice(0, 5) === randomWindow.start_time,
    completedForUser: completedRandom?.status === 'COMPLETED',
  },
  concurrency: { alreadyClaimed, slotUnavailable, closeBooked },
}, null, 2))
