import { useEffect, useState, useCallback } from 'react'
import { Circle, FabricText, Group } from 'fabric'
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
const CLUSTER_RADIUS = 20
const CLUSTER_ZOOM_THRESHOLD = 1.5
const CLUSTER_DISTANCE_THRESHOLD = 50

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

interface PinCluster {
  pins: FloorplanPin[]
  x: number
  y: number
  status: DefectStatus
}

export function FloorplanPinOverlay({ pins, canvas, projectId, onPinClick }: FloorplanPinOverlayProps) {
  const [entityStatusMap, setEntityStatusMap] = useState<Map<string, DefectStatus>>(new Map())
  const [zoomLevel, setZoomLevel] = useState(1)

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

  const clusterPins = useCallback((pinsWithStatus: Array<{ pin: FloorplanPin; status: DefectStatus }>): PinCluster[] => {
    if (pinsWithStatus.length === 0) return []
    const canvasWidth = canvas?.width || 1
    const canvasHeight = canvas?.height || 1
    const clusters: PinCluster[] = []
    const processed = new Set<string>()

    pinsWithStatus.forEach(({ pin, status }) => {
      if (processed.has(pin.id)) return

      const x = pin.xPosition * canvasWidth
      const y = pin.yPosition * canvasHeight
      const nearby = pinsWithStatus.filter(({ pin: otherPin }) => {
        if (processed.has(otherPin.id)) return false
        const otherX = otherPin.xPosition * canvasWidth
        const otherY = otherPin.yPosition * canvasHeight
        const distance = Math.sqrt((x - otherX) ** 2 + (y - otherY) ** 2)
        return distance < CLUSTER_DISTANCE_THRESHOLD
      })

      if (nearby.length > 1) {
        const centerX = nearby.reduce((sum, { pin: p }) => sum + p.xPosition, 0) / nearby.length
        const centerY = nearby.reduce((sum, { pin: p }) => sum + p.yPosition, 0) / nearby.length
        clusters.push({
          pins: nearby.map(({ pin: p }) => p),
          x: centerX,
          y: centerY,
          status,
        })
        nearby.forEach(({ pin: p }) => processed.add(p.id))
      } else {
        clusters.push({
          pins: [pin],
          x: pin.xPosition,
          y: pin.yPosition,
          status,
        })
        processed.add(pin.id)
      }
    })

    return clusters
  }, [canvas])

  useEffect(() => {
    if (!canvas) return

    const handleZoom = () => {
      setZoomLevel(canvas.getZoom())
    }

    canvas.on('mouse:wheel', handleZoom)
    canvas.on('object:modified', handleZoom)
    setZoomLevel(canvas.getZoom())

    return () => {
      canvas.off('mouse:wheel', handleZoom)
      canvas.off('object:modified', handleZoom)
    }
  }, [canvas])

  useEffect(() => {
    if (!canvas || pins.length === 0) return

    const canvasWidth = canvas.width!
    const canvasHeight = canvas.height!
    const pinObjects: (Circle | Group)[] = []

    const pinsWithStatus = pins.map((pin) => ({
      pin,
      status: entityStatusMap.get(pin.entityId),
    })).filter((item): item is { pin: FloorplanPin; status: DefectStatus } => item.status !== undefined)

    if (zoomLevel < CLUSTER_ZOOM_THRESHOLD) {
      const clusters = clusterPins(pinsWithStatus)

      clusters.forEach((cluster) => {
        const color = STATUS_COLORS[cluster.status]
        const x = cluster.x * canvasWidth
        const y = cluster.y * canvasHeight

        if (cluster.pins.length > 1) {
          const clusterCircle = new Circle({
            radius: CLUSTER_RADIUS,
            fill: color,
            stroke: '#FFFFFF',
            strokeWidth: PIN_STROKE_WIDTH,
            originX: 'center',
            originY: 'center',
          })

          const countText = new FabricText(cluster.pins.length.toString(), {
            fontSize: 14,
            fill: '#FFFFFF',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
          })

          const group = new Group([clusterCircle, countText], {
            left: x,
            top: y,
            selectable: false,
            hoverCursor: 'pointer',
          })

          group.on('mousedown', () => {
            if (onPinClick && cluster.pins[0]) {
              onPinClick(cluster.pins[0])
            }
          })

          canvas.add(group)
          pinObjects.push(group)
        } else {
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
              onPinClick(cluster.pins[0])
            }
          })

          canvas.add(circle)
          pinObjects.push(circle)
        }
      })
    } else {
      pinsWithStatus.forEach(({ pin, status }) => {
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
    }

    canvas.renderAll()

    return () => {
      pinObjects.forEach((obj) => canvas.remove(obj))
      canvas.renderAll()
    }
  }, [canvas, pins, entityStatusMap, onPinClick, zoomLevel, clusterPins])

  return null
}
