import { createContext, useContext, useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

const AppContext = createContext(null)

const DEFAULT_DATA = {
  users: [{ employeeId: '00000', name: '관리자', isAdmin: true }],
  lotteries: [],
  applications: [],
  session: null,
  loginError: null,
}

export function AppProvider({ children }) {
  const [state, setState] = useState(DEFAULT_DATA)
  const [loading, setLoading] = useState(true)
  const [dataRefreshing, setDataRefreshing] = useState(false)

  const refreshState = async ({ preserveSession = false } = {}) => {
    if (preserveSession) {
      setDataRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await apiRequest('/api/state')
      setState((prev) => ({
        ...prev,
        users: data.users,
        lotteries: data.lotteries,
        applications: data.applications,
        session: preserveSession ? prev.session : null,
        loginError: null,
      }))
    } finally {
      setLoading(false)
      setDataRefreshing(false)
    }
  }

  const mergeApiState = (prev, data) => ({
    ...prev,
    users: data.users ?? prev.users,
    lotteries: data.lotteries ?? prev.lotteries,
    applications: data.applications ?? prev.applications,
    session: Object.prototype.hasOwnProperty.call(data, 'session') ? data.session : prev.session,
    loginError: null,
  })

  useEffect(() => {
    refreshState()
  }, [])

  const dispatch = async (action) => {
    if (action.type === 'CLEAR_LOGIN_ERROR') {
      setState((prev) => ({ ...prev, loginError: null }))
      return
    }

    try {
      let nextState = null

      switch (action.type) {
        case 'LOGIN': {
          nextState = await apiRequest('/api/login', {
            method: 'POST',
            body: action.payload,
          })
          break
        }
        case 'LOGOUT': {
          nextState = await apiRequest('/api/logout', { method: 'POST' })
          break
        }
        case 'ADD_LOTTERY': {
          nextState = await apiRequest('/api/lotteries', {
            method: 'POST',
            body: action.payload,
          })
          break
        }
        case 'DELETE_LOTTERY': {
          nextState = await apiRequest(`/api/lotteries/${action.payload}`, {
            method: 'DELETE',
          })
          break
        }
        case 'ADD_APPLICATION': {
          nextState = await apiRequest('/api/applications', {
            method: 'POST',
            body: action.payload,
          })
          break
        }
        case 'ADD_REAPPLY_APPLICATION': {
          nextState = await apiRequest('/api/applications/reapply', {
            method: 'POST',
            body: action.payload,
          })
          break
        }
        case 'UPDATE_APPLICATION': {
          nextState = await apiRequest(`/api/applications/${action.payload.id}`, {
            method: 'PUT',
            body: action.payload,
          })
          break
        }
        case 'CANCEL_APPLICATION': {
          nextState = await apiRequest(`/api/applications/${action.payload}`, {
            method: 'DELETE',
          })
          break
        }
        case 'RUN_LOTTERY': {
          nextState = await apiRequest(`/api/lotteries/${action.payload}/run`, {
            method: 'POST',
          })
          break
        }
        case 'RUN_REAPPLY_LOTTERY': {
          nextState = await apiRequest(`/api/lotteries/${action.payload}/run-reapply`, {
            method: 'POST',
          })
          break
        }
        case 'CLOSE_REAPPLY': {
          nextState = await apiRequest(`/api/lotteries/${action.payload}/close-reapply`, {
            method: 'POST',
          })
          break
        }
        case 'ADD_USER': {
          nextState = await apiRequest('/api/users', {
            method: 'POST',
            body: action.payload,
          })
          break
        }
        case 'DELETE_USER': {
          nextState = await apiRequest(`/api/users/${action.payload}`, {
            method: 'DELETE',
          })
          break
        }
        default:
          return
      }

      setState((prev) => {
        const merged = mergeApiState(prev, nextState)
        if (action.type !== 'LOGIN' && action.type !== 'LOGOUT') {
          merged.session = prev.session
        }
        return merged
      })
    } catch (error) {
      const message = error.message || '요청 처리 중 오류가 발생했습니다.'
      setState((prev) => ({
        ...prev,
        loginError: message,
      }))
      throw error
    }
  }

  return (
    <AppContext.Provider value={{ state, dispatch, loading, dataRefreshing, refreshState }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
