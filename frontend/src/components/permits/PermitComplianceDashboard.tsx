import { useTranslation } from 'react-i18next'
import { Box, Typography, Skeleton, Paper, styled, Grid, LinearProgress } from '@/mui'
import { WarningAmberIcon, ErrorIcon, CheckCircleIcon, InfoIcon, AssignmentIcon } from '@/icons'
import type { PermitComplianceReport } from '../../types/permit'

interface PermitComplianceDashboardProps {
  complianceReport: PermitComplianceReport | null
  loading?: boolean
}

interface ComplianceLevel {
  level: 'good' | 'warning' | 'critical'
  score: number
  label: string
  icon: React.ReactNode
  color: string
}

const DashboardContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 12,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}))

const MetricCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 8,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}))

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

export default function PermitComplianceDashboard({
  complianceReport,
  loading = false,
}: PermitComplianceDashboardProps) {
  const { t } = useTranslation()

  const calculateComplianceLevel = (): ComplianceLevel => {
    if (!complianceReport || complianceReport.totalPermits === 0) {
      return {
        level: 'warning',
        score: 0,
        label: t('permits.complianceStatus'),
        icon: <InfoIcon />,
        color: '#FFA726',
      }
    }

    const { totalPermits, expiredCount, expiringSoonCount, approvedCount, rejectedCount } = complianceReport

    let score = 100

    if (expiredCount > 0) {
      score -= (expiredCount / totalPermits) * 40
    }

    if (expiringSoonCount > 0) {
      score -= (expiringSoonCount / totalPermits) * 20
    }

    if (rejectedCount > 0) {
      score -= (rejectedCount / totalPermits) * 30
    }

    const approvalRate = (approvedCount / totalPermits) * 100
    if (approvalRate < 50) {
      score -= (50 - approvalRate) * 0.5
    }

    score = Math.max(0, Math.min(100, score))

    if (score >= 80) {
      return {
        level: 'good',
        score,
        label: t('permits.compliant'),
        icon: <CheckCircleIcon />,
        color: '#66BB6A',
      }
    } else if (score >= 50) {
      return {
        level: 'warning',
        score,
        label: t('permits.requiresAction'),
        icon: <WarningAmberIcon />,
        color: '#FFA726',
      }
    } else {
      return {
        level: 'critical',
        score,
        label: t('permits.nonCompliant'),
        icon: <ErrorIcon />,
        color: '#EF5350',
      }
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved':
        return '#66BB6A'
      case 'conditional':
        return '#42A5F5'
      case 'underReview':
        return '#FFA726'
      case 'applied':
        return '#AB47BC'
      case 'notApplied':
        return '#78909C'
      case 'rejected':
        return '#EF5350'
      case 'expired':
        return '#D32F2F'
      default:
        return '#9E9E9E'
    }
  }

  if (loading) {
    return (
      <DashboardContainer>
        <Skeleton width={250} height={32} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={4} key={i}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 3, borderRadius: 2 }} />
      </DashboardContainer>
    )
  }

  if (!complianceReport) {
    return (
      <DashboardContainer>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          {t('permits.complianceStatus')}
        </Typography>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
            minHeight: 200,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <AssignmentIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">{t('permits.noPermitsYet')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('permits.noPermitsYetDescription')}
            </Typography>
          </Box>
        </Box>
      </DashboardContainer>
    )
  }

  const complianceLevel = calculateComplianceLevel()
  const requiredPermitTypes = ['building_permit', 'occupancy_certificate', 'completion_certificate']
  const missingRequiredPermits = requiredPermitTypes.filter(
    (type) => !complianceReport.permitsByType[type] || complianceReport.permitsByType[type] === 0
  )

  return (
    <DashboardContainer>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {t('permits.complianceStatus')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: complianceLevel.color, display: 'flex' }}>
            {complianceLevel.icon}
          </Box>
          <Typography variant="body2" fontWeight={600} sx={{ color: complianceLevel.color }}>
            {complianceLevel.label}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard elevation={2}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
              {t('permits.totalPermits')}
            </Typography>
            <Typography variant="h4" fontWeight={700} color="primary">
              {complianceReport.totalPermits}
            </Typography>
          </MetricCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard elevation={2}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
              {t('permits.complianceStatus')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: complianceLevel.color }}>
                {Math.round(complianceLevel.score)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={complianceLevel.score}
              sx={{
                mt: 1,
                height: 6,
                borderRadius: 3,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  bgcolor: complianceLevel.color,
                  borderRadius: 3,
                },
              }}
            />
          </MetricCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard elevation={2}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
              {t('permits.expiringIn30Days')}
            </Typography>
            <Typography variant="h4" fontWeight={700} color="warning.main">
              {complianceReport.expiringSoonCount}
            </Typography>
          </MetricCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard elevation={2}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
              {t('permits.expired')}
            </Typography>
            <Typography variant="h4" fontWeight={700} color="error.main">
              {complianceReport.expiredCount}
            </Typography>
          </MetricCard>
        </Grid>
      </Grid>

      {missingRequiredPermits.length > 0 && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: 'error.light',
            border: '1px solid',
            borderColor: 'error.main',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <ErrorIcon sx={{ color: 'error.main' }} />
            <Typography variant="subtitle2" fontWeight={600} color="error.main">
              {t('permits.requirements')}
            </Typography>
          </Box>
          <Typography variant="body2" color="error.dark">
            {missingRequiredPermits.map((type) => t(`permits.permitTypes.${type.replace(/_/g, '')}`)).join(', ')}
          </Typography>
        </Box>
      )}

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
    </DashboardContainer>
  )
}
