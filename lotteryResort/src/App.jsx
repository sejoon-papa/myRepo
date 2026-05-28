import { useEffect, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/Layout'
import LoginPage from './components/LoginPage'
import LotteryApply from './components/LotteryApply'
import LotteryRegister from './components/LotteryRegister'
import AdminPanel from './components/AdminPanel'
import { useBlockBrowserBack } from './hooks/useBlockBrowserBack'
import SiteFooter from './components/SiteFooter'

function AppContent() {
  const { state, loading, refreshState } = useApp()
  const [activeTab, setActiveTab] = useState('apply')
  const isAdmin = state.session?.isAdmin

  useEffect(() => {
    if (!isAdmin) {
      setActiveTab('apply')
    }
  }, [isAdmin])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'admin') {
      refreshState({ preserveSession: true })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">불러오는 중...</p>
      </div>
    )
  }

  if (!state.session) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <header className="bg-gradient-to-r from-teal-700 to-cyan-700 px-4 py-5 text-white shadow-lg">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-2xl font-bold tracking-tight">추첨 시스템</h1>
          </div>
        </header>
        <div className="flex-1">
          <LoginPage />
        </div>
        <SiteFooter />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <Layout activeTab="apply" onTabChange={setActiveTab}>
        <LotteryApply />
      </Layout>
    )
  }

  return (
    <Layout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'apply' && <LotteryApply />}
      {activeTab === 'register' && <LotteryRegister />}
      {activeTab === 'admin' && <AdminPanel />}
    </Layout>
  )
}

export default function App() {
  useBlockBrowserBack()

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
