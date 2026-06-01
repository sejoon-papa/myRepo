import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { getApplicationDays, getWinnersPerDay, sortByCreatedAtDesc } from '../utils/lottery'

export default function LotteryRegister() {
  const { state, dispatch } = useApp()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [applicationDays, setApplicationDays] = useState('')
  const [winnersPerDay, setWinnersPerDay] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !startDate || !endDate || !applicationDays || !winnersPerDay) return
    if (new Date(startDate) > new Date(endDate)) {
      setMessage('시작일은 종료일보다 이전이어야 합니다.')
      return
    }

    dispatch({
      type: 'ADD_LOTTERY',
      payload: {
        name: name.trim(),
        startDate,
        endDate,
        applicationDays: Number(applicationDays),
        winnersPerDay: Number(winnersPerDay),
      },
    })

    setName('')
    setStartDate('')
    setEndDate('')
    setApplicationDays('')
    setWinnersPerDay('')
    setMessage('추첨 항목이 등록되었습니다.')
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-6 text-lg font-bold text-slate-800">추첨 항목 등록</h2>

        <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">추첨명</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 2026년 상반기 휴양소 추첨"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">기간 시작</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">기간 종료</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">신청일수</label>
            <input
              type="number"
              min="1"
              value={applicationDays}
              onChange={(e) => setApplicationDays(e.target.value)}
              placeholder="예: 2"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
            <p className="mt-1 text-xs text-slate-500">1인당 신청 가능한 일수</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">일별 당첨인원</label>
            <input
              type="number"
              min="1"
              value={winnersPerDay}
              onChange={(e) => setWinnersPerDay(e.target.value)}
              placeholder="예: 2"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
            <p className="mt-1 text-xs text-slate-500">사용일(날짜)별 당첨 인원</p>
          </div>

          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-6 py-2.5 font-medium text-white transition hover:bg-teal-700"
            >
              등록하기
            </button>
          </div>
        </form>

        {message && (
          <p className={`mt-4 text-sm ${message.includes('등록') ? 'text-teal-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-4 font-semibold text-slate-800">등록된 추첨 목록</h3>
        {state.lotteries.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 추첨이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 pr-4 font-medium">추첨명</th>
                  <th className="pb-3 pr-4 font-medium">기간</th>
                  <th className="pb-3 pr-4 font-medium">신청일수</th>
                  <th className="pb-3 pr-4 font-medium">일별 당첨인원</th>
                  <th className="pb-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {sortByCreatedAtDesc(state.lotteries).map((lottery) => (
                  <tr key={lottery.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-800">{lottery.name}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {lottery.startDate} ~ {lottery.endDate}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{getApplicationDays(lottery)}일</td>
                    <td className="py-3 pr-4 text-slate-600">{getWinnersPerDay(lottery)}명</td>
                    <td className="py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          lottery.status === 'open'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {lottery.status === 'open' ? '신청중' : '마감'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
