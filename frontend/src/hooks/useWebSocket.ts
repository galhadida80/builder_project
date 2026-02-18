import { useState, useEffect, useRef, useCallback } from 'react'

interface WebSocketMessage {
  type: string
  [key: string]: unknown
}

interface UseWebSocketReturn {
  isConnected: boolean
  lastMessage: WebSocketMessage | null
  sendMessage: (data: unknown) => void
}

export function useWebSocket(projectId: string | undefined): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxReconnectAttempts = 10

  const connect = useCallback(() => {
    if (!projectId) return

    const token = localStorage.getItem('authToken') || ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${protocol}//${host}/api/v1/ws/${projectId}?token=${token}`

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        setIsConnected(true)
        reconnectAttemptRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage
          setLastMessage(data)
        } catch {
          // ignore non-JSON messages
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        wsRef.current = null

        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000)
          reconnectAttemptRef.current += 1
          reconnectTimeoutRef.current = setTimeout(connect, delay)
        }
      }

      ws.onerror = () => {
        ws.close()
      }

      wsRef.current = ws
    } catch {
      // connection failed, will retry via onclose
    }
  }, [projectId])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { isConnected, lastMessage, sendMessage }
}
