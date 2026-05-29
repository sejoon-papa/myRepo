import cors from 'cors'
import express from 'express'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
const dataPath = path.join(dataDir, 'store.json')

const defaultState = {
  users: [
    { employeeId: '00000', name: '관리자', isAdmin: true },
    { employeeId: '21508', name: '박석훈', isAdmin: false },
  ],
  lotteries: [],
  applications: [],
}

async function ensureStore() {
  await mkdir(dataDir, { recursive: true })
  try {
    await readFile(dataPath, 'utf-8')
  } catch {
    await writeFile(dataPath, JSON.stringify(defaultState, null, 2), 'utf-8')
  }
}

async function readStore() {
  await ensureStore()
  const raw = await readFile(dataPath, 'utf-8')
  const parsed = JSON.parse(raw)
  return {
    users: parsed.users ?? defaultState.users,
    lotteries: parsed.lotteries ?? [],
    applications: parsed.applications ?? [],
  }
}

async function writeStore(data) {
  const persisted = {
    users: data.users,
    lotteries: data.lotteries,
    applications: data.applications,
  }
  await writeFile(dataPath, JSON.stringify(persisted, null, 2), 'utf-8')
  return persisted
}

function uuid() {
  return crypto.randomUUID()
}

const CONSECUTIVE_WIN_BOOST = 3

function getApplicationDays(lottery) {
  return lottery.applicationDays ?? lottery.usageDays ?? 1
}

function getWinnersPerDay(lottery) {
  return lottery.winnersPerDay ?? 2
}

