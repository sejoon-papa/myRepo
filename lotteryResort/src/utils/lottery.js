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
