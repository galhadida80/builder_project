import { useState } from 'react'
import { Box, Typography, IconButton, Grid, Button as MuiButton, Skeleton } from '@mui/material'
import { styled } from '@mui/material/styles'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PersonIcon from '@mui/icons-material/Person'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import ImageIcon from '@mui/icons-material/Image'
import { Card } from '../ui/Card'
import { SeverityBadge } from '../ui/StatusBadge'
import type { Finding, FindingSeverity } from '../../types'

interface FindingDocumentationCardProps {
  finding: Finding
  onSeverityChange?: (severity: FindingSeverity) => void
  onAssign?: () => void
  onResolve?: () => void
  onAddPhoto?: () => void
  onPhotoClick?: (photoUrl: string) => void
  loading?: boolean
}

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  transition: 'all 200ms ease-out',
  '&:hover': {
    boxShadow: theme.shadows[3],
  },
}))

const PhotoThumbnail = styled(Box)(({ theme }) => ({
  width: '100%',
  aspectRatio: '16/9',
  borderRadius: 8,
  overflow: 'hidden',
  cursor: 'pointer',
  position: 'relative',
  backgroundColor: theme.palette.action.hover,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  transition: 'all 200ms ease-out',
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: theme.shadows[2],
  },
}))

const SeverityBadgeButton = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  cursor: 'pointer',
  padding: theme.spacing(0.5),
  borderRadius: theme.spacing(1),
  transition: 'all 200ms ease-out',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}))

const ActionButton = styled(MuiButton)(({ theme }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  padding: theme.spacing(1, 2),
}))

export function FindingDocumentationCard({
  finding,
  onSeverityChange,
  onAssign,
  onResolve,
  onAddPhoto,
  onPhotoClick,
  loading = false,
}: FindingDocumentationCardProps) {
  const [editingLocation, setEditingLocation] = useState(false)
  const [locationValue, setLocationValue] = useState(finding.location || '')

  if (loading) {
    return (
      <StyledCard>
        <Box sx={{ p: 2.5 }}>
          <Skeleton width={200} height={32} sx={{ mb: 2 }} />
          <Skeleton width={80} height={24} sx={{ mb: 3 }} />
          <Skeleton width="100%" height={120} sx={{ mb: 2 }} />
          <Skeleton width="100%" height={80} sx={{ mb: 2 }} />
          <Skeleton width={150} height={24} />
        </Box>
      </StyledCard>
    )
  }

  const handleSeverityClick = (severity: FindingSeverity) => {
    if (onSeverityChange && severity !== finding.severity) {
      onSeverityChange(severity)
    }
  }

  const handleLocationBlur = () => {
    setEditingLocation(false)
    // Here you would typically call an API to persist the location change
  }

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  return (
    <StyledCard>
      <Box sx={{ p: 2.5 }}>
        {/* Header */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            {finding.title}
          </Typography>
        </Box>

        {/* Severity Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Severity Level
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(['critical', 'high', 'medium', 'low'] as FindingSeverity[]).map((severity) => (
              <SeverityBadgeButton
                key={severity}
                onClick={() => handleSeverityClick(severity)}
                sx={{
                  opacity: finding.severity === severity ? 1 : 0.5,
                  transform: finding.severity === severity ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <SeverityBadge severity={severity} size="small" />
              </SeverityBadgeButton>
            ))}
          </Box>
        </Box>

        {/* Photo Gallery */}
        {finding.photos && finding.photos.length > 0 ? (
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Photos ({finding.photos.length})
            </Typography>
            <Grid container spacing={1.5}>
              {finding.photos.map((photo, index) => (
                <Grid item xs={6} sm={4} key={index}>
                  <PhotoThumbnail
                    onClick={() => onPhotoClick?.(photo)}
                    sx={{
                      backgroundImage: `url(${photo})`,
                    }}
                  >
                    {!photo && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          color: 'text.secondary',
                        }}
                      >
                        <ImageIcon />
                      </Box>
                    )}
                  </PhotoThumbnail>
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : (
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
              textAlign: 'center',
            }}
          >
            <ImageIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No photos
            </Typography>
          </Box>
        )}

        {/* Location */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Location
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOnIcon sx={{ fontSize: 20, color: 'error.main' }} />
            {editingLocation ? (
              <input
                type="text"
                value={locationValue}
                onChange={(e) => setLocationValue(e.target.value)}
                onBlur={handleLocationBlur}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleLocationBlur()
                }}
                autoFocus
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                }}
              />
            ) : (
              <Typography
                variant="body2"
                onClick={() => setEditingLocation(true)}
                sx={{
                  flex: 1,
                  cursor: 'text',
                  color: finding.location ? 'text.primary' : 'text.secondary',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    px: 1,
                  },
                }}
              >
                {finding.location || 'Location not specified'}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Description */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Description
          </Typography>
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.6,
              color: finding.description ? 'text.primary' : 'text.secondary',
            }}
          >
            {finding.description || 'No description provided'}
          </Typography>
        </Box>

        {/* Inspector Metadata */}
        <Box
          sx={{
            mb: 3,
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <PersonIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Inspector
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {finding.createdBy?.fullName || finding.createdBy?.email || 'Unknown'}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Documented at
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
              {formatTimestamp(finding.createdAt)}
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <ActionButton
            variant="contained"
            color="primary"
            startIcon={<AssignmentIndIcon />}
            onClick={onAssign}
            disabled={!onAssign}
          >
            Assign
          </ActionButton>
          <ActionButton
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={onResolve}
            disabled={!onResolve}
          >
            Resolve
          </ActionButton>
          <ActionButton
            variant="outlined"
            color="inherit"
            startIcon={<AddPhotoAlternateIcon />}
            onClick={onAddPhoto}
            disabled={!onAddPhoto}
          >
            Add Photo
          </ActionButton>
        </Box>
      </Box>
    </StyledCard>
  )
}
