import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { getWinnersPerDay } from '../utils/lottery'

const statusLabel = {
  pending: { text: '대기', className: 'bg-amber-100 text-amber-700' },
  won: { text: '당첨', className: 'bg-green-100 text-green-700' },
  lost: { text: '낙첨', className: 'bg-slate-100 text-slate-600' },
}

export default function AdminPanel() {
  const { state, dispatch, dataRefreshing } = useApp()
  const [selectedLottery, setSelectedLottery] = useState('')
  const [message, setMessage] = useState('')

  const filteredApplications = selectedLottery
    ? state.applications.filter((a) => a.lotteryId === selectedLottery)
    : state.applications

  /** 사용일 기준 오름차순 그룹 (날짜별 신청 현황) */
  const applicationsByUsageDate = (() => {
    const map = new Map()
    for (const app of filteredApplications) {
      const key = app.usageDate || '(날짜 없음)'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(app)
    }
    return [...map.entries()].sort(([a], [b]) =>
      (a === '(날짜 없음)' ? '' : a).localeCompare(b === '(날짜 없음)' ? '' : b),
    )
  })()

  const handleRunLottery = () => {
    if (!selectedLottery) {
      setMessage('추첨을 선택해 주세요.')
      return
    }

    const lottery = state.lotteries.find((l) => l.id === selectedLottery)
    if (!lottery || lottery.status !== 'open') {
      setMessage('마감된 추첨이거나 존재하지 않습니다.')
      return
    }

    const pendingCount = state.applications.filter(
      (a) => a.lotteryId === selectedLottery && a.status === 'pending',
    ).length

    if (pendingCount === 0) {
      setMessage('신청자가 없습니다.')
      return
    }

    const pendingDates = [
      ...new Set(
        state.applications
          .filter((a) => a.lotteryId === selectedLottery && a.status === 'pending')
          .map((a) => a.usageDate),
      ),
    ].length

    const winnersPerDay = getWinnersPerDay(lottery)

    if (
      window.confirm(
        `${lottery.name} 추첨을 진행하시겠습니까?\n\n· 사용일별 ${pendingDates}일\n· 하루 ${winnersPerDay}명 당첨\n· 전날 당첨 후 다음날도 신청한 경우 당첨 확률 ${3}배`,
      )
    ) {
      dispatch({ type: 'RUN_LOTTERY', payload: selectedLottery })
      setMessage('추첨이 완료되었습니다.')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleDeleteLottery = (id) => {
    const lottery = state.lotteries.find((l) => l.id === id)
    if (window.confirm(`"${lottery?.name}" 추첨을 삭제하시겠습니까? 관련 신청도 함께 삭제됩니다.`)) {
      dispatch({ type: 'DELETE_LOTTERY', payload: id })
      if (selectedLottery === id) setSelectedLottery('')
    }
  }

  const getLotteryName = (id) => state.lotteries.find((l) => l.id === id)?.name ?? '-'
  const selectedLotteryData = state.lotteries.find((l) => l.id === selectedLottery)
  const selectedWinnersPerDay = selectedLotteryData ? getWinnersPerDay(selectedLotteryData) : null

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">등록된 추첨</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{state.lotteries.length}건</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">전체 신청</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{state.applications.length}건</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">등록 사용자</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{state.users.length}명</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">추첨 실행</h2>
          {dataRefreshing && (
            <span className="text-sm text-teal-600">데이터 새로고침 중...</span>
          )}
        </div>
        <p className="mb-6 text-sm text-slate-500">
          사용일(날짜)별 등록된 일당 당첨인원만큼 당첨 · 전날 당첨자가 다음날도 신청한 경우 당첨
          확률 3배
          {selectedWinnersPerDay != null && ` · 선택한 추첨: 일 ${selectedWinnersPerDay}명`}
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">추첨 선택</label>
            <select
              value={selectedLottery}
              onChange={(e) => setSelectedLottery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">추첨을 선택하세요</option>
              {state.lotteries.map((lottery) => (
                <option key={lottery.id} value={lottery.id}>
                  {lottery.name} ({lottery.status === 'open' ? '신청중' : '마감'})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleRunLottery}
            className="rounded-lg bg-orange-500 px-6 py-2.5 font-medium text-white transition hover:bg-orange-600"
          >
            추첨 실행
          </button>
        </div>
        {message && (
          <p className={`mt-4 text-sm ${message.includes('완료') ? 'text-teal-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-4 font-semibold text-slate-800">추첨 관리</h3>
        {state.lotteries.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 추첨이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {state.lotteries.map((lottery) => {
              const appCount = state.applications.filter((a) => a.lotteryId === lottery.id).length
              const wonCount = state.applications.filter(
                (a) => a.lotteryId === lottery.id && a.status === 'won',
              ).length
              const winnersPerDay = getWinnersPerDay(lottery)
              return (
                <div
                  key={lottery.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-800">{lottery.name}</p>
                    <p className="text-sm text-slate-500">
                      {lottery.startDate} ~ {lottery.endDate} · 신청 {appCount}건 · 당첨 {wonCount}
                      건 · 일 {winnersPerDay}명
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteLottery(lottery.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="font-semibold text-slate-800">
          신청 현황 (사용일별) {selectedLottery && `· ${getLotteryName(selectedLottery)}`}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          신청 내역을 선택한 이용(사용)일 기준으로 묶어 보여 줍니다. 위 추첨 필터와 동일하게 적용됩니다.
        </p>

        {filteredApplications.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">신청 내역이 없습니다.</p>
        ) : (
          <div className="mt-6 space-y-8">
            {applicationsByUsageDate.map(([usageDate, apps]) => {
              const dayWinnersLimit = selectedLotteryData
                ? getWinnersPerDay(selectedLotteryData)
                : getWinnersPerDay(state.lotteries.find((l) => l.id === apps[0]?.lotteryId))
              return (
              <div key={usageDate}>
                <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-slate-200 pb-2">
                  <span className="text-base font-semibold text-slate-800">{usageDate}</span>
                  <span className="text-sm text-slate-500">
                    신청{' '}
                    <strong className="font-medium text-slate-700">{apps.length}</strong>건
                    <span className="mx-2 text-slate-300">|</span>
                    대기{' '}
                    <strong className="font-medium text-amber-700">
                      {apps.filter((a) => a.status === 'pending').length}
                    </strong>
                    · 당첨{' '}
                    <strong className="font-medium text-green-700">
                      {apps.filter((a) => a.status === 'won').length}
                    </strong>
                    /{dayWinnersLimit}
                    · 낙첨{' '}
                    <strong className="font-medium text-slate-600">
                      {apps.filter((a) => a.status === 'lost').length}
                    </strong>
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="pb-3 pr-4 font-medium">추첨명</th>
                        <th className="pb-3 pr-4 font-medium">사번</th>
                        <th className="pb-3 pr-4 font-medium">성명</th>
                        <th className="pb-3 pr-4 font-medium">사용일</th>
                        <th className="pb-3 pr-4 font-medium">비고</th>
                        <th className="pb-3 font-medium">결과</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apps.map((app) => {
                        const status = statusLabel[app.status]
                        return (
                          <tr key={app.id} className="border-b border-slate-100">
                            <td className="py-3 pr-4 text-slate-800">{getLotteryName(app.lotteryId)}</td>
                            <td className="py-3 pr-4 text-slate-600">{app.employeeId}</td>
                            <td className="py-3 pr-4 text-slate-600">{app.name}</td>
                            <td className="py-3 pr-4 text-slate-600">{app.usageDate}</td>
                            <td className="py-3 pr-4 text-slate-600">{app.remarks || '-'}</td>
                            <td className="py-3">
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                              >
                                {status.text}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
