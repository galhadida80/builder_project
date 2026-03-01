import { useTranslation } from 'react-i18next'
import { Box, Typography, Skeleton, Paper, styled, Grid, LinearProgress, useTheme } from '@/mui'
import { WarningAmberIcon, ErrorIcon, CheckCircleIcon, InfoIcon, AssignmentIcon } from '@/icons'
import type { PermitComplianceReport } from '../../types/permit'
import PermitStatusBreakdown from './PermitStatusBreakdown'

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

export default function PermitComplianceDashboard({
  complianceReport,
  loading = false,
}: PermitComplianceDashboardProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  const calculateComplianceLevel = (): ComplianceLevel => {
    if (!complianceReport || complianceReport.totalPermits === 0) {
      return {
        level: 'warning',
        score: 0,
        label: t('permits.complianceStatus'),
        icon: <InfoIcon />,
        color: theme.palette.warning.main,
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
        color: theme.palette.success.main,
      }
    } else if (score >= 50) {
      return {
        level: 'warning',
        score,
        label: t('permits.requiresAction'),
        icon: <WarningAmberIcon />,
        color: theme.palette.warning.main,
      }
    } else {
      return {
        level: 'critical',
        score,
        label: t('permits.nonCompliant'),
        icon: <ErrorIcon />,
        color: theme.palette.error.main,
      }
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

      <PermitStatusBreakdown complianceReport={complianceReport} />
    </DashboardContainer>
  )
}
