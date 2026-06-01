import { useState } from 'react'
import { useApp } from '../context/AppContext'
import ReapplyDateCalendar from './ReapplyDateCalendar'
import {
  canApplyMoreToLottery,
  getApplicationDays,
  getAvailableVacantDatesForUser,
  getMaxOpenApplicationCount,
  getMaxReapplyCount,
  getMyApplicationsForLottery,
  getOpenApplicationCount,
  getReapplyDates,
  getRemainingReapplyCount,
  getWonCount,
  isReapplyEligible,
  isReapplyOpen,
  sortApplicationsByRecentLottery,
  sortByCreatedAtDesc,
} from '../utils/lottery'

const statusLabel = {
  pending: { text: '대기', className: 'bg-amber-100 text-amber-700' },
  won: { text: '당첨', className: 'bg-green-100 text-green-700' },
  lost: { text: '낙첨', className: 'bg-slate-100 text-slate-600' },
}

function validateApplication({ state, session, lotteryId, usageDate, excludeId, isReapply = false }) {
  const lottery = state.lotteries.find((l) => l.id === lotteryId)
  if (!lottery) return '추첨 정보를 찾을 수 없습니다.'

  if (isReapply) {
    if (lottery.status !== 'reapply') return '재신청 기간이 아닙니다.'
    if (!getReapplyDates(lottery, state.applications).includes(usageDate)) {
      return '재신청 가능한 사용일만 선택할 수 있습니다.'
    }
  } else if (lottery.status !== 'open') {
    return '마감된 추첨은 수정·취소할 수 없습니다.'
  }

  if (usageDate < lottery.startDate || usageDate > lottery.endDate) {
    return `사용일은 추첨 기간(${lottery.startDate} ~ ${lottery.endDate}) 안의 날짜로 선택해 주세요.`
  }

  const duplicate = state.applications.some(
    (a) =>
      a.lotteryId === lotteryId &&
      a.employeeId === session.employeeId &&
      a.usageDate === usageDate &&
      a.id !== excludeId,
  )
  if (duplicate) return '같은 사용일로는 한 번만 신청할 수 있습니다.'

  return null
}