function getPreviousDate(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`)
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}

function wonOnPreviousDay(applications, lotteryId, employeeId, usageDate) {
  const previousDate = getPreviousDate(usageDate)
  return applications.some(
    (a) =>
      a.lotteryId === lotteryId &&
      a.employeeId === employeeId &&
      a.usageDate === previousDate &&
      a.status === 'won',
  )
}

function pickWeightedWinners(candidates, count, getWeight) {
  const winners = []
  const pool = [...candidates]

  while (winners.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((sum, item) => sum + getWeight(item), 0)
    let random = Math.random() * totalWeight
    let selectedIndex = pool.length - 1

    for (let i = 0; i < pool.length; i++) {
      random -= getWeight(pool[i])
      if (random <= 0) {
        selectedIndex = i
        break
      }
    }

    winners.push(pool[selectedIndex])
    pool.splice(selectedIndex, 1)
  }

  return winners
}

function runLotteryDraw(lottery, applications) {
  const lotteryId = lottery.id
  const winnersPerDay = getWinnersPerDay(lottery)
  const pending = applications.filter((a) => a.lotteryId === lotteryId && a.status === 'pending')
  const dates = [...new Set(pending.map((a) => a.usageDate))].sort()
  const winnerIds = new Set()
  let updatedApplications = [...applications]

  for (const usageDate of dates) {
    const dayPending = updatedApplications.filter(
      (a) => a.lotteryId === lotteryId && a.usageDate === usageDate && a.status === 'pending',
    )

    const winners = pickWeightedWinners(
      dayPending,
      winnersPerDay,
      (app) =>
        wonOnPreviousDay(updatedApplications, lotteryId, app.employeeId, usageDate)
          ? CONSECUTIVE_WIN_BOOST
          : 1,
    )

    for (const winner of winners) {
      winnerIds.add(winner.id)
    }

    const dayWinnerIds = new Set(winners.map((w) => w.id))
    updatedApplications = updatedApplications.map((a) => {
      if (a.lotteryId !== lotteryId || a.usageDate !== usageDate || a.status !== 'pending') {
        return a
      }
      return { ...a, status: dayWinnerIds.has(a.id) ? 'won' : 'lost' }
    })
  }

  return { updatedApplications, winnerIds }
}

app.get('/api/state', async (_, res) => {
  const state = await readStore()
  res.json({ ...state, session: null })
})

app.post('/api/login', async (req, res) => {
  const { employeeId, name } = req.body
  const state = await readStore()
  const existing = state.users.find((u) => u.employeeId === employeeId)

  if (!existing) {
    return res.status(400).json({ error: '등록되지 않은 사번입니다.' })
  }

  if (existing.name !== name) {
    return res.status(400).json({ error: '사번과 성명이 일치하지 않습니다.' })
  }

  return res.json({ ...state, session: existing })
})

app.post('/api/logout', async (_, res) => {
  const state = await readStore()
  res.json({ ...state, session: null })
})

app.post('/api/users', async (req, res) => {
  const { employeeId, name, isAdmin } = req.body

  if (!/^\d{5}$/.test(employeeId ?? '')) {
    return res.status(400).json({ error: '사번은 5자리 숫자여야 합니다.' })
  }

  if (!name?.trim()) {
    return res.status(400).json({ error: '성명을 입력해 주세요.' })
  }

  const state = await readStore()

  if (state.users.some((u) => u.employeeId === employeeId)) {
    return res.status(400).json({ error: '이미 등록된 사번입니다.' })
  }

  const user = {
    employeeId,
    name: name.trim(),
    isAdmin: Boolean(isAdmin),
  }

  const next = await writeStore({
    ...state,
    users: [...state.users, user],
  })
  res.json(next)
})

app.delete('/api/users/:employeeId', async (req, res) => {
  const employeeId = req.params.employeeId
  const state = await readStore()
  const target = state.users.find((u) => u.employeeId === employeeId)

  if (!target) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
  }

  if (employeeId === '00000') {
    return res.status(400).json({ error: '기본 관리자 계정은 삭제할 수 없습니다.' })
  }

  const adminCount = state.users.filter((u) => u.isAdmin).length
  if (target.isAdmin && adminCount <= 1) {
    return res.status(400).json({ error: '마지막 관리자 계정은 삭제할 수 없습니다.' })
  }

  const next = await writeStore({
    ...state,
    users: state.users.filter((u) => u.employeeId !== employeeId),
    applications: state.applications.filter((a) => a.employeeId !== employeeId),
  })
  res.json(next)
})

app.post('/api/lotteries', async (req, res) => {
  const { name, startDate, endDate, applicationDays, winnersPerDay } = req.body

  if (!name?.trim() || !startDate || !endDate || !applicationDays || !winnersPerDay) {
    return res.status(400).json({ error: '모든 항목을 입력해 주세요.' })
  }

  if (Number(applicationDays) < 1 || Number(winnersPerDay) < 1) {
    return res.status(400).json({ error: '신청일수와 일당 당첨인원은 1 이상이어야 합니다.' })
  }

  const state = await readStore()
  const lottery = {
    id: uuid(),
    name: name.trim(),
    startDate,
    endDate,
    applicationDays: Number(applicationDays),
    winnersPerDay: Number(winnersPerDay),
    status: 'open',
    createdAt: new Date().toISOString(),
  }
  const next = await writeStore({
    ...state,
    lotteries: [...state.lotteries, lottery],
  })
  res.json(next)
})

app.delete('/api/lotteries/:id', async (req, res) => {
  const state = await readStore()
  const id = req.params.id
  const next = await writeStore({
    ...state,
    lotteries: state.lotteries.filter((l) => l.id !== id),
    applications: state.applications.filter((a) => a.lotteryId !== id),
  })
  res.json(next)
})

app.post('/api/applications', async (req, res) => {
  const state = await readStore()
  const { lotteryId, employeeId, usageDate } = req.body
  const lottery = state.lotteries.find((l) => l.id === lotteryId)

  if (!lottery) {
    return res.status(404).json({ error: '추첨 정보를 찾을 수 없습니다.' })
  }

  if (lottery.status !== 'open') {
    return res.status(400).json({ error: '마감된 추첨에는 신청할 수 없습니다.' })
  }

  const myCount = state.applications.filter(
    (a) => a.lotteryId === lotteryId && a.employeeId === employeeId,
  ).length

  if (myCount >= getApplicationDays(lottery)) {
    return res.status(400).json({
      error: `이 추첨은 최대 ${getApplicationDays(lottery)}일까지 신청할 수 있습니다.`,
    })
  }

  const duplicate = state.applications.some(
    (a) =>
      a.lotteryId === lotteryId &&
      a.employeeId === employeeId &&
      a.usageDate === usageDate,
  )
  if (duplicate) {
    return res.status(400).json({ error: '같은 사용일로는 한 번만 신청할 수 있습니다.' })
  }

  const application = {
    id: uuid(),
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  const next = await writeStore({
    ...state,
    applications: [...state.applications, application],
  })
  res.json(next)
})

app.put('/api/applications/:id', async (req, res) => {
  const state = await readStore()
  const id = req.params.id
  const { usageDate, remarks } = req.body
  const next = await writeStore({
    ...state,
    applications: state.applications.map((a) =>
      a.id === id ? { ...a, usageDate, remarks: (remarks ?? '').trim() } : a,
    ),
  })
  res.json(next)
})

app.delete('/api/applications/:id', async (req, res) => {
  const state = await readStore()
  const id = req.params.id
  const next = await writeStore({
    ...state,
    applications: state.applications.filter((a) => a.id !== id),
  })
  res.json(next)
})

app.post('/api/lotteries/:id/run', async (req, res) => {
  const state = await readStore()
  const id = req.params.id
  const lottery = state.lotteries.find((l) => l.id === id)

  if (!lottery) {
    return res.status(404).json({ error: '추첨 정보를 찾을 수 없습니다.' })
  }

  if (lottery.status !== 'open') {
    return res.status(400).json({ error: '마감된 추첨입니다.' })
  }

  const pending = state.applications.filter((a) => a.lotteryId === id && a.status === 'pending')
  if (pending.length === 0) {
    return res.status(400).json({ error: '신청자가 없습니다.' })
  }

  const { updatedApplications } = runLotteryDraw(lottery, state.applications)

  const next = await writeStore({
    ...state,
    lotteries: state.lotteries.map((l) => (l.id === id ? { ...l, status: 'closed' } : l)),
    applications: updatedApplications,
  })

  return res.json(next)
})

app.listen(port, '0.0.0.0', () => {
  console.log(`API server listening on http://0.0.0.0:${port}`)
})
