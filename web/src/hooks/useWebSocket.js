import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Connects to a SmartNest WebSocket endpoint (sensors or alerts) for a
 * given household, authenticated via the same token used for REST calls.
 * Auto-reconnects with backoff if the connection drops.
 */
export function useWebSocket(path, householdId) {
  const [lastMessage, setLastMessage] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting | open | closed
  const wsRef = useRef(null);
  const reconnectDelay = useRef(1000);

  const connect = useCallback(() => {
    if (!householdId) return;

    const token = localStorage.getItem('smartnest_token');
    const wsBase = import.meta.env.VITE_WS_BASE_URL;
    const url = `${wsBase}${path}${householdId}/?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('open');
      reconnectDelay.current = 1000; // reset backoff on success
    };

    ws.onmessage = (event) => {
      try {
        setLastMessage(JSON.parse(event.data));
      } catch {
        setLastMessage(event.data);
      }
    };

    ws.onclose = (event) => {
      setStatus('closed');
      // 4401 = our custom "unauthorized" code - don't retry, it'll just fail again
      if (event.code === 4401) return;

      setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 15000);
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => ws.close();
  }, [path, householdId]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return { lastMessage, status };
}