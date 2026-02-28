import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../ui/EmptyState'
import { DescriptionIcon, FilterListIcon, DownloadIcon } from '@/icons'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  MenuItem,
  TextField,
  Skeleton,
  IconButton,
  alpha,
} from '@/mui'
import type { FileResponse } from '../../api/clientPortal'
import dayjs from 'dayjs'

interface DocumentListProps {
  documents: FileResponse[]
  projectId: string
  loading?: boolean
  onDownload?: (documentId: string) => void
}

export function DocumentList({ documents, projectId, loading = false, onDownload }: DocumentListProps) {
  const { t } = useTranslation()
  const [selectedType, setSelectedType] = useState<string>('all')

  // Extract unique entity types from documents
  const entityTypes = useMemo(() => {
    const typeSet = new Set<string>()
    documents.forEach((doc) => {
      if (doc.entityType) {
        typeSet.add(doc.entityType)
      }
    })
    return Array.from(typeSet)
  }, [documents])

  // Filter documents based on selected type
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (selectedType !== 'all' && doc.entityType !== selectedType) {
        return false
      }
      return true
    })
  }, [documents, selectedType])

  const handleDownload = async (documentId: string, filename: string) => {
    if (onDownload) {
      onDownload(documentId)
      return
    }

    // Default download implementation
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'
      const token = localStorage.getItem('authToken')
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/files/${documentId}/content`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  const handleResetFilters = () => {
    setSelectedType('all')
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  const getFileIcon = (fileType?: string) => {
    // Return appropriate icon based on file type
    return <DescriptionIcon />
  }

  if (loading) {
    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Skeleton variant="rounded" width={200} height={56} />
        </Box>
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={140} />
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
            label={t('clientPortal.filterByType')}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            size="small"
            fullWidth
            sx={{ maxWidth: 300 }}
          >
            <MenuItem value="all">{t('clientPortal.allTypes')}</MenuItem>
            {entityTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {selectedType !== 'all' && (
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
        <DescriptionIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
        <Typography variant="body2" color="text.secondary">
          {t('clientPortal.showingDocuments', { count: filteredDocuments.length, total: documents.length })}
        </Typography>
      </Box>

      {/* Document Grid */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          variant={selectedType !== 'all' ? 'no-results' : 'no-data'}
          title={t('clientPortal.noDocuments')}
          description={
            selectedType !== 'all'
              ? t('clientPortal.noDocumentsFiltered')
              : t('clientPortal.noDocumentsYet')
          }
          icon={<DescriptionIcon />}
          action={
            selectedType !== 'all'
              ? {
                  label: t('common.resetFilters'),
                  onClick: handleResetFilters,
                }
              : undefined
          }
        />
      ) : (
        <Grid container spacing={2}>
          {filteredDocuments.map((doc) => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  overflow: 'hidden',
                  transition: 'transform 200ms, box-shadow 200ms',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getFileIcon(doc.fileType)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        sx={{
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          wordBreak: 'break-word',
                        }}
                      >
                        {doc.filename}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                          label={doc.entityType}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                            color: 'info.main',
                          }}
                        />
                        {doc.fileType && (
                          <Chip
                            label={doc.fileType.toUpperCase()}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                              color: 'success.main',
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(doc.id, doc.filename)}
                      sx={{
                        color: 'primary.main',
                        '&:hover': {
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                        },
                      }}
                      aria-label={t('clientPortal.downloadDocument')}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    {dayjs(doc.uploadedAt).format('DD/MM/YYYY HH:mm')}
                  </Typography>
                  {doc.fileSize && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {formatFileSize(doc.fileSize)}
                    </Typography>
                  )}
                  {doc.uploadedBy && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {t('clientPortal.uploadedBy')}: {doc.uploadedBy.fullName}
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
