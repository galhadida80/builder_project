import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, IconButton, Typography, Dialog, Stack } from '@/mui'
import { CameraAltIcon, CloseIcon, CheckCircleIcon, RefreshIcon } from '@/icons'

interface CameraCaptureProps {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
  facingMode?: 'user' | 'environment'
}

export default function CameraCapture({ open, onClose, onCapture, facingMode = 'environment' }: CameraCaptureProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch {
      setError(t('camera.permissionDenied'))
    }
  }, [facingMode, t])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
  }, [])

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    setCaptured(canvas.toDataURL('image/jpeg', 0.85))
    stopCamera()
  }

  const handleConfirm = () => {
    if (!captured || !canvasRef.current) return
    canvasRef.current.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
        handleClose()
      }
    }, 'image/jpeg', 0.85)
  }

  const handleRetake = () => {
    setCaptured(null)
    startCamera()
  }

  const handleClose = () => {
    stopCamera()
    setCaptured(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={handleClose}
      onTransitionEnter={startCamera}
    >
      <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: 'black' }}>
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10, color: 'white' }}
        >
          <CloseIcon />
        </IconButton>

        {error ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
            <Typography color="error" textAlign="center">{error}</Typography>
          </Box>
        ) : captured ? (
          <>
            <Box
              component="img"
              src={captured}
              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <Stack direction="row" spacing={2} sx={{
              position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
            }}>
              <IconButton onClick={handleRetake} sx={{
                bgcolor: 'rgba(255,255,255,0.3)', color: 'white', width: 56, height: 56,
              }}>
                <RefreshIcon />
              </IconButton>
              <IconButton onClick={handleConfirm} sx={{
                bgcolor: '#4caf50', color: 'white', width: 56, height: 56,
              }}>
                <CheckCircleIcon />
              </IconButton>
            </Stack>
          </>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <IconButton
              onClick={handleCapture}
              sx={{
                position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
                bgcolor: 'white', width: 64, height: 64,
                '&:hover': { bgcolor: 'grey.200' },
              }}
            >
              <CameraAltIcon sx={{ fontSize: 32 }} />
            </IconButton>
          </>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </Box>
    </Dialog>
  )
}
