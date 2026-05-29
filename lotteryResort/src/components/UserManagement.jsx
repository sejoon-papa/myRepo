import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function UserManagement() {
  const { state, dispatch } = useApp()
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [newName, setNewName] = useState('')
  const [newIsAdmin, setNewIsAdmin] = useState(false)
  const [userMessage, setUserMessage] = useState('')

  const sortedUsers = [...state.users].sort((a, b) => a.employeeId.localeCompare(b.employeeId))

  const handleAddUser = async (e) => {
    e.preventDefault()
    setUserMessage('')

    if (!/^\d{5}$/.test(newEmployeeId)) {
      setUserMessage('사번은 5자리 숫자여야 합니다.')
      return
    }
    if (!newName.trim()) {
      setUserMessage('성명을 입력해 주세요.')
      return
    }

    try {
      await dispatch({
        type: 'ADD_USER',
        payload: {
          employeeId: newEmployeeId,
          name: newName.trim(),
          isAdmin: newIsAdmin,
        },
      })
      setNewEmployeeId('')
      setNewName('')
      setNewIsAdmin(false)
      setUserMessage('사용자가 등록되었습니다.')
      setTimeout(() => setUserMessage(''), 3000)
    } catch (error) {
      setUserMessage(error.message || '사용자 등록에 실패했습니다.')
    }
  }

  const handleDeleteUser = async (user) => {
    if (
      !window.confirm(
        `"${user.name}" (${user.employeeId}) 사용자를 삭제하시겠습니까?\n해당 사용자의 신청 내역도 함께 삭제됩니다.`,
      )
    ) {
      return
    }

    setUserMessage('')
    try {
      await dispatch({ type: 'DELETE_USER', payload: user.employeeId })
      setUserMessage('사용자가 삭제되었습니다.')
      setTimeout(() => setUserMessage(''), 3000)
    } catch (error) {
      setUserMessage(error.message || '사용자 삭제에 실패했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">등록 사용자</p>
        <p className="mt-1 text-2xl font-bold text-slate-800">{state.users.length}명</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-bold text-slate-800">사용자 관리</h2>
        <p className="mt-1 text-sm text-slate-500">
          로그인 가능한 사용자를 등록·삭제합니다. 사번은 5자리 숫자입니다.
        </p>

        <form onSubmit={handleAddUser} className="mt-6 flex flex-wrap items-end gap-4">
          <div className="min-w-[120px]">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">사번</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={newEmployeeId}
              onChange={(e) => setNewEmployeeId(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="12345"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">성명</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="홍길동"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <label className="flex items-center gap-2 pb-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={newIsAdmin}
              onChange={(e) => setNewIsAdmin(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            관리자 권한
          </label>
          <button
            type="submit"
            className="rounded-lg bg-teal-600 px-6 py-2.5 font-medium text-white transition hover:bg-teal-700"
          >
            사용자 추가
          </button>
        </form>
        {userMessage && (
          <p
            className={`mt-4 text-sm ${userMessage.includes('되었습니다') ? 'text-teal-600' : 'text-red-500'}`}
          >
            {userMessage}
          </p>
        )}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 pr-4 font-medium">사번</th>
                <th className="pb-3 pr-4 font-medium">성명</th>
                <th className="pb-3 pr-4 font-medium">권한</th>
                <th className="pb-3 font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <tr key={user.employeeId} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium text-slate-800">{user.employeeId}</td>
                  <td className="py-3 pr-4 text-slate-600">{user.name}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.isAdmin
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {user.isAdmin ? '관리자' : '일반'}
                    </span>
                  </td>
                  <td className="py-3">
                    {user.employeeId === '00000' ? (
                      <span className="text-xs text-slate-400">삭제 불가</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50"
                      >
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
