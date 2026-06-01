import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { getLotteryStatusLabel, getWinnersPerDay, sortByCreatedAtDesc } from '../utils/lottery'

const statusLabel = {
  pending: { text: '대기', className: 'bg-amber-100 text-amber-700' },
  won: { text: '당첨', className: 'bg-green-100 text-green-700' },
  lost: { text: '낙첨', className: 'bg-slate-100 text-slate-600' },
}

export default function AdminPanel() {
  const { state, dispatch, dataRefreshing } = useApp()
  const [selectedLottery, setSelectedLottery] = useState('')
  const [message, setMessage] = useState('')
  const [expandedLotteryIds, setExpandedLotteryIds] = useState(() => new Set())

  const groupApplicationsByUsageDate = (applications) => {
    const map = new Map()
    for (const app of applications) {
      const key = app.usageDate || '(날짜 없음)'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(app)
    }
    return [...map.entries()].sort(([a], [b]) =>
      (a === '(날짜 없음)' ? '' : a).localeCompare(b === '(날짜 없음)' ? '' : b),
    )
  }

  /** 추첨 등록별 → 사용일별 신청 현황 (최근 등록 추첨부터) */
  const applicationsByLottery = sortByCreatedAtDesc(state.lotteries).map((lottery) => {
    const apps = sortByCreatedAtDesc(
      state.applications.filter((a) => a.lotteryId === lottery.id),
    )
    return {
      lottery,
      apps,
      applicationsByUsageDate: groupApplicationsByUsageDate(apps),
    }
  })

  const lotteriesWithApps = applicationsByLottery.filter(({ apps }) => apps.length > 0)
  const isMultiLotteryView = lotteriesWithApps.length > 1

  const toggleLotteryExpanded = (lotteryId) => {
    setExpandedLotteryIds((prev) => {
      const next = new Set(prev)
      if (next.has(lotteryId)) next.delete(lotteryId)
      else next.add(lotteryId)
      return next
    })
  }

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

  const handleRunReapplyLottery = async () => {
    if (!selectedLottery) {
      setMessage('추첨을 선택해 주세요.')
      return
    }

    const lottery = state.lotteries.find((l) => l.id === selectedLottery)
    if (!lottery || lottery.status !== 'reapply') {
      setMessage('재신청 중인 추첨을 선택해 주세요.')
      return
    }

    const pendingReapplyCount = state.applications.filter(
      (a) =>
        a.lotteryId === selectedLottery &&
        a.status === 'pending' &&
        (lottery.vacantDates ?? []).includes(a.usageDate),
    ).length

    if (pendingReapplyCount === 0) {
      setMessage('재신청자가 없습니다.')
      return
    }

    if (
      window.confirm(
        `${lottery.name} 보충 추첨을 진행하시겠습니까?\n\n· 재신청 ${pendingReapplyCount}건\n· 재신청 가능 날짜 대상`,
      )
    ) {
      try {
        await dispatch({ type: 'RUN_REAPPLY_LOTTERY', payload: selectedLottery })
        setMessage('보충 추첨이 완료되었습니다.')
        setTimeout(() => setMessage(''), 3000)
      } catch (error) {
        setMessage(error.message || '보충 추첨에 실패했습니다.')
      }
    }
  }

  const handleCloseReapply = async () => {
    if (!selectedLottery) {
      setMessage('추첨을 선택해 주세요.')
      return
    }

    const lottery = state.lotteries.find((l) => l.id === selectedLottery)
    if (!lottery || lottery.status !== 'reapply') {
      setMessage('재신청 중인 추첨을 선택해 주세요.')
      return
    }

    if (
      window.confirm(
        `"${lottery.name}" 재신청을 마감하시겠습니까?\n재신청 가능 날짜: ${(lottery.vacantDates ?? []).join(', ') || '없음'}`,
      )
    ) {
      try {
        await dispatch({ type: 'CLOSE_REAPPLY', payload: selectedLottery })
        setMessage('재신청이 마감되었습니다.')
        setTimeout(() => setMessage(''), 3000)
      } catch (error) {
        setMessage(error.message || '재신청 마감에 실패했습니다.')
      }
    }
  }

  const handleDeleteLottery = (id) => {
    const lottery = state.lotteries.find((l) => l.id === id)
    if (window.confirm(`"${lottery?.name}" 추첨을 삭제하시겠습니까? 관련 신청도 함께 삭제됩니다.`)) {
      dispatch({ type: 'DELETE_LOTTERY', payload: id })
      if (selectedLottery === id) setSelectedLottery('')
    }
  }

  const selectedLotteryData = state.lotteries.find((l) => l.id === selectedLottery)
  const selectedWinnersPerDay = selectedLotteryData ? getWinnersPerDay(selectedLotteryData) : null
  const selectedVacantDates = selectedLotteryData?.vacantDates ?? []
  const selectedReapplyPendingCount = selectedLottery
    ? state.applications.filter(
        (a) =>
          a.lotteryId === selectedLottery &&
          a.status === 'pending' &&
          selectedVacantDates.includes(a.usageDate),
      ).length
    : 0

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
          <div>
            <h2 className="text-lg font-bold text-slate-800">전체 신청</h2>
            <p className="mt-1 text-sm text-slate-500">
              추첨 등록별 · 사용일별 신청 현황 (총 {state.applications.length}건)
              {isMultiLotteryView && ' · 추첨명을 클릭하면 신청 내역을 볼 수 있습니다'}
            </p>
          </div>
          {dataRefreshing && (
            <span className="text-sm text-teal-600">데이터 새로고침 중...</span>
          )}
        </div>

        {state.lotteries.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 추첨이 없습니다.</p>
        ) : applicationsByLottery.every(({ apps }) => apps.length === 0) ? (
          <p className="text-sm text-slate-400">신청 내역이 없습니다.</p>
        ) : (
          <div className="space-y-8">
            {applicationsByLottery.map(({ lottery, apps, applicationsByUsageDate: byDate }) => {
              if (apps.length === 0) return null

              const pendingCount = apps.filter((a) => a.status === 'pending').length
              const wonCount = apps.filter((a) => a.status === 'won').length
              const lostCount = apps.filter((a) => a.status === 'lost').length
              const winnersPerDay = getWinnersPerDay(lottery)
              const isExpanded = !isMultiLotteryView || expandedLotteryIds.has(lottery.id)

              return (
                <div key={lottery.id} className="rounded-xl border border-slate-200 p-5">
                  <button
                    type="button"
                    onClick={() => isMultiLotteryView && toggleLotteryExpanded(lottery.id)}
                    disabled={!isMultiLotteryView}
                    className={`mb-4 flex w-full flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4 text-left ${
                      isMultiLotteryView
                        ? 'cursor-pointer rounded-lg transition hover:bg-slate-50'
                        : 'cursor-default'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      {isMultiLotteryView && (
                        <span
                          className="mt-0.5 shrink-0 text-slate-400"
                          aria-hidden
                        >
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      )}
                      <div>
                        <h3 className="text-base font-bold text-slate-800">{lottery.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {lottery.startDate} ~ {lottery.endDate} ·{' '}
                          {getLotteryStatusLabel(lottery.status)} · 일 {winnersPerDay}명 당첨
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                        전체 <strong>{apps.length}</strong>건
                      </span>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                        대기 <strong>{pendingCount}</strong>
                      </span>
                      <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
                        당첨 <strong>{wonCount}</strong>
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        낙첨 <strong>{lostCount}</strong>
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                  <div className="space-y-8">
                    {byDate.map(([usageDate, dayApps]) => (
                      <div key={`${lottery.id}-${usageDate}`}>
                        <div className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-slate-100 pb-2">
                          <span className="text-sm font-semibold text-slate-800">{usageDate}</span>
                          <span className="text-sm text-slate-500">
                            신청{' '}
                            <strong className="font-medium text-slate-700">{dayApps.length}</strong>
                            건
                            <span className="mx-2 text-slate-300">|</span>
                            대기{' '}
                            <strong className="font-medium text-amber-700">
                              {dayApps.filter((a) => a.status === 'pending').length}
                            </strong>
                            · 당첨{' '}
                            <strong className="font-medium text-green-700">
                              {dayApps.filter((a) => a.status === 'won').length}
                            </strong>
                            /{winnersPerDay}
                            · 낙첨{' '}
                            <strong className="font-medium text-slate-600">
                              {dayApps.filter((a) => a.status === 'lost').length}
                            </strong>
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500">
                                <th className="pb-3 pr-4 font-medium">사번</th>
                                <th className="pb-3 pr-4 font-medium">성명</th>
                                <th className="pb-3 pr-4 font-medium">비고</th>
                                <th className="pb-3 font-medium">결과</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dayApps.map((app) => {
                                const status = statusLabel[app.status]
                                return (
                                  <tr key={app.id} className="border-b border-slate-100">
                                    <td className="py-3 pr-4 text-slate-600">{app.employeeId}</td>
                                    <td className="py-3 pr-4 text-slate-600">{app.name}</td>
                                    <td className="py-3 pr-4 text-slate-600">
                                      {app.remarks || '-'}
                                      {app.isReapply && (
                                        <span className="ml-2 text-xs text-orange-600">재신청</span>
                                      )}
                                    </td>
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
                    ))}
                  </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">추첨 실행</h2>
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
              {sortByCreatedAtDesc(state.lotteries).map((lottery) => (
                <option key={lottery.id} value={lottery.id}>
                  {lottery.name} ({getLotteryStatusLabel(lottery.status)})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleRunLottery}
            disabled={selectedLotteryData?.status !== 'open'}
            className="rounded-lg bg-orange-500 px-6 py-2.5 font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            추첨 실행
          </button>
        </div>
        {message && (
          <p className={`mt-4 text-sm ${message.includes('완료') || message.includes('마감') ? 'text-teal-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}
      </div>

      {selectedLotteryData?.status === 'reapply' && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-orange-200">
          <h2 className="text-lg font-bold text-slate-800">재신청 · 보충 추첨</h2>
          <p className="mt-2 text-sm text-slate-500">
            신청가능일수 − 당첨일수만큼 재신청 가능 · 신청자 없음 또는 일별 당첨인원 미달 날짜 대상.
            재신청을 받은 뒤 보충 추첨을
            실행하세요.
          </p>
          <p className="mt-3 text-sm text-slate-700">
            빈 날짜 ({selectedVacantDates.length}일):{' '}
            <span className="font-medium">{selectedVacantDates.join(', ') || '없음'}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            신청자 없음 또는 일별 당첨인원 미달 날짜 포함
          </p>
          <p className="mt-1 text-sm text-slate-700">
            재신청 대기: <span className="font-medium text-amber-700">{selectedReapplyPendingCount}건</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRunReapplyLottery}
              disabled={selectedReapplyPendingCount === 0}
              className="rounded-lg bg-orange-500 px-6 py-2.5 font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              보충 추첨 실행
            </button>
            <button
              type="button"
              onClick={handleCloseReapply}
              className="rounded-lg border border-slate-300 px-6 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              재신청 마감
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-4 font-semibold text-slate-800">추첨 관리</h3>
        {state.lotteries.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 추첨이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {sortByCreatedAtDesc(state.lotteries).map((lottery) => {
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
                      {lottery.startDate} ~ {lottery.endDate} · {getLotteryStatusLabel(lottery.status)} ·
                      신청 {appCount}건 · 당첨 {wonCount}건 · 일 {winnersPerDay}명
                      {lottery.vacantDates?.length > 0 &&
                        ` · 재신청 가능 ${lottery.vacantDates.length}일`}
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
    </div>
  )
}
