import { useState, useCallback } from 'react'

export interface HighlightOptions {
  animate?: boolean
  color?: string
  isolate?: boolean
}

export function useBimElementHighlight() {
  const [highlightedIds, setHighlightedIds] = useState<string[]>([])

  const highlightElement = useCallback((bimObjectId: string, options?: HighlightOptions) => {
    setHighlightedIds((prev) => {
      if (options?.isolate) {
        return [bimObjectId]
      }
      if (prev.includes(bimObjectId)) {
        return prev
      }
      return [...prev, bimObjectId]
    })
  }, [])

  const highlightElements = useCallback((bimObjectIds: string[], options?: HighlightOptions) => {
    if (options?.isolate) {
      setHighlightedIds(bimObjectIds)
    } else {
      setHighlightedIds((prev) => {
        const newIds = bimObjectIds.filter((id) => !prev.includes(id))
        return [...prev, ...newIds]
      })
    }
  }, [])

  const clearHighlight = useCallback((bimObjectId?: string) => {
    if (bimObjectId) {
      setHighlightedIds((prev) => prev.filter((id) => id !== bimObjectId))
    } else {
      setHighlightedIds([])
    }
  }, [])

  const isHighlighted = useCallback(
    (bimObjectId: string) => {
      return highlightedIds.includes(bimObjectId)
    },
    [highlightedIds]
  )

  return {
    highlightedIds,
    highlightElement,
    highlightElements,
    clearHighlight,
    isHighlighted,
  }
}
