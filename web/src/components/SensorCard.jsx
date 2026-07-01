import { TEMP_WARNING_C, TEMP_DANGER_C, GAS_WARNING_PPM, GAS_DANGER_PPM } from '../config'

const SENSOR_META = {
  temperature: { label: 'Temperature', unit: '°C' },
  humidity: { label: 'Humidity', unit: '%' },
  gas_mq2: { label: 'Gas (MQ-2)', unit: 'ppm' },
  light: { label: 'Light Level', unit: 'lux' },
  distance: { label: 'Distance', unit: 'cm' },
}

function getStatus(sensorType, value) {
  if (value === undefined || value === null) return 'unknown'
  if (sensorType === 'temperature') {
    if (value > TEMP_DANGER_C) return 'danger'
    if (value > TEMP_WARNING_C) return 'warning'
    return 'safe'
  }
  if (sensorType === 'gas_mq2') {
    if (value > GAS_DANGER_PPM) return 'danger'
    if (value > GAS_WARNING_PPM) return 'warning'
    return 'safe'
  }
  return 'safe'
}

const statusStyles = {
  safe: 'text-safe',
  warning: 'text-accent',
  danger: 'text-danger',
  unknown: 'text-ink-muted',
}

function SensorCard({ sensorType, reading }) {
  const meta = SENSOR_META[sensorType] || { label: sensorType, unit: '' }
  const value = reading?.value
  const status = getStatus(sensorType, value)
  const timestamp = reading?.timestamp
    ? new Date(reading.timestamp).toLocaleTimeString()
    : '—'

  return (
    <div className="border border-panel-border bg-panel rounded-md px-5 py-4">
      <p className="font-mono text-xs tracking-[0.2em] text-ink-muted mb-3">
        {meta.label.toUpperCase()}
      </p>
      <div className={`font-mono text-3xl font-medium ${statusStyles[status]}`}>
        {value !== undefined ? value : '--'}
        <span className="text-base text-ink-muted ml-1">{meta.unit}</span>
      </div>
      <p className="font-mono text-[10px] text-ink-muted mt-3">
        UPDATED {timestamp}
      </p>
    </div>
  )
}

export default SensorCard