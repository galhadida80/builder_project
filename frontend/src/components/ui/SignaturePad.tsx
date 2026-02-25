import { useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { UndoIcon, CheckCircleIcon, CreateIcon } from '@/icons'
import { Box, Typography, useTheme } from '@/mui'

interface SignaturePadProps {
  label: string
  value?: string | null
  onChange: (dataUrl: string | null) => void
  width?: number
  height?: number
  required?: boolean
  disabled?: boolean
  error?: string
}

export default function SignaturePad({
  label,
  value,
  onChange,
  width = 400,
  height = 150,
  required = false,
  disabled = false,
  error,
}: SignaturePadProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(!!value)
  const [isEditing, setIsEditing] = useState(!value)

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2
    ctx.strokeStyle = theme.palette.text.primary
  }, [theme.palette.text.primary])

  useEffect(() => {
    if (isEditing && !value) {
      initCanvas()
    }
  }, [isEditing, value, initCanvas])

  const getPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pos = getPosition(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pos = getPosition(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    setHasSignature(true)
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onChange(null)
  }

  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onChange(dataUrl)
    setIsEditing(false)
  }

  const handleEdit = () => {
    setIsEditing(true)
    setHasSignature(false)
    onChange(null)
    setTimeout(() => initCanvas(), 50)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <CreateIcon fontSize="small" color="action" />
        <Typography variant="subtitle2" fontWeight={600}>
          {label}
          {required && <span style={{ color: 'red' }}> *</span>}
        </Typography>
      </Box>

      {!isEditing && value ? (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 1,
            bgcolor: 'action.hover',
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CheckCircleIcon fontSize="small" color="success" />
            <Typography variant="caption" color="success.main" fontWeight={600}>
              {t('signaturePad.signed')}
            </Typography>
          </Box>
          <img
            src={value}
            alt={label}
            style={{
              maxWidth: '100%',
              height: 'auto',
              maxHeight: height,
              display: 'block',
            }}
          />
          {!disabled && (
            <Button variant="tertiary" size="small" sx={{ mt: 1 }} onClick={handleEdit}>
              {t('signaturePad.resign')}
            </Button>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            border: '2px dashed',
            borderColor: error ? 'error.main' : isDrawing ? 'primary.main' : 'divider',
            borderRadius: 2,
            bgcolor: disabled ? 'action.disabledBackground' : 'background.paper',
            overflow: 'hidden',
            transition: 'border-color 200ms ease-out',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              maxWidth: width,
              height,
              display: 'block',
              cursor: disabled ? 'not-allowed' : 'crosshair',
              touchAction: 'none',
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          {!hasSignature && !isDrawing && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            >
              {t('signaturePad.drawHere')}
            </Typography>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              variant="tertiary"
              size="small"
              icon={<UndoIcon />}
              onClick={handleClear}
              disabled={!hasSignature || disabled}
            >
              {t('signaturePad.clear')}
            </Button>
            <Button
              variant="primary"
              size="small"
              icon={<CheckCircleIcon />}
              onClick={handleConfirm}
              disabled={!hasSignature || disabled}
            >
              {t('signaturePad.confirm')}
            </Button>
          </Box>
        </Box>
      )}

      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  )
}

export type { SignaturePadProps }
