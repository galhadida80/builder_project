import { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Box, Typography, Alert } from '@mui/material'
import { styled } from '@mui/material/styles'
import CreateIcon from '@mui/icons-material/Create'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { Button } from '../ui/Button'

interface SignaturePadProps {
  onSignatureChange?: (signature: string | null) => void
  disabled?: boolean
  required?: boolean
  label?: string
}

const SignatureContainer = styled(Box)(({ theme }) => ({
  border: `2px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
}))

const CanvasWrapper = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: '#ffffff',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
  touchAction: 'none', // Prevent scrolling while signing on mobile
  '& canvas': {
    display: 'block',
  },
}))

const ButtonGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
  flexWrap: 'wrap',
}))

/**
 * SignaturePad Component
 * Captures digital signatures using react-signature-canvas.
 *
 * CRITICAL: Canvas dimensions are set via canvasProps (width/height),
 * NOT via CSS, to prevent zoom artifacts and maintain drawing quality.
 */
export function SignaturePad({
  onSignatureChange,
  disabled = false,
  required = false,
  label = 'Signature',
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [isSigned, setIsSigned] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 200 })

  // Handle responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      // Get container width, but ensure minimum size
      const containerWidth = Math.min(window.innerWidth - 64, 600)
      const width = Math.max(containerWidth, 320)
      const height = Math.min(Math.max(width * 0.4, 150), 250)

      setCanvasSize({ width, height })
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const handleEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setIsSigned(true)
      const dataURL = sigCanvas.current.toDataURL('image/png')
      onSignatureChange?.(dataURL)
    }
  }

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear()
      setIsSigned(false)
      onSignatureChange?.(null)
    }
  }

  const isEmpty = () => {
    return sigCanvas.current?.isEmpty() ?? true
  }

  const getSignature = () => {
    if (sigCanvas.current && !isEmpty()) {
      return sigCanvas.current.toDataURL('image/png')
    }
    return null
  }

  return (
    <SignatureContainer>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CreateIcon color="primary" />
          <Typography variant="subtitle1" fontWeight="medium">
            {label}
            {required && (
              <Typography component="span" color="error" sx={{ ml: 0.5 }}>
                *
              </Typography>
            )}
          </Typography>
        </Box>
        {isSigned && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircleIcon color="success" fontSize="small" />
            <Typography variant="caption" color="success.main">
              Signed
            </Typography>
          </Box>
        )}
      </Box>

      <CanvasWrapper>
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            width: canvasSize.width,
            height: canvasSize.height,
            className: 'signature-canvas',
          }}
          onEnd={handleEnd}
          // Note: We intentionally don't disable the canvas directly
          // Instead, we disable the action buttons
        />
      </CanvasWrapper>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}
      >
        Draw your signature above using mouse or touch
      </Typography>

      <ButtonGroup>
        <Button
          variant="secondary"
          icon={<DeleteIcon />}
          onClick={handleClear}
          disabled={disabled || !isSigned}
        >
          Clear
        </Button>
      </ButtonGroup>

      {required && !isSigned && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Signature is required before submission
        </Alert>
      )}
    </SignatureContainer>
  )
}

// Export helper methods for external access if needed
export { SignatureCanvas }
export type { SignaturePadProps }
