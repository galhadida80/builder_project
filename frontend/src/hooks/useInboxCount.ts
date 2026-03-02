import { useCallback, useEffect, useState } from 'react'
import { inboxApi } from '../api/inbox'

export function useInboxCount() {
  const [count, setCount] = useState(0)

  const fetch = useCallback(async () => {
    try {
      const data = await inboxApi.getMyInbox()
      setCount(data.counts.total)
    } catch {
      // silently ignore — badge just stays at last known value
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  useEffect(() => {
    const handler = () => { fetch() }
    window.addEventListener('ws:entity_update', handler)
    return () => window.removeEventListener('ws:entity_update', handler)
  }, [fetch])

  return count
}
