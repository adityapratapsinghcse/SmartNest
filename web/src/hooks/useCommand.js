import { useState, useCallback } from 'react'
import { commandsApi } from '../api/client'

export function useCommand() {
  const [state, setState] = useState('idle') // idle | sending | sent | error

  const send = useCallback(async (deviceId, action, payload = {}) => {
    setState('sending')
    try {
      await commandsApi.send(deviceId, action, payload)
      setState('sent')
      setTimeout(() => setState('idle'), 2500)
      return true
    } catch (err) {
      console.error(`Failed to send command "${action}":`, err)
      setState('error')
      setTimeout(() => setState('idle'), 2500)
      return false
    }
  }, [])

  return { state, send }
}