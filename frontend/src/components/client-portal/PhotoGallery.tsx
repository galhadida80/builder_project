import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/he'
import 'dayjs/locale/en'
import { EmptyState } from '../ui/EmptyState'
import { ImageIcon, FilterListIcon } from '@/icons'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  MenuItem,
  TextField,
  Skeleton,
  alpha,
} from '@/mui'
import type { FileResponse } from '../../api/clientPortal'

interface PhotoGalleryProps {
  photos: FileResponse[]
  projectId: string
  loading?: boolean
}

export function PhotoGallery({ photos, projectId, loading = false }: PhotoGalleryProps) {
  const { t, i18n } = useTranslation()
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [startDate, setStartDate] = useState<Dayjs | null>(null)
  const [endDate, setEndDate] = useState<Dayjs | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({})

  // Extract unique areas from photos
  const areas = useMemo(() => {
    const areaSet = new Set<string>()
    photos.forEach((photo) => {
      if (photo.entityType === 'area' && photo.entityId) {
        // Use entityId as unique identifier for area
        areaSet.add(photo.entityId)
      }
    })
    return Array.from(areaSet)
  }, [photos])

  // Filter photos based on selected filters
  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      // Area filter
      if (selectedArea !== 'all' && photo.entityId !== selectedArea) {
        return false
      }

      // Date filter
      if (startDate || endDate) {
        const photoDate = dayjs(photo.uploadedAt)
        if (startDate && photoDate.isBefore(startDate, 'day')) {
          return false
        }
        if (endDate && photoDate.isAfter(endDate, 'day')) {
          return false
        }
      }

      return true
    })
  }, [photos, selectedArea, startDate, endDate])

  // Load image blobs for authenticated access
  useEffect(() => {
    const loadImages = async () => {
      for (const photo of filteredPhotos) {
        if (!imageUrls[photo.id] && !imageLoading[photo.id]) {
          setImageLoading((prev) => ({ ...prev, [photo.id]: true }))
          try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'
            const token = localStorage.getItem('authToken')
            const response = await fetch(
              `${API_BASE_URL}/projects/${projectId}/files/${photo.id}/content`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            )
            if (response.ok) {
              const blob = await response.blob()
              const url = URL.createObjectURL(blob)
              setImageUrls((prev) => ({ ...prev, [photo.id]: url }))
            }
          } catch (error) {
            console.error('Failed to load image:', error)
          } finally {
            setImageLoading((prev) => ({ ...prev, [photo.id]: false }))
          }
        }
      }
    }

    if (filteredPhotos.length > 0) {
      loadImages()
    }

    // Cleanup blob URLs on unmount
    return () => {
      Object.values(imageUrls).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [filteredPhotos, projectId, imageUrls, imageLoading])

  const handleResetFilters = () => {
    setSelectedArea('all')
    setStartDate(null)
    setEndDate(null)
  }

  if (loading) {
    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Skeleton variant="rounded" width={200} height={56} />
          <Skeleton variant="rounded" width={200} height={56} />
          <Skeleton variant="rounded" width={200} height={56} />
        </Box>
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton variant="rounded" height={240} />
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  return (
    <Box>
      {/* Filter Controls */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 200 }}>
          <FilterListIcon sx={{ color: 'text.secondary' }} />
          <TextField
            select
            label={t('clientPortal.filterByArea')}
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            size="small"
            fullWidth
            sx={{ maxWidth: 300 }}
          >
            <MenuItem value="all">{t('clientPortal.allAreas')}</MenuItem>
            {areas.map((areaId) => (
              <MenuItem key={areaId} value={areaId}>
                {photos.find((p) => p.entityId === areaId)?.entityType || areaId}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18n.language}>
          <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 } }}>
            <DatePicker
              label={t('clientPortal.startDate')}
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                },
              }}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 } }}>
            <DatePicker
              label={t('clientPortal.endDate')}
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              minDate={startDate || undefined}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                },
              }}
            />
          </Box>
        </LocalizationProvider>

        {(selectedArea !== 'all' || startDate || endDate) && (
          <Box
            component="button"
            onClick={handleResetFilters}
            sx={{
              px: 2,
              py: 1,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              color: 'primary.main',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 200ms',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'primary.main',
              },
            }}
          >
            {t('common.resetFilters')}
          </Box>
        )}
      </Box>

      {/* Results Count */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ImageIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
        <Typography variant="body2" color="text.secondary">
          {t('clientPortal.showingPhotos', { count: filteredPhotos.length, total: photos.length })}
        </Typography>
      </Box>

      {/* Photo Grid */}
      {filteredPhotos.length === 0 ? (
        <EmptyState
          variant={selectedArea !== 'all' || startDate || endDate ? 'no-results' : 'no-data'}
          title={t('clientPortal.noPhotos')}
          description={
            selectedArea !== 'all' || startDate || endDate
              ? t('clientPortal.noPhotosFiltered')
              : t('clientPortal.noPhotosYet')
          }
          icon={<ImageIcon />}
          action={
            selectedArea !== 'all' || startDate || endDate
              ? {
                  label: t('common.resetFilters'),
                  onClick: handleResetFilters,
                }
              : undefined
          }
        />
      ) : (
        <Grid container spacing={2}>
          {filteredPhotos.map((photo) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  overflow: 'hidden',
                  transition: 'transform 200ms, box-shadow 200ms',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                {imageUrls[photo.id] ? (
                  <CardMedia
                    component="img"
                    height="200"
                    image={imageUrls[photo.id]}
                    alt={photo.filename}
                    sx={{
                      objectFit: 'cover',
                      bgcolor: 'action.hover',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'action.hover',
                    }}
                  >
                    {imageLoading[photo.id] ? (
                      <Skeleton variant="rectangular" width="100%" height={200} />
                    ) : (
                      <ImageIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                    )}
                  </Box>
                )}
                <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{
                      mb: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {photo.filename}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <Chip
                      label={photo.entityType}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {dayjs(photo.uploadedAt).format('DD/MM/YYYY HH:mm')}
                  </Typography>
                  {photo.uploadedBy && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {t('clientPortal.uploadedBy')}: {photo.uploadedBy.fullName}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}
