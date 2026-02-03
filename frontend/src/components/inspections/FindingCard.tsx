import { Card, CardContent, CardMedia, Box, Typography, Chip } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Finding } from '../../types'
import { SeverityBadge } from '../ui/StatusBadge'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ImageIcon from '@mui/icons-material/Image'

interface FindingCardProps {
  finding: Finding
  onClick?: () => void
  hoverable?: boolean
}

const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'hoverable',
})<{ hoverable?: boolean }>(({ theme, hoverable }) => ({
  borderRadius: 12,
  transition: 'all 200ms ease-out',
  cursor: hoverable ? 'pointer' : 'default',
  ...(hoverable && {
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
    },
  }),
}))

const PhotoGallery = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
}))

const PhotoPlaceholder = styled(Box)(({ theme }) => ({
  height: 100,
  backgroundColor: theme.palette.grey[100],
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.grey[400],
}))

const PhotoImage = styled('img')(() => ({
  width: '100%',
  height: 100,
  objectFit: 'cover',
  borderRadius: 8,
}))

const InfoRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
}))

export function FindingCard({ finding, onClick, hoverable = false }: FindingCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const hasPhotos = finding.photos && finding.photos.length > 0

  return (
    <StyledCard hoverable={hoverable} onClick={onClick}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              flex: 1,
              fontSize: '1rem',
            }}
          >
            {finding.title}
          </Typography>
          <SeverityBadge severity={finding.severity} size="small" />
        </Box>

        {finding.description && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 2,
              lineHeight: 1.6,
            }}
          >
            {finding.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: hasPhotos ? 0 : 0 }}>
          {finding.location && (
            <InfoRow>
              <LocationOnIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption">{finding.location}</Typography>
            </InfoRow>
          )}
          <InfoRow>
            <CalendarTodayIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption">{formatDate(finding.createdAt)}</Typography>
          </InfoRow>
          {finding.status && (
            <Chip
              label={finding.status.charAt(0).toUpperCase() + finding.status.slice(1)}
              size="small"
              color={finding.status === 'open' ? 'warning' : 'success'}
              sx={{
                height: 20,
                fontSize: '0.7rem',
                fontWeight: 600,
              }}
            />
          )}
        </Box>

        {hasPhotos && (
          <PhotoGallery>
            {finding.photos!.map((photo, index) => (
              <Box key={index} sx={{ position: 'relative' }}>
                {photo ? (
                  <PhotoImage
                    src={photo}
                    alt={`Finding photo ${index + 1}`}
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        const placeholder = document.createElement('div')
                        placeholder.className = 'photo-placeholder'
                        placeholder.style.cssText = `
                          height: 100px;
                          background-color: #f5f5f5;
                          border-radius: 8px;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          color: #9e9e9e;
                        `
                        placeholder.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>'
                        parent.appendChild(placeholder)
                      }
                    }}
                  />
                ) : (
                  <PhotoPlaceholder>
                    <ImageIcon />
                  </PhotoPlaceholder>
                )}
              </Box>
            ))}
          </PhotoGallery>
        )}
      </CardContent>
    </StyledCard>
  )
}
