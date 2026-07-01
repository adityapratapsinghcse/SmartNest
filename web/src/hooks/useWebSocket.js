import { useEffect, useRef, useState, useCallback } from 'react'

export function useWebSocket(path, { onMessage } = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef(null)
  const onMessageRef = useRef(onMessage)
  const reconnectTimeoutRef = useRef(null)
  const isUnmountedRef = useRef(false)

  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    const base = import.meta.env.VITE_WS_BASE_URL
    const socket = new WebSocket(`${base}${path}`)

    socket.onopen = () => {
      // Guard against a superseded socket (e.g. StrictMode's dev-only
      // double-invoke of this effect) reporting itself as the live one.
      if (wsRef.current === socket) setIsConnected(true)
    }

    socket.onmessage = (event) => {
      // Ignore messages from a socket that's no longer current — without this,
      // a brief overlap between an old closing socket and a new one (StrictMode
      // double-connect, or a reconnect race) delivers the same broadcast twice.
      if (wsRef.current !== socket) return
      try {
        const data = JSON.parse(event.data)
        onMessageRef.current?.(data)
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    socket.onclose = () => {
      if (wsRef.current === socket) setIsConnected(false)
      // Don't reconnect if this was an intentional cleanup-close, or if a
      // newer socket already took over — otherwise this stale onclose ends up
      // scheduling a THIRD socket on top of the one that replaced it.
      if (isUnmountedRef.current || wsRef.current !== socket) return
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }

    socket.onerror = () => socket.close()

    wsRef.current = socket
  }, [path])

  useEffect(() => {
    isUnmountedRef.current = false
    connect()
    return () => {
      isUnmountedRef.current = true
      clearTimeout(reconnectTimeoutRef.current)
      const socket = wsRef.current
      wsRef.current = null
      socket?.close()
    }
  }, [connect])

  return { isConnected }
}