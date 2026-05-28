const STORAGE_KEY = 'lotteryresort_data'

const DEFAULT_DATA = {
  users: [{ employeeId: '00000', name: '관리자', isAdmin: true }],
  lotteries: [],
  applications: [],
  session: null,
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_DATA }
    const parsed = JSON.parse(raw)
    return {
      users: parsed.users ?? DEFAULT_DATA.users,
      lotteries: parsed.lotteries ?? [],
      applications: parsed.applications ?? [],
      session: parsed.session ?? null,
    }
  } catch {
    return { ...DEFAULT_DATA }
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function generateId() {
  return crypto.randomUUID()
}
