import { useEffect, useState, useCallback } from 'react'
import { useSensors } from '../hooks/useSensors'
import { alertsApi, mlApi, unwrapList } from '../api/client'
import { GAS_WARNING_PPM, GAS_DANGER_PPM } from '../config'

const SAFETY_TYPES = ['gas_leak', 'fire', 'smoke', 'co', 'water_leak']

function isSafetyAlert(alert) {
  return SAFETY_TYPES.some((t) => alert.type?.toLowerCase().includes(t))
    || alert.severity === 'critical'
}

function Safety() {
  const { readings, loading: sensorsLoading, isConnected } = useSensors()
  const [safetyAlerts, setSafetyAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [gasPrediction, setGasPrediction] = useState(null)
  const [mlLoading, setMlLoading] = useState(true)

  const fetchAlerts = useCallback(() => {
    alertsApi
      .list(false)
      .then((res) => setSafetyAlerts(unwrapList(res.data).filter(isSafetyAlert)))
      .catch((err) => console.error('Failed to fetch safety alerts:', err))
      .finally(() => setAlertsLoading(false))
  }, [])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  useEffect(() => {
    mlApi
      .gas()
      .then((res) => setGasPrediction(res.data))
      .catch((err) => console.error('Failed to fetch gas prediction:', err))
      .finally(() => setMlLoading(false))
  }, [])

  const gasValue = readings.gas?.value
  const gasStatus = gasValue > GAS_DANGER_PPM ? 'danger' : gasValue > GAS_WARNING_PPM ? 'warning' : 'safe'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Safety</h1>
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
          <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">MQ-2 GAS LEVEL</p>
          <div
            className={`font-mono text-4xl font-medium ${
              gasStatus === 'danger' ? 'text-danger' : gasStatus === 'warning' ? 'text-accent' : 'text-safe'
            }`}
          >
            {sensorsLoading ? '--' : gasValue ?? '--'}
            <span className="text-base text-ink-muted ml-1">ppm</span>
          </div>
          <p className="font-mono text-[10px] text-ink-muted mt-3">
            UPDATED {readings.gas?.timestamp ? new Date(readings.gas.timestamp).toLocaleTimeString() : '—'}
          </p>
        </div>

      <div className="border border-panel-border bg-panel rounded-md px-5 py-4">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">CLASSIFIER PREDICTION</p>
          {mlLoading ? (
            <p className="font-mono text-sm text-ink-muted">Checking model…</p>
          ) : gasPrediction?.status === 'not_trained_yet' ? (
            <>
              <div className="font-mono text-lg font-medium text-ink-muted uppercase">
                NOT TRAINED
              </div>
              <p className="font-mono text-[10px] text-ink-muted mt-3">
                {gasPrediction.message}
              </p>
            </>
          ) : gasPrediction ? (
            <>
              <div className="font-mono text-2xl font-medium text-accent uppercase">
                {gasPrediction.prediction ?? 'unknown'}
              </div>
              {gasPrediction.confidence !== undefined && (
                <p className="font-mono text-[10px] text-ink-muted mt-3">
                  CONFIDENCE {(gasPrediction.confidence * 100).toFixed(0)}%
                </p>
              )}
            </>
          ) : (
            <p className="font-mono text-sm text-ink-muted">No prediction available.</p>
          )}
        </div>
      </div>
      <section>
        <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">SAFETY ALERTS</p>
        {alertsLoading ? (
          <p className="font-mono text-sm text-ink-muted">Loading…</p>
        ) : safetyAlerts.length === 0 ? (
          <p className="font-mono text-sm text-ink-muted">No safety alerts recorded.</p>
        ) : (
          <div className="border border-panel-border bg-panel rounded-md divide-y divide-panel-border">
            {safetyAlerts.map((alert) => (
              <div key={alert.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      alert.severity === 'critical' ? 'bg-danger' : 'bg-accent'
                    }`}
                  ></span>
                  <p className="font-body text-sm text-ink">{alert.message}</p>
                </div>
                <span className="font-mono text-[10px] text-ink-muted">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
export default Safety