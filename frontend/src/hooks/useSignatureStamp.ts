import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/auth'

export function useSignatureStamp() {
  const { user } = useAuth()
  const [stampUrl, setStampUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.signatureUrl) {
      setLoading(true)
      authApi.getSignatureImage()
        .then(setStampUrl)
        .catch(() => setStampUrl(null))
        .finally(() => setLoading(false))
    } else {
      setStampUrl(null)
    }
  }, [user?.signatureUrl])

  const hasStamp = !!stampUrl

  const applyStamp = useCallback((): string | null => {
    return stampUrl
  }, [stampUrl])

  return { stampUrl, hasStamp, loading, applyStamp }
}
