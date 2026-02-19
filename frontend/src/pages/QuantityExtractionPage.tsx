import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { Box, Typography, Paper, Card, CardContent, CircularProgress, Button, Chip, Stack, Divider, Alert, alpha, styled } from '@/mui'
import { CloudUploadIcon, PictureAsPdfIcon, SquareFootIcon, DoorFrontIcon, WindowIcon, HomeIcon, ApartmentIcon, RefreshIcon, ExpandMoreIcon } from '@/icons'
import { quantityExtractionApi } from '../api/quantityExtraction'
import type { QuantityExtractionResponse, QuantityFloorData, QuantityRoomData } from '../types'
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material'

const MAX_FILE_SIZE = 20 * 1024 * 1024

const StyledDropzone = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isDragActive',
})<{ isDragActive?: boolean }>(({ theme, isDragActive }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: 12,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: isDragActive
    ? alpha(theme.palette.primary.main, 0.08)
    : theme.palette.background.paper,
  transition: 'all 200ms ease-out',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
}))

type PageState = 'upload' | 'loading' | 'results'

export default function QuantityExtractionPage() {
  const { t, i18n } = useTranslation()
  const [state, setState] = useState<PageState>('upload')
  const [data, setData] = useState<QuantityExtractionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]

    setState('loading')
    setError(null)

    try {
      const result = await quantityExtractionApi.extract(file, i18n.language)
      setData(result)
      setState('results')
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('quantityExtraction.extractionFailed'))
      setState('upload')
    }
  }, [i18n.language, t])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: state === 'loading',
  })

  const handleReset = () => {
    setState('upload')
    setData(null)
    setError(null)
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {t('quantityExtraction.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('quantityExtraction.subtitle')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {state === 'upload' && (
        <StyledDropzone {...getRootProps()} isDragActive={isDragActive} elevation={0}>
          <input {...getInputProps()} />
          <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', bgcolor: (th) => alpha(th.palette.primary.main, 0.1), mb: 2 }}>
            <CloudUploadIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          </Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {isDragActive ? t('quantityExtraction.dropHere') : t('quantityExtraction.uploadPdf')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('quantityExtraction.orClick')}
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center">
            <Chip label={t('quantityExtraction.pdfOnly')} size="small" icon={<PictureAsPdfIcon />} />
            <Chip label={t('quantityExtraction.maxSize')} size="small" variant="outlined" />
          </Stack>
        </StyledDropzone>
      )}

      {state === 'loading' && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }} elevation={0}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {t('quantityExtraction.processing')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('quantityExtraction.processingHint')}
          </Typography>
        </Paper>
      )}

      {state === 'results' && data && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              {t('quantityExtraction.results')}
            </Typography>
            <Button startIcon={<RefreshIcon />} onClick={handleReset} size="small">
              {t('quantityExtraction.uploadAnother')}
            </Button>
          </Box>

          <SummaryCards summary={data.summary} processingTimeMs={data.processingTimeMs} />

          <Divider sx={{ my: 3 }} />

          {data.floors.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              {t('quantityExtraction.noData')}
            </Typography>
          ) : (
            data.floors.map((floor, i) => (
              <FloorAccordion key={i} floor={floor} defaultExpanded={i === 0} />
            ))
          )}
        </Box>
      )}
    </Box>
  )
}

