import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Canvas, FabricImage } from 'fabric'
import { Box, CircularProgress, Alert } from '@/mui'
import type { Floorplan } from '@/types/floorplan'

interface FloorplanCanvasProps {
  floorplan: Floorplan
  width?: number
  height?: number
}

export function FloorplanCanvas({ floorplan, width, height }: FloorplanCanvasProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const [canvasReady, setCanvasReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (!floorplan.file?.fileUrl) {
      setError(t('floorplans.noImageUrl', 'No floorplan image available'))
      setLoading(false)
      return
    }

    const canvasWidth = width || (window.innerWidth > 600 ? 800 : window.innerWidth - 32)
    const canvasHeight = height || (window.innerHeight > 700 ? 600 : window.innerHeight - 200)

    const canvas = new Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#f5f5f5',
      selection: false,
    })
    fabricRef.current = canvas

    FabricImage.fromURL(floorplan.file.fileUrl, { crossOrigin: 'anonymous' })
      .then((img) => {
        if (!canvas) return

        const canvasW = canvas.width!
        const canvasH = canvas.height!
        const scale = Math.min(canvasW / img.width!, canvasH / img.height!)

        img.scale(scale)
        img.set({
          left: (canvasW - img.width! * scale) / 2,
          top: (canvasH - img.height! * scale) / 2,
          selectable: false,
          evented: false,
        })

        canvas.backgroundImage = img
        canvas.renderAll()
        setCanvasReady(true)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load floorplan image:', err)
        setError(t('floorplans.imageLoadError', 'Failed to load floorplan image'))
        setLoading(false)
      })

    return () => {
      canvas.dispose()
      fabricRef.current = null
      setCanvasReady(false)
      setLoading(true)
      setError(null)
    }
  }, [floorplan, width, height, t])

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: height || 600,
          width: width || '100%',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: 2,
      }}
    >
      <canvas ref={canvasRef} />
    </Box>
  )
}
