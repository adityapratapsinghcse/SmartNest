import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { alertsApi, unwrapList } from '../api/client'
import { useWebSocket } from '../hooks/useWebSocket'

const AlertsContext = createContext(null)

export function AlertsProvider({ children }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    alertsApi
      .list(false)
      .then((res) => setAlerts(unwrapList(res.data)))
      .catch((err) => console.error('Failed to fetch alerts:', err))
      .finally(() => setLoading(false))
  }, [])

  // One shared socket for the whole app instead of Navbar, AlertBanner, and
  // Alerts.jsx each opening their own — that's exactly why the badge and the
  // page disagreed after a mark-read: three independent copies of the same
  // state, updated in only one place at a time.
  const { isConnected } = useWebSocket('/ws/alerts/', {
    onMessage: (data) => {
      setAlerts((prev) => (prev.some((a) => a.id === data.id) ? prev : [data, ...prev]))
    },
  })

  const markRead = useCallback(async (alertId) => {
    try {
      await alertsApi.markRead(alertId)
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
      )
    } catch (err) {
      console.error('Failed to mark alert read:', err)
    }
  }, [])

  const unreadCount = alerts.filter((a) => !a.is_read).length

  return (
    <AlertsContext.Provider value={{ alerts, loading, isConnected, markRead, unreadCount }}>
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlerts() {
  const ctx = useContext(AlertsContext)
  if (!ctx) throw new Error('useAlerts must be used within an AlertsProvider')
  return ctx
}