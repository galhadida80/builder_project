import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../../utils/dateLocale'
import { Avatar } from '../ui/Avatar'
import { EmptyState } from '../ui/EmptyState'
import {
  CameraAltIcon,
  ConstructionIcon as EquipmentIcon,
  CategoryIcon as MaterialIcon,
  MapIcon as AreaIcon,
  HistoryIcon,
} from '@/icons'
import { Box, Typography, Chip, Skeleton, SxProps, Theme } from '@/mui'

export interface ScanHistoryItem {
  id: string
  entityType: string
  entityId: string
  scannedAt: string
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
}

interface ScanHistoryListProps {
  scans: ScanHistoryItem[]
  loading?: boolean
  sx?: SxProps<Theme>
}

const ENTITY_TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: 'success' | 'error' | 'warning' | 'info' | 'default' }
> = {
  equipment: {
    icon: <EquipmentIcon sx={{ fontSize: 18 }} />,
    color: 'info',
  },
  material: {
    icon: <MaterialIcon sx={{ fontSize: 18 }} />,
    color: 'success',
  },
  area: {
    icon: <AreaIcon sx={{ fontSize: 18 }} />,
    color: 'warning',
  },
}

const DEFAULT_ENTITY_CONFIG = {
  icon: <CameraAltIcon sx={{ fontSize: 18 }} />,
  color: 'default' as const,
}

export default function ScanHistoryList({ scans, loading = false, sx }: ScanHistoryListProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Box sx={sx}>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'flex-start' }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="30%" height={20} sx={{ mb: 1 }} />
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={14} sx={{ mt: 1 }} />
            </Box>
          </Box>
        ))}
      </Box>
    )
  }

  if (scans.length === 0) {
    return (
      <EmptyState
        variant="no-data"
        icon={<HistoryIcon />}
        title={t('qrCode.noScanHistory')}
        description={t('qrCode.noScanHistoryDescription')}
        sx={sx}
      />
    )
  }

  const getUserFullName = (scan: ScanHistoryItem): string => {
    if (!scan.user) return t('common.unknown')
    const { firstName, lastName } = scan.user
    if (firstName && lastName) return `${firstName} ${lastName}`
    if (firstName) return firstName
    if (lastName) return lastName
    return scan.user.email
  }

  return (
    <Box sx={sx}>
      {scans.map((scan, index) => {
        const config = ENTITY_TYPE_CONFIG[scan.entityType] || DEFAULT_ENTITY_CONFIG
        const isLast = index === scans.length - 1

        return (
          <Box
            key={scan.id}
            sx={{
              display: 'flex',
              gap: 2,
              pb: isLast ? 0 : 2.5,
              position: 'relative',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 40,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: `${config.color}.light`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: `${config.color}.main`,
                  zIndex: 1,
                }}
              >
                {config.icon}
              </Box>

              {!isLast && (
                <Box
                  sx={{
                    width: 2,
                    flex: 1,
                    bgcolor: 'divider',
                    mt: 1,
                    mb: 1,
                    minHeight: 60,
                  }}
                />
              )}
            </Box>

            <Box sx={{ flex: 1, pt: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip
                  label={t(`qrCode.entityType.${scan.entityType}`, scan.entityType)}
                  size="small"
                  color={config.color}
                  variant="outlined"
                  sx={{ height: 24, fontWeight: 500 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {new Date(scan.scannedAt).toLocaleDateString(getDateLocale(), {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {' '}
                  {new Date(scan.scannedAt).toLocaleTimeString(getDateLocale(), {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar name={getUserFullName(scan)} size="small" />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {getUserFullName(scan)}
                  </Typography>
                  {scan.user?.email && (
                    <Typography variant="caption" color="text.secondary">
                      {scan.user.email}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
