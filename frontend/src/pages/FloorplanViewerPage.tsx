import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Typography, IconButton, Paper, Skeleton, Toolbar, AppBar, useTheme, useMediaQuery } from '@/mui'
import { ArrowBackIcon, ZoomInIcon, ZoomOutIcon, FitScreenIcon } from '@/icons'
import { useToast } from '../components/common/ToastProvider'

interface FloorplanViewerState {
  scale: number
  offsetX: number
  offsetY: number
  isDragging: boolean
  dragStart: { x: number; y: number }
}

export default function FloorplanViewerPage() {
  const { t } = useTranslation()
  const { projectId, floorplanId } = useParams()
  const navigate = useNavigate()
  const { showError } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [floorplanImage, setFloorplanImage] = useState<HTMLImageElement | null>(null)
  const [viewState, setViewState] = useState<FloorplanViewerState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
  })

  useEffect(() => {
    if (!projectId || !floorplanId) {
      showError(t('floorplans.invalidParams'))
      navigate('/dashboard')
      return
    }
    loadFloorplan()
  }, [projectId, floorplanId])

  useEffect(() => {
    if (imageLoaded && floorplanImage) {
      drawCanvas()
    }
  }, [imageLoaded, floorplanImage, viewState.scale, viewState.offsetX, viewState.offsetY])

  const loadFloorplan = async () => {
    setLoading(true)
    try {
      // Placeholder: In the future, this will fetch from API
      // For now, just simulate loading
      await new Promise(resolve => setTimeout(resolve, 500))

      // Create a placeholder image for testing
      const img = new Image()
      img.onload = () => {
        setFloorplanImage(img)
        setImageLoaded(true)
        setLoading(false)
        fitToScreen()
      }
      img.onerror = () => {
        showError(t('floorplans.loadFailed'))
        setLoading(false)
      }
      // Placeholder data URL for a simple grid
      img.src = 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
          <rect width="800" height="600" fill="#f5f5f5"/>
          <path d="M0 0 L800 0 L800 600 L0 600 Z" stroke="#333" stroke-width="2" fill="none"/>
          <text x="400" y="300" text-anchor="middle" font-size="24" fill="#666">Floorplan ${floorplanId}</text>
        </svg>
      `)
    } catch (error) {
      setLoading(false)
      showError(t('floorplans.loadFailed'))
    }
  }

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !floorplanImage) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(viewState.offsetX, viewState.offsetY)
    ctx.scale(viewState.scale, viewState.scale)
    ctx.drawImage(floorplanImage, 0, 0)
    ctx.restore()
  }

  const handleZoomIn = () => {
    setViewState(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 5) }))
  }

  const handleZoomOut = () => {
    setViewState(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.1) }))
  }

  const fitToScreen = () => {
    const canvas = canvasRef.current
    if (!canvas || !floorplanImage) return

    const canvasWidth = canvas.offsetWidth
    const canvasHeight = canvas.offsetHeight
    const imageWidth = floorplanImage.width
    const imageHeight = floorplanImage.height

    const scaleX = canvasWidth / imageWidth
    const scaleY = canvasHeight / imageHeight
    const scale = Math.min(scaleX, scaleY) * 0.9

    const offsetX = (canvasWidth - imageWidth * scale) / 2
    const offsetY = (canvasHeight - imageHeight * scale) / 2

    setViewState(prev => ({ ...prev, scale, offsetX, offsetY }))
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setViewState(prev => ({
      ...prev,
      isDragging: true,
      dragStart: { x: e.clientX - prev.offsetX, y: e.clientY - prev.offsetY },
    }))
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!viewState.isDragging) return
    setViewState(prev => ({
      ...prev,
      offsetX: e.clientX - prev.dragStart.x,
      offsetY: e.clientY - prev.dragStart.y,
    }))
  }

  const handleMouseUp = () => {
    setViewState(prev => ({ ...prev, isDragging: false }))
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setViewState(prev => ({ ...prev, scale: Math.max(0.1, Math.min(5, prev.scale * delta)) }))
  }

  const handleBack = () => {
    navigate(`/projects/${projectId}/defects`)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t('floorplans.viewer')}
          </Typography>
          <IconButton onClick={handleZoomOut} disabled={loading}>
            <ZoomOutIcon />
          </IconButton>
          <IconButton onClick={handleZoomIn} disabled={loading}>
            <ZoomInIcon />
          </IconButton>
          <IconButton onClick={fitToScreen} disabled={loading}>
            <FitScreenIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height="calc(100vh - 120px)" />
          </Box>
        ) : (
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              height: '100%',
              bgcolor: '#f0f0f0',
              cursor: viewState.isDragging ? 'grabbing' : 'grab',
              overflow: 'hidden',
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
              }}
            />
          </Paper>
        )}
      </Box>
    </Box>
  )
}
