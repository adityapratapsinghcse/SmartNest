import { useEffect, useState, useCallback } from 'react'
import { useSensors } from '../hooks/useSensors'
import { sensorsApi, unwrapList } from '../api/client'
import { useCommand } from '../hooks/useCommand'
import Chart from '../components/Chart'
import { ESP32_DEVICE_ID, TEMP_THRESHOLD_C } from '../config'

function formatHistory(readings) {
  return readings.map((r) => ({
    label: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: r.value,
  }))
}

function Climate() {
  const { readings, loading, isConnected } = useSensors()
  const [tempHistory, setTempHistory] = useState([])
  const [humidityHistory, setHumidityHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const { state: fanState, send } = useCommand()

  const fetchHistory = useCallback(() => {
    Promise.all([
      sensorsApi.history('temperature', { limit: 20 }),
      sensorsApi.history('humidity', { limit: 20 }),
    ])
      .then(([tempRes, humRes]) => {
        setTempHistory(formatHistory(unwrapList(tempRes.data)))
        setHumidityHistory(formatHistory(unwrapList(humRes.data)))
      })
      .catch((err) => console.error('Failed to fetch climate history:', err))
      .finally(() => setHistoryLoading(false))
  }, [])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const currentTemp = readings.temperature?.value
  const isOverThreshold = currentTemp !== undefined && currentTemp > TEMP_THRESHOLD_C

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Climate</h1>
        <div className="flex items-center gap-2 font-mono text-xs text-ink-muted">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-safe shadow-[0_0_8px] shadow-safe' : 'bg-danger'
            }`}
          ></span>
          {isConnected ? 'LIVE' : 'RECONNECTING'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="border border-panel-border bg-panel rounded-md px-5 py-4">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">TEMPERATURE</p>
          <div className={`font-mono text-4xl font-medium ${isOverThreshold ? 'text-danger' : 'text-accent'}`}>
            {loading ? '--' : currentTemp ?? '--'}
            <span className="text-base text-ink-muted ml-1">°C</span>
          </div>
          <p className="font-mono text-[10px] text-ink-muted mt-3">
            AUTO-FAN THRESHOLD: {TEMP_THRESHOLD_C}°C
          </p>
        </div>
        <div className="border border-panel-border bg-panel rounded-md px-5 py-4">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">HUMIDITY</p>
          <div className="font-mono text-4xl font-medium text-accent">
            {loading ? '--' : readings.humidity?.value ?? '--'}
            <span className="text-base text-ink-muted ml-1">%</span>
          </div>
          <p className="font-mono text-[10px] text-ink-muted mt-3">
            UPDATED {readings.humidity?.timestamp ? new Date(readings.humidity.timestamp).toLocaleTimeString() : '—'}
          </p>
        </div>
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-muted">FAN CONTROL</p>
          <p className="font-mono text-[10px] text-ink-muted">
            Manual override — shows command sent, not confirmed hardware state
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => send(ESP32_DEVICE_ID, 'fan_on')}
            disabled={fanState === 'sending'}
            className="font-mono text-xs tracking-[0.2em] px-5 py-3 rounded-md border border-safe text-safe hover:bg-safe hover:text-deep transition-colors disabled:opacity-50"
          >
            {fanState === 'sending' ? 'SENDING…' : 'FAN ON'}
          </button>
          <button
            onClick={() => send(ESP32_DEVICE_ID, 'fan_off')}
            disabled={fanState === 'sending'}
            className="font-mono text-xs tracking-[0.2em] px-5 py-3 rounded-md border border-panel-border text-ink-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-50"
          >
            {fanState === 'sending' ? 'SENDING…' : 'FAN OFF'}
          </button>
          {fanState === 'sent' && (
            <span className="font-mono text-xs text-safe self-center">SENT ✓</span>
          )}
          {fanState === 'error' && (
            <span className="font-mono text-xs text-danger self-center">FAILED — RETRY</span>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">TEMPERATURE HISTORY</p>
          <div className="border border-panel-border bg-panel rounded-md px-4 py-4">
            {historyLoading ? (
              <p className="font-mono text-sm text-ink-muted">Loading…</p>
            ) : tempHistory.length === 0 ? (
              <p className="font-mono text-sm text-ink-muted">No temperature history yet.</p>
            ) : (
              <Chart data={tempHistory} unit="°C" />
            )}
          </div>
        </div>
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">HUMIDITY HISTORY</p>
          <div className="border border-panel-border bg-panel rounded-md px-4 py-4">
            {historyLoading ? (
              <p className="font-mono text-sm text-ink-muted">Loading…</p>
            ) : humidityHistory.length === 0 ? (
              <p className="font-mono text-sm text-ink-muted">No humidity history yet.</p>
            ) : (
              <Chart data={humidityHistory} unit="%" />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Climate