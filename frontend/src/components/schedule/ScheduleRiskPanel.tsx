import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Card, KPICard } from '../ui/Card'
import { StatusBadge } from '../ui/StatusBadge'
import { EmptyState } from '../ui/EmptyState'
import { scheduleRiskApi } from '../../api/scheduleRisk'
import type { ProjectRiskSummary, RiskLevel } from '../../types/scheduleRisk'
import { useToast } from '../common/ToastProvider'
import {
  WarningIcon,
  ScheduleIcon,
  CheckCircleIcon,
  ErrorIcon,
  WarningAmberIcon,
  TimelineIcon,
} from '@/icons'
import {
  Box,
  Typography,
  Skeleton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  alpha,
} from '@/mui'

const RISK_CONFIG: Record<RiskLevel, { color: string; icon: React.ReactNode; label: string }> = {
  low: { color: '#22C55E', icon: <CheckCircleIcon fontSize="small" />, label: 'Low' },
  medium: { color: '#F59E0B', icon: <WarningAmberIcon fontSize="small" />, label: 'Medium' },
  high: { color: '#F97316', icon: <WarningIcon fontSize="small" />, label: 'High' },
  critical: { color: '#EF4444', icon: <ErrorIcon fontSize="small" />, label: 'Critical' },
}

interface ScheduleRiskPanelProps {
  projectId?: string
  onRefresh?: () => void
}

export function ScheduleRiskPanel({ projectId: propProjectId, onRefresh }: ScheduleRiskPanelProps) {
  const { t } = useTranslation()
  const params = useParams()
  const { showError } = useToast()
  const projectId = propProjectId || params.projectId

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ProjectRiskSummary | null>(null)

  useEffect(() => {
    if (projectId) loadRiskSummary()
  }, [projectId])

  const loadRiskSummary = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await scheduleRiskApi.getProjectRiskSummary(projectId)
      setSummary(data)
    } catch {
      showError(t('scheduleRisk.loadFailed', 'Failed to load schedule risk analysis'))
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return '#22C55E'
    if (score >= 0.6) return '#F59E0B'
    return '#EF4444'
  }

  const formatConfidenceScore = (score: number) => `${Math.round(score * 100)}%`

  const formatLastAnalyzed = (dateStr?: string) => {
    if (!dateStr) return t('scheduleRisk.notAnalyzed', 'Not analyzed yet')
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return t('scheduleRisk.minutesAgo', { count: diffMins, defaultValue: `${diffMins} minutes ago` })
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return t('scheduleRisk.hoursAgo', { count: diffHours, defaultValue: `${diffHours} hours ago` })
    const diffDays = Math.floor(diffHours / 24)
    return t('scheduleRisk.daysAgo', { count: diffDays, defaultValue: `${diffDays} days ago` })
  }

  if (loading) {
    return (
      <Card sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton width={180} height={28} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
          <Skeleton variant="rounded" height={100} />
          <Skeleton variant="rounded" height={100} />
          <Skeleton variant="rounded" height={100} />
        </Box>
        <Skeleton variant="rounded" height={120} />
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card sx={{ p: 3 }}>
        <EmptyState
          icon={<ScheduleIcon sx={{ fontSize: 48, color: 'text.disabled' }} />}
          title={t('scheduleRisk.noDataTitle', 'No Risk Analysis Available')}
          description={t('scheduleRisk.noDataDescription', 'Schedule risk analysis will appear here once tasks are created and analyzed')}
        />
      </Card>
    )
  }

  const confidenceScore = summary.overallConfidenceScore
  const confidenceColor = getConfidenceColor(confidenceScore)

  return (
    <Card sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TimelineIcon sx={{ color: 'primary.main', fontSize: { xs: 20, sm: 24 } }} />
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {t('scheduleRisk.title', 'Schedule Risk Analysis')}
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            p: { xs: 1.25, sm: 1.5, md: 2 },
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.25 }}>
            {t('scheduleRisk.confidenceScore', 'Confidence Score')}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: confidenceColor,
              lineHeight: 1.2,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.625rem' },
            }}
          >
            {formatConfidenceScore(confidenceScore)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
            {t('scheduleRisk.updated', 'Updated')} {formatLastAnalyzed(summary.lastAnalyzedAt)}
          </Typography>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            p: { xs: 1.25, sm: 1.5, md: 2 },
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.25 }}>
            {t('scheduleRisk.atRiskTasks', 'At-Risk Tasks')}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: summary.atRiskTasks > 0 ? '#F97316' : 'text.primary',
              lineHeight: 1.2,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.625rem' },
            }}
          >
            {summary.atRiskTasks} / {summary.totalTasks}
          </Typography>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            p: { xs: 1.25, sm: 1.5, md: 2 },
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.25 }}>
            {t('scheduleRisk.criticalPath', 'Critical Path Length')}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.2,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.625rem' },
            }}
          >
            {summary.criticalPathLength} {t('scheduleRisk.days', 'days')}
          </Typography>
        </Box>
      </Box>

      {/* Top Risks List */}
      {summary.topRisks && summary.topRisks.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {t('scheduleRisk.topRisks', 'Top Risks')}
          </Typography>
          <List sx={{ p: 0 }}>
            {summary.topRisks.slice(0, 5).map((risk, index) => {
              const riskConfig = RISK_CONFIG[risk.riskLevel]
              return (
                <ListItem
                  key={risk.id}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    bgcolor: (theme) => alpha(theme.palette.background.default, 0.4),
                    border: 1,
                    borderColor: 'divider',
                    p: { xs: 1, sm: 1.5 },
                    '&:last-child': { mb: 0 },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: { xs: 32, sm: 40 } }}>
                    <Box sx={{ color: riskConfig.color }}>{riskConfig.icon}</Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: '0.875rem', sm: '0.95rem' } }}>
                          {t('scheduleRisk.taskRisk', { task: risk.taskId, defaultValue: `Task ${risk.taskId}` })}
                        </Typography>
                        <Chip
                          label={t(`scheduleRisk.riskLevel.${risk.riskLevel}`, riskConfig.label)}
                          size="small"
                          sx={{
                            bgcolor: (theme) => alpha(riskConfig.color, 0.15),
                            color: riskConfig.color,
                            fontWeight: 600,
                            fontSize: { xs: '0.65rem', sm: '0.7rem' },
                            height: { xs: 20, sm: 24 },
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                          {t('scheduleRisk.confidence', 'Confidence')}: {formatConfidenceScore(risk.confidenceScore)}
                          {risk.predictedDelayDays !== undefined && risk.predictedDelayDays > 0 && (
                            <> • {t('scheduleRisk.predictedDelay', { days: risk.predictedDelayDays, defaultValue: `~${risk.predictedDelayDays} days delay` })}</>
                          )}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              )
            })}
          </List>
        </Box>
      )}

      {(!summary.topRisks || summary.topRisks.length === 0) && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('scheduleRisk.noRisksDetected', 'No schedule risks detected')}
          </Typography>
        </Box>
      )}
    </Card>
  )
}
