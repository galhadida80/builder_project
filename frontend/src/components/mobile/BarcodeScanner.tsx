import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, IconButton, Typography, Dialog } from '@/mui'
import { CloseIcon } from '@/icons'

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScan: (code: string, format: string) => void
}

export default function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const detectorRef = useRef<BarcodeDetector | null>(null)
  const animFrameRef = useRef<number>(0)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
  }, [])

  const startScanning = useCallback(async () => {
    try {
      setError(null)

      if (!('BarcodeDetector' in window)) {
        setError(t('barcode.notSupported'))
        return
      }

      detectorRef.current = new BarcodeDetector({
        formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39'],
      })

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      const detect = async () => {
        if (!videoRef.current || !detectorRef.current || videoRef.current.readyState < 2) {
          animFrameRef.current = requestAnimationFrame(detect)
          return
        }
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current)
          if (barcodes.length > 0) {
            const barcode = barcodes[0]
            stopCamera()
            onScan(barcode.rawValue, barcode.format)
            return
          }
        } catch { /* continue scanning */ }
        animFrameRef.current = requestAnimationFrame(detect)
      }
      animFrameRef.current = requestAnimationFrame(detect)
    } catch {
      setError(t('camera.permissionDenied'))
    }
  }, [t, onScan, stopCamera])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  const handleClose = () => {
    stopCamera()
    setError(null)
    onClose()
  }

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={handleClose}
      onTransitionEnter={startScanning}
    >
      <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: 'black' }}>
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10, color: 'white' }}
        >
          <CloseIcon />
        </IconButton>

        <Typography
          variant="body2"
          sx={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            color: 'white', bgcolor: 'rgba(0,0,0,0.5)', px: 2, py: 0.5, borderRadius: 1, zIndex: 10,
          }}
        >
          {t('barcode.scanPrompt')}
        </Typography>

        {error ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
            <Typography color="error" textAlign="center">{error}</Typography>
          </Box>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <Box sx={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 250, height: 250, border: '2px solid rgba(255,255,255,0.7)', borderRadius: 2,
            }} />
          </>
        )}
      </Box>
    </Dialog>
  )
}

declare global {
  interface Window {
    BarcodeDetector: typeof BarcodeDetector
  }

  class BarcodeDetector {
    constructor(options?: { formats: string[] })
    detect(source: ImageBitmapSource): Promise<{ rawValue: string; format: string }[]>
    static getSupportedFormats(): Promise<string[]>
  }
}
