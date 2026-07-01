import { useState } from 'react'
import { useAlerts } from '../context/AlertsContext'

function Alerts() {
  const { alerts, loading, markRead } = useAlerts()
  const [filter, setFilter] = useState('all') // all | unread

  const visibleAlerts = filter === 'unread' ? alerts.filter((a) => !a.is_read) : alerts

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Alerts</h1>
        <div className="flex gap-1">
          {['all', 'unread'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-mono text-xs tracking-wide px-3 py-2 rounded-md border transition-colors ${
                filter === f
                  ? 'border-accent text-accent'
                  : 'border-panel-border text-ink-muted hover:text-ink'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="font-mono text-sm text-ink-muted">Loading alerts…</p>
      ) : visibleAlerts.length === 0 ? (
        <p className="font-mono text-sm text-ink-muted">
          {filter === 'unread' ? 'No unread alerts.' : 'No alerts recorded yet.'}
        </p>
      ) : (
        <div className="border border-panel-border bg-panel rounded-md divide-y divide-panel-border">
          {visibleAlerts.map((alert) => (
            <div key={alert.id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    alert.severity === 'critical'
                      ? 'bg-danger'
                      : alert.severity === 'warning'
                      ? 'bg-accent'
                      : 'bg-ink-muted'
                  }`}
                ></span>
                <div className="min-w-0">
                  <p className={`font-body text-sm truncate ${alert.is_read ? 'text-ink-muted' : 'text-ink'}`}>
                    {alert.message}
                  </p>
                  <p className="font-mono text-[10px] text-ink-muted">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              {!alert.is_read && (
                <button
                  onClick={() => markRead(alert.id)}
                  className="font-mono text-[10px] tracking-wide px-3 py-1.5 rounded-md border border-panel-border text-ink-muted hover:text-ink hover:border-ink transition-colors shrink-0"
                >
                  MARK READ
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Alerts