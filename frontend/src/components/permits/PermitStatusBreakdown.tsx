import { useTranslation } from 'react-i18next'
import { Box, Typography, styled, useTheme } from '@/mui'
import type { PermitComplianceReport } from '../../types/permit'

interface PermitStatusBreakdownProps {
  complianceReport: PermitComplianceReport
}

const StatusGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: theme.spacing(1.5),
  marginTop: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: theme.spacing(1),
  },
}))

interface StatusChipProps {
  statusColor: string
}

const StatusChip = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'statusColor',
})<StatusChipProps>(({ theme, statusColor }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(1.5),
  borderRadius: 8,
  border: `2px solid ${statusColor}`,
  backgroundColor: theme.palette.mode === 'dark'
    ? `${statusColor}20`
    : `${statusColor}10`,
  '& .status-label': {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    marginBottom: theme.spacing(0.5),
  },
  '& .status-count': {
    color: statusColor,
    fontWeight: 700,
    fontSize: '1.5rem',
  },
}))

export default function PermitStatusBreakdown({ complianceReport }: PermitStatusBreakdownProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved':
        return theme.palette.success.main
      case 'conditional':
        return theme.palette.info.main
      case 'underReview':
        return theme.palette.warning.main
      case 'applied':
        return theme.palette.secondary.main
      case 'notApplied':
        return theme.palette.text.secondary
      case 'rejected':
        return theme.palette.error.main
      case 'expired':
        return theme.palette.error.dark
      default:
        return theme.palette.grey[500]
    }
  }

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
        {t('permits.status')}
      </Typography>
      <StatusGrid>
        <StatusChip statusColor={getStatusColor('approved')}>
          <Typography className="status-label">{t('permits.statuses.approved')}</Typography>
          <Typography className="status-count">{complianceReport.approvedCount}</Typography>
        </StatusChip>

        <StatusChip statusColor={getStatusColor('conditional')}>
          <Typography className="status-label">{t('permits.statuses.conditional')}</Typography>
          <Typography className="status-count">{complianceReport.conditionalCount}</Typography>
        </StatusChip>

        <StatusChip statusColor={getStatusColor('underReview')}>
          <Typography className="status-label">{t('permits.statuses.underReview')}</Typography>
          <Typography className="status-count">{complianceReport.underReviewCount}</Typography>
        </StatusChip>

        <StatusChip statusColor={getStatusColor('applied')}>
          <Typography className="status-label">{t('permits.statuses.applied')}</Typography>
          <Typography className="status-count">{complianceReport.appliedCount}</Typography>
        </StatusChip>

        <StatusChip statusColor={getStatusColor('notApplied')}>
          <Typography className="status-label">{t('permits.statuses.notApplied')}</Typography>
          <Typography className="status-count">{complianceReport.notAppliedCount}</Typography>
        </StatusChip>

        <StatusChip statusColor={getStatusColor('rejected')}>
          <Typography className="status-label">{t('permits.statuses.rejected')}</Typography>
          <Typography className="status-count">{complianceReport.rejectedCount}</Typography>
        </StatusChip>

        <StatusChip statusColor={getStatusColor('expired')}>
          <Typography className="status-label">{t('permits.statuses.expired')}</Typography>
          <Typography className="status-count">{complianceReport.expiredCount}</Typography>
        </StatusChip>
      </StatusGrid>
    </Box>
  )
}
