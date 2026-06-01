import { getDateRange } from '../utils/lottery'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function getMonthsInRange(startDate, endDate) {
  const months = []
  const current = new Date(`${startDate}T12:00:00`)
  current.setDate(1)
  const end = new Date(`${endDate}T12:00:00`)

  while (current <= end) {
    months.push({ year: current.getFullYear(), month: current.getMonth() })
    current.setMonth(current.getMonth() + 1)
  }

  return months
}

function buildMonthCells(year, month, startDate, endDate) {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < firstDay.getDay(); i++) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (dateStr >= startDate && dateStr <= endDate) {
      cells.push(dateStr)
    } else {
      cells.push(null)
    }
  }

  return cells
}

export default function ReapplyDateCalendar({
  startDate,
  endDate,
  availableDates,
  value,
  onChange,
  disabled = false,
  compact = false,
}) {
  if (!startDate || !endDate) return null

  const availableSet = new Set(availableDates)
  const periodDates = new Set(getDateRange(startDate, endDate))
  const months = getMonthsInRange(startDate, endDate)
  const cellClass = compact ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm'

  return (
    <div className={compact ? 'space-y-3' : 'space-y-5'}>
      <div className={`flex flex-wrap gap-4 text-xs ${compact ? 'text-slate-500' : 'text-slate-600'}`}>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block rounded ${cellClass} bg-white font-semibold text-slate-900 ring-1 ring-slate-300`} />
          신청 가능
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block rounded ${cellClass} bg-slate-100 font-medium text-slate-300`} />
          신청 불가
        </span>
      </div>

      {months.map(({ year, month }) => {
        const cells = buildMonthCells(year, month, startDate, endDate)
        const label = new Date(year, month, 1).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
        })

        return (
          <div key={`${year}-${month}`}>
            <p className={`mb-2 font-medium text-slate-700 ${compact ? 'text-xs' : 'text-sm'}`}>
              {label}
            </p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className={`py-1 font-medium text-slate-400 ${compact ? 'text-[10px]' : 'text-xs'}`}
                >
                  {day}
                </div>
              ))}
              {cells.map((dateStr, index) => {
                if (!dateStr) {
                  return <div key={`empty-${year}-${month}-${index}`} className={cellClass} />
                }

                const isAvailable = availableSet.has(dateStr)
                const isSelected = value === dateStr
                const inPeriod = periodDates.has(dateStr)

                if (!inPeriod) {
                  return <div key={`skip-${dateStr}`} className={cellClass} />
                }

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={disabled || !isAvailable}
                    onClick={() => onChange(dateStr)}
                    className={`rounded transition ${cellClass} ${
                      isAvailable
                        ? isSelected
                          ? 'bg-teal-600 font-semibold text-white ring-2 ring-teal-300'
                          : 'bg-white font-semibold text-slate-900 ring-1 ring-slate-300 hover:bg-teal-50'
                        : 'cursor-not-allowed bg-slate-100 font-medium text-slate-300'
                    }`}
                    aria-label={`${dateStr} ${isAvailable ? '신청 가능' : '신청 불가'}`}
                    aria-pressed={isSelected}
                  >
                    {Number(dateStr.slice(8, 10))}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
