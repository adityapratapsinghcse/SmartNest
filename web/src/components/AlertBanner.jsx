import { useAlerts } from '../context/AlertsContext'

const severityStyles = {
  critical: 'border-danger text-danger',
  warning: 'border-accent text-accent',
  info: 'border-panel-border text-ink-muted',
}

function AlertBanner() {
  const { alerts } = useAlerts()
  const unread = alerts.filter((a) => !a.is_read)

  if (unread.length === 0) return null

  return (
    <div className="mb-6 space-y-2">
      {unread.slice(0, 3).map((alert) => (
        <div
          key={alert.id}
          className={`border rounded-md px-4 py-3 font-mono text-xs flex items-center justify-between ${
            severityStyles[alert.severity] || severityStyles.info
          }`}
        >
          <span>{alert.message}</span>
          <span className="text-ink-muted">
            {new Date(alert.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export default AlertBanner