import { Card, CardContent, CardMedia, Box, Typography, Chip } from '@mui/material'
import { styled } from '@mui/material'
import { useTranslation } from 'react-i18next'
import InventoryIcon from '@mui/icons-material/Inventory'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import type { Material } from '../../types'

interface MaterialCardProps {
  material: Material
  onClick?: () => void
  lowStockThreshold?: number
}

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  transition: 'all 200ms ease-out',
  cursor: 'pointer',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.12)',
  },
}))

const MaterialImage = styled(CardMedia)(({ theme }) => ({
  height: 180,
  backgroundColor: theme.palette.mode === 'light' ? '#F8FAFC' : theme.palette.grey[800],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.mode === 'light' ? '#CBD5E1' : theme.palette.grey[600],
  position: 'relative',
}))

const LowStockBadge = styled(Chip)(({ theme }) => ({
  position: 'absolute',
  top: 12,
  right: 12,
  backgroundColor: '#EAB308',
  color: '#FFFFFF',
  fontWeight: 600,
  fontSize: '0.75rem',
  height: 26,
  '& .MuiChip-icon': {
    color: '#FFFFFF',
    fontSize: '1rem',
    marginLeft: '6px',
  },
}))

const InfoRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
}))

export function MaterialCard({ material, onClick, lowStockThreshold = 10 }: MaterialCardProps) {
  const { t } = useTranslation()
  const isLowStock = material.quantity !== undefined && material.quantity < lowStockThreshold
  const imageUrl = material.documents?.[0]?.storagePath

  return (
    <StyledCard onClick={onClick}>
      <MaterialImage
        image={imageUrl}
        title={material.name}
      >
        {!imageUrl && <InventoryIcon sx={{ fontSize: 72 }} />}
        {isLowStock && (
          <LowStockBadge
            icon={<WarningAmberIcon sx={{ fontSize: '1rem' }} />}
            label={t('materials.lowStock')}
            size="small"
          />
        )}
      </MaterialImage>

      <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.3,
            minHeight: '2.6em',
            fontSize: '1.125rem',
          }}
        >
          {material.name}
        </Typography>

        {material.materialType && (
          <Chip
            label={material.materialType}
            size="small"
            sx={{
              mb: 2,
              bgcolor: '#0369A1',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.75rem',
              height: 24,
              borderRadius: 2,
            }}
          />
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <InfoRow>
            <InventoryIcon sx={{ fontSize: '1.125rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}>
              {material.quantity !== undefined ? (
                <>
                  {material.quantity} {material.unit || 'units'}
                </>
              ) : (
                'N/A'
              )}
            </Typography>
          </InfoRow>

          {material.storageLocation && (
            <InfoRow>
              <LocationOnIcon sx={{ fontSize: '1.125rem' }} />
              <Typography
                variant="body2"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.875rem',
                }}
              >
                {material.storageLocation}
              </Typography>
            </InfoRow>
          )}
        </Box>

        {material.manufacturer && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              mt: 2,
              pt: 2,
              borderTop: 1,
              borderColor: 'divider',
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          >
            {material.manufacturer}
          </Typography>
        )}
      </CardContent>
    </StyledCard>
  )
}
