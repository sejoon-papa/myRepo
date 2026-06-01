/** @param {{ applicationDays?: number, usageDays?: number }} lottery */
export function getApplicationDays(lottery) {
  if (!lottery) return 1
  return lottery.applicationDays ?? lottery.usageDays ?? 1
}

/** @param {{ winnersPerDay?: number }} lottery */
export function getWinnersPerDay(lottery) {
  if (!lottery) return 2
  return lottery.winnersPerDay ?? 2
}

/** @param {string} startDate @param {string} endDate */
export function getDateRange(startDate, endDate) {
  const dates = []
  const current = new Date(`${startDate}T12:00:00`)
  const end = new Date(`${endDate}T12:00:00`)

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/** @param {{ id: string, startDate: string, endDate: string, winnersPerDay?: number }} lottery @param {Array<{ lotteryId: string, usageDate: string, status: string }>} applications */
export function getReapplyDates(lottery, applications) {
  const winnersPerDay = getWinnersPerDay(lottery)
  const lotteryApps = applications.filter((a) => a.lotteryId === lottery.id)

  return getDateRange(lottery.startDate, lottery.endDate)
    .filter((date) => {
      const dayApps = lotteryApps.filter((a) => a.usageDate === date)
      if (dayApps.length === 0) return true

      const wonCount = dayApps.filter((a) => a.status === 'won').length
      return wonCount < winnersPerDay
    })
    .sort()
}

/** @param {{ id: string, startDate: string, endDate: string }} lottery @param {Array<{ lotteryId: string, usageDate: string }>} applications */
export function getVacantDates(lottery, applications) {
  return getReapplyDates(lottery, applications)
}

/** @param {Array<{ createdAt?: string, id?: string }>} items */
export function sortByCreatedAtDesc(items) {
  return [...items].sort((a, b) => {
    const timeA = Date.parse(a.createdAt ?? '') || 0
    const timeB = Date.parse(b.createdAt ?? '') || 0
    if (timeB !== timeA) return timeB - timeA
    return String(b.id ?? '').localeCompare(String(a.id ?? ''))
  })
}

/** @param {Array<{ lotteryId: string, usageDate?: string }>} applications @param {Array<{ id: string, createdAt?: string }>} lotteries */
export function sortApplicationsByRecentLottery(applications, lotteries) {
  const lotteryTimeById = new Map(
    lotteries.map((l) => [l.id, Date.parse(l.createdAt ?? '') || 0]),
  )
  return [...applications].sort((a, b) => {
    const lotteryCompare =
      (lotteryTimeById.get(b.lotteryId) ?? 0) - (lotteryTimeById.get(a.lotteryId) ?? 0)
    if (lotteryCompare !== 0) return lotteryCompare
    return (a.usageDate ?? '').localeCompare(b.usageDate ?? '')
  })
}

/** @param {string} status */
export function getLotteryStatusLabel(status) {
  if (status === 'open') return '신청중'
  if (status === 'reapply') return '재신청중'
  return '마감'
}

/** @param {{ status: string, vacantDates?: string[] }} lottery */
export function isReapplyOpen(lottery) {
  return lottery?.status === 'reapply' && (lottery.vacantDates?.length ?? 0) > 0
}

/** @param {{ id: string, applicationDays?: number, usageDays?: number }} lottery @param {Array<{ lotteryId: string, employeeId: string, status: string }>} applications @param {string} employeeId */
export function getMyApplicationsForLottery(applications, lotteryId, employeeId) {
  return applications.filter((a) => a.lotteryId === lotteryId && a.employeeId === employeeId)
}

export function getWonCount(myApps) {
  return myApps.filter((a) => a.status === 'won').length
}

export function getOpenApplicationCount(myApps) {
  return myApps.filter((a) => !a.isReapply).length
}

export function getReapplyApplicationCount(myApps) {
  return myApps.filter((a) => a.isReapply).length
}

/** 1차 신청(신청중) 최대 건수 */
export function getMaxOpenApplicationCount(lottery) {
  return getApplicationDays(lottery)
}

/** 재신청 가능 건수 = 신청가능일수 − 당첨일수 */
export function getMaxReapplyCount(lottery, applications, employeeId) {
  const myApps = getMyApplicationsForLottery(applications, lottery.id, employeeId)
  return Math.max(0, getApplicationDays(lottery) - getWonCount(myApps))
}

export function getRemainingReapplyCount(lottery, applications, employeeId) {
  const myApps = getMyApplicationsForLottery(applications, lottery.id, employeeId)
  return Math.max(0, getMaxReapplyCount(lottery, applications, employeeId) - getReapplyApplicationCount(myApps))
}

/** @deprecated open/reapply 구분은 canApplyMoreToLottery 사용 */
export function getMaxApplicationCount(lottery, applications, employeeId) {
  if (lottery.status === 'reapply') {
    return getMaxReapplyCount(lottery, applications, employeeId)
  }
  return getMaxOpenApplicationCount(lottery)
}

export function canApplyMoreToLottery(lottery, applications, employeeId) {
  const myApps = getMyApplicationsForLottery(applications, lottery.id, employeeId)
  if (lottery.status === 'reapply') {
    return getRemainingReapplyCount(lottery, applications, employeeId) > 0
  }
  return getOpenApplicationCount(myApps) < getMaxOpenApplicationCount(lottery)
}

/** @deprecated use getRemainingReapplyCount */
export function getRemainingApplicationCount(lottery, applications, employeeId) {
  if (lottery.status === 'reapply') {
    return getRemainingReapplyCount(lottery, applications, employeeId)
  }
  const myApps = getMyApplicationsForLottery(applications, lottery.id, employeeId)
  return Math.max(0, getMaxOpenApplicationCount(lottery) - getOpenApplicationCount(myApps))
}

/** 재신청 대상: (신청가능일수 − 당첨일수)만큼 재신청 가능 */
export function isReapplyEligible(applications, lottery, employeeId) {
  if (lottery.status !== 'reapply') return false
  return getRemainingReapplyCount(lottery, applications, employeeId) > 0
}

/** @param {string[]} vacantDates @param {Array<{ id?: string, lotteryId: string, employeeId: string, usageDate: string }>} applications @param {string} lotteryId @param {string} employeeId @param {string} [excludeApplicationId] */
export function getAvailableVacantDatesForUser(
  vacantDates,
  applications,
  lotteryId,
  employeeId,
  excludeApplicationId,
) {
  const takenDates = new Set(
    applications
      .filter(
        (a) =>
          a.lotteryId === lotteryId &&
          a.employeeId === employeeId &&
          a.id !== excludeApplicationId,
      )
      .map((a) => a.usageDate),
  )
  return vacantDates.filter((date) => !takenDates.has(date)).sort()
}

/** @deprecated use isReapplyEligible */
export function isLotteryLoser(applications, lotteryId, employeeId) {
  return applications.some(
    (a) => a.lotteryId === lotteryId && a.employeeId === employeeId && a.status === 'lost',
  )
}
