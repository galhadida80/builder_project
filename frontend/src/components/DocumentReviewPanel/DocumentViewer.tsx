import { useTranslation } from 'react-i18next'
import { useState, useRef, useEffect } from 'react'
import { ZoomInIcon, ZoomOutIcon, DownloadIcon, PrintIcon, RotateRightIcon, FitScreenIcon } from '@/icons'
import { Box, Paper, IconButton, Toolbar, Typography, Skeleton, styled } from '@/mui'

interface DocumentViewerProps {
  documentUrl: string
  documentName: string
  documentType: 'pdf' | 'image' | string
  loading?: boolean
  onDownload?: () => void
  onPrint?: () => void
}

const ViewerContainer = styled(Paper)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden',
  borderRadius: 0,
}))

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  minHeight: 56,
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  gap: theme.spacing(1),
}))

const ViewerContent = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  backgroundColor: theme.palette.grey[100],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
}))

const DocumentCanvas = styled(Box)<{ zoom: number; rotation: number }>(({ zoom, rotation }) => ({
  transform: `scale(${zoom}) rotate(${rotation}deg)`,
  transformOrigin: 'center center',
  transition: 'transform 0.2s ease-out',
  maxWidth: '100%',
  maxHeight: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

const StyledImage = styled('img')({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  display: 'block',
})

const StyledIframe = styled('iframe')({
  width: '100%',
  height: '100%',
  border: 'none',
})

export function DocumentViewer({
  documentUrl,
  documentName,
  documentType,
  loading = false,
  onDownload,
  onPrint,
}: DocumentViewerProps) {
  const { t } = useTranslation()
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [fitToScreen, setFitToScreen] = useState(true)
  const viewerRef = useRef<HTMLDivElement>(null)

  const handleZoomIn = () => {
    setFitToScreen(false)
    setZoom((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setFitToScreen(false)
    setZoom((prev) => Math.max(prev - 0.25, 0.5))
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleFitToScreen = () => {
    setFitToScreen(true)
    setZoom(1)
    setRotation(0)
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else {
      // Default download behavior
      const link = document.createElement('a')
      link.href = documentUrl
      link.download = documentName || 'document'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handlePrint = () => {
    if (onPrint) {
      onPrint()
    } else {
      // Default print behavior
      const printWindow = window.open(documentUrl, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }
    }
  }

  const isImage = documentType === 'image' || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(documentName)
  const isPdf = documentType === 'pdf' || /\.pdf$/i.test(documentName)

  useEffect(() => {
    if (fitToScreen && viewerRef.current) {
      setZoom(1)
    }
  }, [fitToScreen])

  if (loading) {
    return (
      <ViewerContainer elevation={0}>
        <StyledToolbar>
          <Skeleton variant="rectangular" width={40} height={40} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={40} height={40} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={40} height={40} sx={{ borderRadius: 1 }} />
          <Box sx={{ flex: 1 }} />
          <Skeleton variant="rectangular" width={40} height={40} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={40} height={40} sx={{ borderRadius: 1 }} />
        </StyledToolbar>
        <ViewerContent>
          <Skeleton variant="rectangular" width="80%" height="80%" />
        </ViewerContent>
      </ViewerContainer>
    )
  }

  return (
    <ViewerContainer elevation={0}>
      <StyledToolbar>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mr: 2 }}>
          {documentName}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton
          size="small"
          onClick={handleZoomOut}
          disabled={zoom <= 0.5 || isPdf}
          aria-label={t('documentReview.zoomOut')}
          sx={{ bgcolor: 'action.hover' }}
        >
          <ZoomOutIcon fontSize="small" />
        </IconButton>
        <Typography variant="caption" sx={{ minWidth: 50, textAlign: 'center', fontWeight: 600 }}>
          {Math.round(zoom * 100)}%
        </Typography>
        <IconButton
          size="small"
          onClick={handleZoomIn}
          disabled={zoom >= 3 || isPdf}
          aria-label={t('documentReview.zoomIn')}
          sx={{ bgcolor: 'action.hover' }}
        >
          <ZoomInIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleFitToScreen}
          disabled={isPdf}
          aria-label={t('documentReview.fitToScreen')}
          sx={{ bgcolor: 'action.hover' }}
        >
          <FitScreenIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleRotate}
          disabled={isPdf}
          aria-label={t('documentReview.rotate')}
          sx={{ bgcolor: 'action.hover' }}
        >
          <RotateRightIcon fontSize="small" />
        </IconButton>
        <Box sx={{ width: 1, height: 32, bgcolor: 'divider', mx: 1 }} />
        <IconButton
          size="small"
          onClick={handleDownload}
          aria-label={t('documentReview.downloadDocument')}
          sx={{ bgcolor: 'action.hover' }}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={handlePrint}
          aria-label={t('documentReview.printDocument')}
          sx={{ bgcolor: 'action.hover' }}
        >
          <PrintIcon fontSize="small" />
        </IconButton>
      </StyledToolbar>

      <ViewerContent ref={viewerRef}>
        {isImage ? (
          <DocumentCanvas zoom={zoom} rotation={rotation}>
            <StyledImage src={documentUrl} alt={documentName} />
          </DocumentCanvas>
        ) : isPdf ? (
          <StyledIframe
            src={`${documentUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            title={documentName}
          />
        ) : (
          <Box
            sx={{
              textAlign: 'center',
              p: 4,
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Unsupported Document Type
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              This document type cannot be previewed in the browser.
            </Typography>
            <IconButton
              size="large"
              onClick={handleDownload}
              aria-label={t('documentReview.downloadDocument')}
              sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
            >
              <DownloadIcon />
            </IconButton>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Click to download
            </Typography>
          </Box>
        )}
      </ViewerContent>
    </ViewerContainer>
  )
}
