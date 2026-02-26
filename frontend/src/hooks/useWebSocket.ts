import { useEffect, useRef, useCallback } from 'react'

export interface WebSocketMessage {
  type: string
  [key: string]: unknown
}

interface UseWebSocketParams {
  projectId?: string
  token?: string | null
  onNotification?: (data: WebSocketMessage) => void
  onEntityUpdate?: (data: WebSocketMessage) => void
}

function buildWebSocketUrl(projectId: string, token: string): string {
  const apiBase = import.meta.env.VITE_API_URL || '/api/v1'

  let wsBase: string
  if (apiBase.startsWith('http')) {
    wsBase = apiBase.replace(/^http/, 'ws')
  } else {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    wsBase = `${protocol}//${window.location.host}${apiBase}`
  }

  wsBase = wsBase.replace(/\/+$/, '')
  return `${wsBase}/ws/${projectId}?token=${encodeURIComponent(token)}`
}

export function useWebSocket({ projectId, token, onNotification, onEntityUpdate }: UseWebSocketParams) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backoffRef = useRef(1000)
  const mountedRef = useRef(true)
  const onNotificationRef = useRef(onNotification)
  const onEntityUpdateRef = useRef(onEntityUpdate)

  onNotificationRef.current = onNotification
  onEntityUpdateRef.current = onEntityUpdate

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.onmessage = null
      wsRef.current.onopen = null
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (!projectId || !token || !mountedRef.current) return

    cleanup()

    let ws: WebSocket
    try {
      ws = new WebSocket(buildWebSocketUrl(projectId, token))
    } catch {
      return
    }

    wsRef.current = ws

    ws.onopen = () => {
      backoffRef.current = 1000
    }

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data)
        if (data.type === 'notification' && onNotificationRef.current) {
          onNotificationRef.current(data)
        } else if (data.type === 'entity_update' && onEntityUpdateRef.current) {
          onEntityUpdateRef.current(data)
        }
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      if (!mountedRef.current) return
      const delay = backoffRef.current
      backoffRef.current = Math.min(delay * 2, 30000)
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, delay)
    }

    ws.onerror = () => {
      // onclose fires after onerror, which triggers reconnect
    }
  }, [projectId, token, cleanup])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [connect, cleanup])
}