export default function LotteryApply() {
  const { state, dispatch } = useApp()
  const { session } = state
  const [lotteryId, setLotteryId] = useState('')
  const [usageDate, setUsageDate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [editingId, setEditingId] = useState(null)
  const [editUsageDate, setEditUsageDate] = useState('')
  const [editRemarks, setEditRemarks] = useState('')
  const [reapplyLotteryId, setReapplyLotteryId] = useState('')
  const [reapplyUsageDate, setReapplyUsageDate] = useState('')
  const [reapplyRemarks, setReapplyRemarks] = useState('')

  const openLotteries = sortByCreatedAtDesc(state.lotteries.filter((l) => l.status === 'open'))
  const reapplyLotteries = sortByCreatedAtDesc(
    state.lotteries.filter(
      (l) => isReapplyOpen(l) && isReapplyEligible(state.applications, l, session.employeeId),
    ),
  )
  const myApplications = sortApplicationsByRecentLottery(
    state.applications.filter((a) => a.employeeId === session.employeeId),
    state.lotteries,
  )
  const selectedLottery = state.lotteries.find((l) => l.id === lotteryId)

  const selectedLotteryMaxDays = selectedLottery ? getMaxOpenApplicationCount(selectedLottery) : null
  const myOpenAppsForSelected = lotteryId
    ? myApplications.filter((a) => a.lotteryId === lotteryId && !a.isReapply)
    : []
  const selectedReapplyLottery = state.lotteries.find((l) => l.id === reapplyLotteryId)
  const reapplyPoolDates = selectedReapplyLottery
    ? getReapplyDates(selectedReapplyLottery, state.applications)
    : []
  const availableReapplyDates = selectedReapplyLottery
    ? getAvailableVacantDatesForUser(
        reapplyPoolDates,
        state.applications,
        reapplyLotteryId,
        session.employeeId,
      )
    : []
  const reapplyRemainingCount = selectedReapplyLottery
    ? getRemainingReapplyCount(selectedReapplyLottery, state.applications, session.employeeId)
    : 0
  const reapplyWonCount = selectedReapplyLottery
    ? getWonCount(getMyApplicationsForLottery(state.applications, reapplyLotteryId, session.employeeId))
    : 0
  const reapplyMaxCount = selectedReapplyLottery
    ? getMaxReapplyCount(selectedReapplyLottery, state.applications, session.employeeId)
    : 0

  const showMessage = (text, isSuccess = false) => {
    setMessage(text)
    setMessageType(isSuccess ? 'success' : 'error')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!lotteryId || !usageDate) return

    const lottery = state.lotteries.find((l) => l.id === lotteryId)
    if (!lottery) return

    if (!canApplyMoreToLottery(lottery, state.applications, session.employeeId)) {
      showMessage(`최대 ${getMaxOpenApplicationCount(lottery)}일까지 신청할 수 있습니다.`)
      return
    }

    const error = validateApplication({ state, session, lotteryId, usageDate })
    if (error) {
      showMessage(error)
      return
    }

    dispatch({
      type: 'ADD_APPLICATION',
      payload: {
        lotteryId,
        employeeId: session.employeeId,
        name: session.name,
        usageDate,
        remarks: remarks.trim(),
      },
    })

    setUsageDate('')
    setRemarks('')
    showMessage('추첨 신청이 완료되었습니다.', true)
  }

  const handleReapplySubmit = (e) => {
    e.preventDefault()
    if (!reapplyLotteryId || !reapplyUsageDate) return

    const lottery = state.lotteries.find((l) => l.id === reapplyLotteryId)
    if (!lottery) return

    if (!canApplyMoreToLottery(lottery, state.applications, session.employeeId)) {
      showMessage(
        `재신청 가능 횟수를 모두 사용했습니다. (최대 ${getMaxReapplyCount(lottery, state.applications, session.employeeId)}건)`,
      )
      return
    }

    if (!availableReapplyDates.includes(reapplyUsageDate)) {
      showMessage('검정색으로 표시된 신청 가능일만 선택할 수 있습니다.')
      return
    }

    dispatch({
      type: 'ADD_REAPPLY_APPLICATION',
      payload: {
        lotteryId: reapplyLotteryId,
        employeeId: session.employeeId,
        name: session.name,
        usageDate: reapplyUsageDate,
        remarks: reapplyRemarks.trim(),
      },
    })
      .then(() => {
        setReapplyUsageDate('')
        setReapplyRemarks('')
        showMessage('재신청이 완료되었습니다.', true)
      })
      .catch((error) => {
        showMessage(error.message || '재신청에 실패했습니다.')
      })
  }

  const startEdit = (app) => {
    setEditingId(app.id)
    setEditUsageDate(app.usageDate)
    setEditRemarks(app.remarks || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditUsageDate('')
    setEditRemarks('')
  }

  const handleCloseEdit = (app) => {
    const origRemarks = app.remarks || ''
    const changed =
      editUsageDate !== app.usageDate || editRemarks.trim() !== origRemarks.trim()
    if (changed) {
      if (!window.confirm('저장하지 않은 변경 사항이 있습니다. 편집을 종료하시겠습니까?')) {
        return
      }
    }
    cancelEdit()
  }

  const handleSaveEdit = (app) => {
    if (!editUsageDate) {
      showMessage('사용일을 선택해 주세요.')
      return
    }

    const error = validateApplication({
      state,
      session,
      lotteryId: app.lotteryId,
      usageDate: editUsageDate,
      excludeId: app.id,
      isReapply: app.isReapply,
    })
    if (error) {
      showMessage(error)
      return
    }

    const remarksTrim = editRemarks.trim()
    if (
      !window.confirm(
        `다음 내용으로 신청을 수정합니다.\n\n사용일: ${editUsageDate}\n비고: ${remarksTrim || '(없음)'}\n\n저장하시겠습니까?`,
      )
    ) {
      return
    }

    dispatch({
      type: 'UPDATE_APPLICATION',
      payload: {
        id: app.id,
        usageDate: editUsageDate,
        remarks: editRemarks,
      },
    })

    cancelEdit()
    showMessage('신청 내용이 수정되었습니다.', true)
  }

  const handleCancelApplication = (app) => {
    const lottery = state.lotteries.find((l) => l.id === app.lotteryId)
    const isOpenApplication = lottery?.status === 'open'
    const isReapplyApplication = lottery?.status === 'reapply' && app.isReapply

    if (!isOpenApplication && !isReapplyApplication) {
      showMessage('마감된 추첨은 취소할 수 없습니다.')
      return
    }
    if (app.status !== 'pending') {
      showMessage('추첨이 완료된 신청은 취소할 수 없습니다.')
      return
    }

    if (
      !window.confirm(
        `다음 신청을 취소합니다.\n\n추첨: ${getLotteryName(app.lotteryId)}\n사용일: ${app.usageDate}\n\n취소 후에는 복구할 수 없습니다. 계속하시겠습니까?`,
      )
    ) {
      return
    }

    dispatch({ type: 'CANCEL_APPLICATION', payload: app.id })
    if (editingId === app.id) cancelEdit()
    showMessage('신청이 취소되었습니다.', true)
  }

  const canModify = (app) => {
    const lottery = state.lotteries.find((l) => l.id === app.lotteryId)
    if (app.status !== 'pending') return false
    if (lottery?.status === 'open') return true
    return lottery?.status === 'reapply' && app.isReapply
  }

  const getLotteryName = (id) => state.lotteries.find((l) => l.id === id)?.name ?? '-'
  const getLottery = (id) => state.lotteries.find((l) => l.id === id)

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-2 text-lg font-bold text-slate-800">추첨 신청</h2>
        <p className="mb-6 text-sm text-slate-500">
          추첨별 신청일수에서 당첨일수만큼 뺀 만큼 신청 가능 · 같은 사용일은 중복 신청할 수
          없습니다 · 대기 상태에서만 수정·취소 가능
          {selectedLotteryMaxDays != null && (
            <>
              {' '}
              · 선택한 추첨: {myOpenAppsForSelected.length}/{selectedLotteryMaxDays}일 신청
            </>
          )}
        </p>

        {openLotteries.length === 0 ? (
          <p className="text-sm text-slate-500">현재 신청 가능한 추첨이 없습니다.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">추첨 선택</label>
              <select
                value={lotteryId}
                onChange={(e) => {
                  setLotteryId(e.target.value)
                  setUsageDate('')
                }}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">추첨을 선택하세요</option>
                {openLotteries.map((lottery) => (
                  <option key={lottery.id} value={lottery.id}>
                    {lottery.name} ({lottery.startDate} ~ {lottery.endDate})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">사용일</label>
              <input
                type="date"
                value={usageDate}
                min={selectedLottery?.startDate}
                max={selectedLottery?.endDate}
                onChange={(e) => setUsageDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
              {selectedLottery && (
                <p className="mt-1 text-xs text-slate-500">
                  선택 가능: {selectedLottery.startDate} ~ {selectedLottery.endDate}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">비고</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder="추가 요청사항이 있으면 입력해 주세요"
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={!lotteryId || !usageDate}
              className="rounded-lg bg-teal-600 px-6 py-2.5 font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              신청하기
            </button>
          </form>
        )}

        {message && (
          <p className={`mt-4 text-sm ${messageType === 'success' ? 'text-teal-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}
      </div>

      {reapplyLotteries.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-2 text-lg font-bold text-slate-800">재신청</h2>
          <p className="mb-6 text-sm text-slate-500">
            신청가능일수에서 당첨일수를 뺀 만큼 재신청할 수 있습니다. (예: 3일 가능 · 1일
            당첨 → 2일 재신청) 재신청 가능일은 신청자가 없거나 일별 당첨인원이 채워지지 않은
            날입니다.
          </p>

          <form onSubmit={handleReapplySubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">추첨 선택</label>
              <select
                value={reapplyLotteryId}
                onChange={(e) => {
                  setReapplyLotteryId(e.target.value)
                  setReapplyUsageDate('')
                }}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">추첨을 선택하세요</option>
                {reapplyLotteries.map((lottery) => (
                  <option key={lottery.id} value={lottery.id}>
                    {lottery.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedReapplyLottery && (
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                신청가능 {getApplicationDays(selectedReapplyLottery)}일 − 당첨 {reapplyWonCount}일
                = 재신청 가능 <strong>{reapplyMaxCount}</strong>건 · 남은 횟수{' '}
                <strong>{reapplyRemainingCount}</strong>건
              </div>
            )}

            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">사용일 선택</label>
              {selectedReapplyLottery ? (
                <ReapplyDateCalendar
                  startDate={selectedReapplyLottery.startDate}
                  endDate={selectedReapplyLottery.endDate}
                  availableDates={availableReapplyDates}
                  value={reapplyUsageDate}
                  onChange={setReapplyUsageDate}
                  disabled={reapplyRemainingCount === 0 || availableReapplyDates.length === 0}
                />
              ) : (
                <p className="text-sm text-slate-400">추첨을 먼저 선택해 주세요.</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">비고</label>
              <textarea
                value={reapplyRemarks}
                onChange={(e) => setReapplyRemarks(e.target.value)}
                rows={3}
                placeholder="추가 요청사항이 있으면 입력해 주세요"
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={
                !reapplyLotteryId ||
                !reapplyUsageDate ||
                reapplyRemainingCount === 0 ||
                availableReapplyDates.length === 0
              }
              className="rounded-lg bg-orange-500 px-6 py-2.5 font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              재신청하기
            </button>
          </form>
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-4 font-semibold text-slate-800">내 신청 내역</h3>
        {myApplications.length === 0 ? (
          <p className="text-sm text-slate-400">신청 내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 pr-4 font-medium">추첨명</th>
                  <th className="pb-3 pr-4 font-medium">사용일</th>
                  <th className="pb-3 pr-4 font-medium">비고</th>
                  <th className="pb-3 pr-4 font-medium">결과</th>
                  <th className="pb-3 font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {myApplications.map((app) => {
                  const status = statusLabel[app.status]
                  const lottery = getLottery(app.lotteryId)
                  const isEditing = editingId === app.id
                  const editable = canModify(app)

                  if (isEditing) {
                    return (
                      <tr key={app.id} className="border-b border-slate-100 bg-teal-50/50">
                        <td className="py-3 pr-4 text-slate-800">{getLotteryName(app.lotteryId)}</td>
                        <td className="py-3 pr-4">
                          {app.isReapply ? (
                            (() => {
                              const editVacantDates = getAvailableVacantDatesForUser(
                                getReapplyDates(lottery, state.applications),
                                state.applications,
                                app.lotteryId,
                                session.employeeId,
                                app.id,
                              )
                              return (
                                <div className="min-w-[220px]">
                                  <ReapplyDateCalendar
                                    compact
                                    startDate={lottery?.startDate}
                                    endDate={lottery?.endDate}
                                    availableDates={editVacantDates}
                                    value={editUsageDate}
                                    onChange={setEditUsageDate}
                                  />
                                </div>
                              )
                            })()
                          ) : (
                            <input
                              type="date"
                              value={editUsageDate}
                              min={lottery?.startDate}
                              max={lottery?.endDate}
                              onChange={(e) => setEditUsageDate(e.target.value)}
                              className="rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-teal-500"
                            />
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <input
                            type="text"
                            value={editRemarks}
                            onChange={(e) => setEditRemarks(e.target.value)}
                            placeholder="비고"
                            className="w-full min-w-[120px] rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-teal-500"
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                          >
                            {status.text}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(app)}
                              className="rounded bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCloseEdit(app)}
                              className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                            >
                              닫기
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={app.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 text-slate-800">{getLotteryName(app.lotteryId)}</td>
                      <td className="py-3 pr-4 text-slate-600">
                        {app.usageDate}
                        {app.isReapply && (
                          <span className="ml-2 text-xs text-orange-600">재신청</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{app.remarks || '-'}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                        >
                          {status.text}
                        </span>
                      </td>
                      <td className="py-3">
                        {editable ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(app)}
                              className="rounded border border-teal-200 px-2.5 py-1 text-xs text-teal-700 hover:bg-teal-50"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelApplication(app)}
                              className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
