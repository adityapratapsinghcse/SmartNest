import { useEffect, useState } from 'react'
import { useSensors } from '../hooks/useSensors'
import { devicesApi, unwrapList } from '../api/client'
import SensorCard from '../components/SensorCard'
import AlertBanner from '../components/AlertBanner'

const SENSOR_ORDER = ['temperature', 'humidity', 'gas', 'light', 'distance']

function Dashboard() {
  const { readings, loading, isConnected } = useSensors()
  const [devices, setDevices] = useState([])

  useEffect(() => {
    devicesApi
      .list()
      .then((res) => setDevices(unwrapList(res.data)))
      .catch((err) => console.error('Failed to fetch devices:', err))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Overview</h1>
        <div className="flex items-center gap-2 font-mono text-xs text-ink-muted">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-safe shadow-[0_0_8px] shadow-safe' : 'bg-danger'
            }`}
          ></span>
          {isConnected ? 'LIVE' : 'RECONNECTING'}
        </div>
      </div>

      <AlertBanner />

      <section className="mb-8">
        <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">SENSORS</p>
        {loading ? (
          <p className="font-mono text-sm text-ink-muted">Loading sensor data…</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {SENSOR_ORDER.map((type) => (
              <SensorCard key={type} sensorType={type} reading={readings[type]} />
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">DEVICES</p>
        {devices.length === 0 ? (
          <p className="font-mono text-sm text-ink-muted">No devices registered yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="border border-panel-border bg-panel rounded-md px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-body text-sm text-ink">{device.name}</p>
                  <p className="font-mono text-[10px] text-ink-muted">{device.location}</p>
                </div>
                <span
                  className={`h-2 w-2 rounded-full ${device.is_online ? 'bg-safe' : 'bg-danger'}`}
                ></span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Dashboard