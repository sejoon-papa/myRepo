import { useApp } from '../context/AppContext'
import SiteFooter from './SiteFooter'

const tabs = [
  { id: 'apply', label: '추첨 신청', adminOnly: false },
  { id: 'register', label: '추첨 등록', adminOnly: true },
  { id: 'users', label: '사용자 관리', adminOnly: true },
  { id: 'admin', label: '관리자', adminOnly: true },
]

export default function Layout({ activeTab, onTabChange, children }) {
  const { state, dispatch } = useApp()
  const { session } = state
  const isAdmin = session?.isAdmin

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin)

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="bg-gradient-to-r from-teal-700 to-cyan-700 text-white shadow-lg">
        <div className="mx-auto max-w-4xl px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">휴양소 추첨 시스템</h1>
              {session && (
                <p className="mt-1 text-sm text-teal-100">
                  {session.name} ({session.employeeId})
                  {isAdmin && ' · 관리자'}
                </p>
              )}
            </div>
            {session && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'LOGOUT' })}
                className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/25"
              >
                로그아웃
              </button>
            )}
          </div>
        </div>
      </header>

      {session && isAdmin && (
        <nav className="border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-4xl gap-1 px-4">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      <SiteFooter />
    </div>
  )
}
