import { useEffect, useState, useMemo } from 'react'
import { energyApi, unwrapList } from '../api/client'
import Chart from '../components/Chart'

function Energy() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    energyApi
      .daily()
      .then((res) => setLogs(unwrapList(res.data)))
      .catch((err) => console.error('Failed to fetch energy logs:', err))
      .finally(() => setLoading(false))
  }, [])

  // No aggregation endpoint exists yet (EnergyService is an empty placeholder
  // on the backend), so today's total and the per-device breakdown are derived
  // here from the raw log rows rather than trusting a forecast the API doesn't
  // provide.
  const { todayTotal, byDevice, chartData } = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const todayLogs = logs.filter((l) => l.date === todayStr)
    const total = todayLogs.reduce((sum, l) => sum + l.estimated_kwh, 0)

    const deviceMap = {}
    logs.forEach((l) => {
      if (!deviceMap[l.device_name]) deviceMap[l.device_name] = 0
      deviceMap[l.device_name] += l.estimated_kwh
    })

    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
    const chart = sorted.map((l) => ({
      label: new Date(l.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      value: l.estimated_kwh,
    }))

    return {
      todayTotal: total,
      byDevice: Object.entries(deviceMap).sort((a, b) => b[1] - a[1]),
      chartData: chart,
    }
  }, [logs])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Energy</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="border border-panel-border bg-panel rounded-md px-5 py-4">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">TODAY'S USAGE</p>
          <div className="font-mono text-4xl font-medium text-accent">
            {loading ? '--' : todayTotal.toFixed(2)}
            <span className="text-base text-ink-muted ml-1">kWh</span>
          </div>
          <p className="font-mono text-[10px] text-ink-muted mt-3">
            SUMMED FROM {logs.filter((l) => l.date === new Date().toISOString().slice(0, 10)).length} LOG ROW(S)
          </p>
        </div>
        <div className="border border-panel-border bg-panel rounded-md px-5 py-4">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">FORECAST</p>
          <div className="font-mono text-lg font-medium text-ink-muted">
            NOT AVAILABLE
          </div>
          <p className="font-mono text-[10px] text-ink-muted mt-3">
            Energy forecaster (Model 5) trains in Phase 6 after 2 weeks of logs.
          </p>
        </div>
      </div>

      <section className="mb-8">
        <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">USAGE HISTORY</p>
        <div className="border border-panel-border bg-panel rounded-md px-4 py-4">
          {loading ? (
            <p className="font-mono text-sm text-ink-muted">Loading…</p>
          ) : chartData.length === 0 ? (
            <p className="font-mono text-sm text-ink-muted">
              No energy logs yet — these populate once EnergyService starts writing
              daily rows (Step 2.8.6+).
            </p>
          ) : (
            <Chart data={chartData} unit=" kWh" />
          )}
        </div>
      </section>

      <section>
        <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">BY DEVICE</p>
        {loading ? (
          <p className="font-mono text-sm text-ink-muted">Loading…</p>
        ) : byDevice.length === 0 ? (
          <p className="font-mono text-sm text-ink-muted">No device breakdown yet.</p>
        ) : (
          <div className="border border-panel-border bg-panel rounded-md divide-y divide-panel-border">
            {byDevice.map(([deviceName, kwh]) => (
              <div key={deviceName} className="px-5 py-3 flex items-center justify-between">
                <p className="font-body text-sm text-ink">{deviceName}</p>
                <p className="font-mono text-sm text-accent">{kwh.toFixed(2)} kWh</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Energy