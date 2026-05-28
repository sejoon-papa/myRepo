import { useRef, useState } from 'react'
import { useApp } from '../context/AppContext'

export default function LoginPage() {
  const { state, dispatch } = useApp()
  const [employeeId, setEmployeeId] = useState('')
  const [name, setName] = useState('')
  const nameInputRef = useRef(null)

  const [message, setMessage] = useState('')
  const [idError, setIdError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    dispatch({ type: 'CLEAR_LOGIN_ERROR' })
    setIdError('')

    if (!/^\d{5}$/.test(employeeId)) {
      setIdError('사번은 5자리 숫자여야 합니다.')
      return
    }
    if (!name.trim()) return

    dispatch({ type: 'LOGIN', payload: { employeeId, name: name.trim() } })
  }

  const showIdError = idError || (employeeId && !/^\d{5}$/.test(employeeId))

  const handleNameFocus = () => {
    const input = nameInputRef.current
    if (!input) return
    input.lang = 'ko'
    input.setAttribute('inputmode', 'text')
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-3xl">
            🏖️
          </div>
          <h2 className="text-xl font-bold text-slate-800">로그인</h2>
          <p className="mt-2 text-sm text-slate-500">사번 5자리와 성명을 입력해 주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="employeeId" className="mb-1.5 block text-sm font-medium text-slate-700">
              사번 (5자리)
            </label>
            <input
              id="employeeId"
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value.replace(/\D/g, ''))}
              placeholder="12345"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
            {showIdError && (
              <p className="mt-1 text-sm text-red-500">
                {idError || '사번은 5자리 숫자여야 합니다.'}
              </p>
            )}
          </div>

          <div lang="ko">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              성명
            </label>
            <input
              ref={nameInputRef}
              id="name"
              type="text"
              lang="ko"
              inputMode="text"
              autoComplete="name"
              autoCapitalize="off"
              spellCheck={false}
              value={name}
              onFocus={handleNameFocus}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {state.loginError && (
            <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {state.loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={!employeeId || !name.trim() || !/^\d{5}$/.test(employeeId)}
            className="w-full rounded-lg bg-teal-600 py-3 font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            로그인
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          등록된 사번·성명으로만 로그인할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