function SummaryCards({ summary, processingTimeMs }: { summary: QuantityExtractionResponse['summary']; processingTimeMs: number }) {
  const { t } = useTranslation()

  const items = [
    { label: t('quantityExtraction.totalFloors'), value: summary.totalFloors, icon: <ApartmentIcon /> },
    { label: t('quantityExtraction.totalRooms'), value: summary.totalRooms, icon: <HomeIcon /> },
    { label: t('quantityExtraction.totalArea'), value: `${summary.totalAreaSqm.toFixed(1)} ${t('quantityExtraction.sqm')}`, icon: <SquareFootIcon /> },
    { label: t('quantityExtraction.totalDoors'), value: summary.totalDoors, icon: <DoorFrontIcon /> },
    { label: t('quantityExtraction.totalWindows'), value: summary.totalWindows, icon: <WindowIcon /> },
  ]

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1.5 }}>
        {items.map((item) => (
          <Card key={item.label} elevation={0} sx={{ bgcolor: 'background.default', borderRadius: 2 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
              <Box sx={{ color: 'primary.main', mb: 0.5 }}>{item.icon}</Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {item.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'end', mt: 1 }}>
        {t('quantityExtraction.processingTime')}: {(processingTimeMs / 1000).toFixed(1)} {t('quantityExtraction.seconds')}
      </Typography>
    </Box>
  )
}

function FloorAccordion({ floor, defaultExpanded }: { floor: QuantityFloorData; defaultExpanded: boolean }) {
  const { t } = useTranslation()

  return (
    <Accordion defaultExpanded={defaultExpanded} sx={{ mb: 1, borderRadius: '8px !important', '&:before': { display: 'none' } }} elevation={0}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} alignItems="center">
          <ApartmentIcon color="primary" fontSize="small" />
          <Typography fontWeight={600}>
            {t('quantityExtraction.floor')} {floor.floorNumber}
            {floor.floorName && ` - ${floor.floorName}`}
          </Typography>
          {floor.totalAreaSqm && (
            <Chip label={`${floor.totalAreaSqm.toFixed(1)} ${t('quantityExtraction.sqm')}`} size="small" variant="outlined" />
          )}
          <Chip label={`${floor.rooms.length} ${t('quantityExtraction.totalRooms')}`} size="small" />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          {floor.rooms.map((room, i) => (
            <RoomCard key={i} room={room} />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}

function RoomCard({ room }: { room: QuantityRoomData }) {
  const { t } = useTranslation()

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography fontWeight={600} gutterBottom>{room.name}</Typography>

        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1, gap: 0.5 }}>
          {room.roomType && <Chip label={room.roomType} size="small" variant="outlined" />}
          {room.areaSqm && <Chip label={`${room.areaSqm} ${t('quantityExtraction.sqm')}`} size="small" icon={<SquareFootIcon />} />}
          {room.heightM && <Chip label={`${t('quantityExtraction.height')}: ${room.heightM} ${t('quantityExtraction.m')}`} size="small" variant="outlined" />}
        </Stack>

        {room.doors.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {t('quantityExtraction.doors')} ({room.doors.length})
            </Typography>
            {room.doors.map((d, i) => (
              <Typography key={i} variant="body2" sx={{ fontSize: '0.8rem' }}>
                {d.doorType || t('quantityExtraction.type')} — {d.widthCm}x{d.heightCm} {t('quantityExtraction.cm')} x{d.quantity}
              </Typography>
            ))}
          </Box>
        )}

        {room.windows.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {t('quantityExtraction.windows')} ({room.windows.length})
            </Typography>
            {room.windows.map((w, i) => (
              <Typography key={i} variant="body2" sx={{ fontSize: '0.8rem' }}>
                {w.windowType || t('quantityExtraction.type')} — {w.widthCm}x{w.heightCm} {t('quantityExtraction.cm')} x{w.quantity}
              </Typography>
            ))}
          </Box>
        )}

        {room.finishes && (
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {t('quantityExtraction.finishes')}
            </Typography>
            <Stack spacing={0.25}>
              {room.finishes.floorMaterial && (
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {t('quantityExtraction.floorMaterial')}: {room.finishes.floorMaterial}
                </Typography>
              )}
              {room.finishes.wallMaterial && (
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {t('quantityExtraction.wallMaterial')}: {room.finishes.wallMaterial}
                </Typography>
              )}
              {room.finishes.ceilingMaterial && (
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {t('quantityExtraction.ceilingMaterial')}: {room.finishes.ceilingMaterial}
                </Typography>
              )}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
