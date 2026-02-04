import { Card, CardContent, CardMedia, Box, Typography, Chip } from '@mui/material'
import { styled } from '@mui/material/styles'
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
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}))

const MaterialImage = styled(CardMedia)(({ theme }) => ({
  height: 160,
  backgroundColor: theme.palette.grey[100],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.grey[400],
  position: 'relative',
}))

const LowStockBadge = styled(Chip)(({ theme }) => ({
  position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: theme.palette.warning.main,
  color: theme.palette.common.white,
  fontWeight: 600,
  fontSize: '0.75rem',
  height: 24,
}))

const InfoRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
}))

export function MaterialCard({ material, onClick, lowStockThreshold = 10 }: MaterialCardProps) {
  const isLowStock = material.quantity !== undefined && material.quantity < lowStockThreshold
  const imageUrl = material.documents?.[0]?.storagePath

  return (
    <StyledCard onClick={onClick}>
      <MaterialImage
        image={imageUrl}
        title={material.name}
      >
        {!imageUrl && <InventoryIcon sx={{ fontSize: 64 }} />}
        {isLowStock && (
          <LowStockBadge
            icon={<WarningAmberIcon sx={{ fontSize: '1rem' }} />}
            label="Low Stock"
            size="small"
          />
        )}
      </MaterialImage>

      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.3,
            minHeight: '2.6em',
          }}
        >
          {material.name}
        </Typography>

        {material.materialType && (
          <Chip
            label={material.materialType}
            size="small"
            sx={{
              mb: 1.5,
              bgcolor: 'primary.main',
              color: 'white',
              fontWeight: 500,
              fontSize: '0.75rem',
            }}
          />
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <InfoRow>
            <InventoryIcon sx={{ fontSize: '1rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
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
              <LocationOnIcon sx={{ fontSize: '1rem' }} />
              <Typography
                variant="body2"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
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
              mt: 1.5,
              pt: 1.5,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            {material.manufacturer}
          </Typography>
        )}
      </CardContent>
    </StyledCard>
  )
}
