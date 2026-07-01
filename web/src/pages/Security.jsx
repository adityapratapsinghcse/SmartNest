import { useEffect, useState, useCallback } from 'react'
import { accessApi, unwrapList } from '../api/client'
import { useCommand } from '../hooks/useCommand'
import { ESP32_DEVICE_ID } from '../config'

function Security() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const { state: unlockState, send } = useCommand()

  const fetchLogs = useCallback(() => {
    accessApi
      .log()
      .then((res) => setLogs(unwrapList(res.data)))
      .catch((err) => console.error('Failed to fetch access log:', err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const unlockLabel = {
    idle: 'UNLOCK DOOR',
    sending: 'SENDING…',
    sent: 'SENT ✓',
    error: 'FAILED — RETRY',
  }[unlockState]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Security</h1>
        <button
          onClick={() => send(ESP32_DEVICE_ID, 'unlock_door')}
          disabled={unlockState === 'sending'}
          className={`font-mono text-xs tracking-[0.2em] px-5 py-3 rounded-md border transition-colors ${
            unlockState === 'sent'
              ? 'border-safe text-safe'
              : unlockState === 'error'
              ? 'border-danger text-danger'
              : 'border-accent text-accent hover:bg-accent hover:text-deep disabled:opacity-50'
          }`}
        >
          {unlockLabel}
        </button>
      </div>

      <section>
        <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">ACCESS LOG</p>
        {loading ? (
          <p className="font-mono text-sm text-ink-muted">Loading access log…</p>
        ) : logs.length === 0 ? (
          <p className="font-mono text-sm text-ink-muted">No access attempts recorded yet.</p>
        ) : (
          <div className="border border-panel-border bg-panel rounded-md divide-y divide-panel-border">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full ${log.granted ? 'bg-safe' : 'bg-danger'}`}
                  ></span>
                  <div>
                    <p className="font-body text-sm text-ink">
                      {log.method === 'rfid' ? `RFID ${log.rfid_uid || '(unknown card)'}` : 'Keypad PIN'}
                    </p>
                    <p className="font-mono text-[10px] text-ink-muted">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-mono text-xs tracking-wide ${
                    log.granted ? 'text-safe' : 'text-danger'
                  }`}
                >
                  {log.granted ? 'GRANTED' : 'DENIED'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Security