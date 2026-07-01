import { useEffect, useState, useCallback } from 'react'
import { sensorsApi, unwrapList } from '../api/client'
import { useWebSocket } from './useWebSocket'

export function useSensors(deviceId) {
  const [readings, setReadings] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchInitial = useCallback(async () => {
    try {
      const res = await sensorsApi.latest(deviceId)
      const sensorData = unwrapList(res.data)
      const byType = {}
      sensorData.forEach((r) => { byType[r.sensor_type] = r })
      setReadings(byType)
    } catch (err) {
      console.error('Failed to fetch initial sensor readings:', err)
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => { fetchInitial() }, [fetchInitial])

  const { isConnected } = useWebSocket('/ws/sensors/', {
    onMessage: (data) => {
      setReadings((prev) => ({ ...prev, [data.sensor_type]: data }))
    },
  })

  return { readings, loading, isConnected }
}