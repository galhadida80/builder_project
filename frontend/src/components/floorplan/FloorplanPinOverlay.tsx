import { useEffect, useState, useCallback } from 'react'
import { Circle, FabricText } from 'fabric'
import type { Canvas } from 'fabric'
import type { FloorplanPin } from '@/types/floorplan'
import type { DefectStatus } from '@/types'
import { defectsApi } from '@/api/defects'

const STATUS_COLORS: Record<DefectStatus, string> = {
  open: '#DC2626',
  in_progress: '#CA8A04',
  resolved: '#22C55E',
  closed: '#3B82F6',
}

const PIN_RADIUS = 12
const PIN_STROKE_WIDTH = 3

interface EntityWithStatus {
  id: string
  status: DefectStatus
}

interface FloorplanPinOverlayProps {
  pins: FloorplanPin[]
  canvas: Canvas | null
  projectId: string
  onPinClick?: (pin: FloorplanPin) => void
}

export function FloorplanPinOverlay({ pins, canvas, projectId, onPinClick }: FloorplanPinOverlayProps) {
  const [entityStatusMap, setEntityStatusMap] = useState<Map<string, DefectStatus>>(new Map())

  const fetchEntityStatus = useCallback(async (pin: FloorplanPin): Promise<DefectStatus | null> => {
    try {
      if (pin.entityType === 'defect') {
        const defect = await defectsApi.get(projectId, pin.entityId)
        return defect.status
      }
      return null
    } catch (error) {
      console.error(`Failed to fetch entity status for pin ${pin.id}:`, error)
      return null
    }
  }, [projectId])

  useEffect(() => {
    if (!pins.length) return

    const fetchAllStatuses = async () => {
      const statusMap = new Map<string, DefectStatus>()

      await Promise.all(
        pins.map(async (pin) => {
          const status = await fetchEntityStatus(pin)
          if (status) {
            statusMap.set(pin.entityId, status)
          }
        })
      )

      setEntityStatusMap(statusMap)
    }

    fetchAllStatuses()
  }, [pins, fetchEntityStatus])

  useEffect(() => {
    if (!canvas || pins.length === 0) return

    const canvasWidth = canvas.width!
    const canvasHeight = canvas.height!
    const pinObjects: Circle[] = []

    pins.forEach((pin) => {
      const status = entityStatusMap.get(pin.entityId)
      if (!status) return

      const color = STATUS_COLORS[status]
      const x = pin.xPosition * canvasWidth
      const y = pin.yPosition * canvasHeight

      const circle = new Circle({
        left: x - PIN_RADIUS,
        top: y - PIN_RADIUS,
        radius: PIN_RADIUS,
        fill: color,
        stroke: '#FFFFFF',
        strokeWidth: PIN_STROKE_WIDTH,
        selectable: false,
        hoverCursor: 'pointer',
      })

      circle.on('mousedown', () => {
        if (onPinClick) {
          onPinClick(pin)
        }
      })

      canvas.add(circle)
      pinObjects.push(circle)
    })

    canvas.renderAll()

    return () => {
      pinObjects.forEach((obj) => canvas.remove(obj))
      canvas.renderAll()
    }
  }, [canvas, pins, entityStatusMap, onPinClick])

  return null
}
