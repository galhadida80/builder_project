import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { KPICard } from '../components/ui/Card'
import { safetyApi } from '../api/safety'
import type { SafetyKPI } from '../types/safety'
import { useToast } from '../components/common/ToastProvider'
import {
  HealthAndSafetyIcon,
  WarningIcon,
  SecurityIcon,
  AssignmentIcon,
  GroupsIcon,
  ReportProblemIcon,
  TaskAltIcon,
  PeopleIcon,
} from '@/icons'
import { Box, Grid, Alert, Typography, Divider } from '@/mui'

export default function SafetyDashboardPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { showError } = useToast()
  const [kpi, setKpi] = useState<SafetyKPI | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (projectId) loadKPI()
  }, [projectId])
  const loadKPI = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await safetyApi.getKPI(projectId)
      setKpi(data)
    } catch {
      showError(t('safety.failedToLoadKPI'))
    } finally {
      setLoading(false)
    }
  }
  const incidentRate = kpi ? (kpi.totalIncidents > 0 ? ((kpi.incidentsBySeverity.critical || 0) + (kpi.incidentsBySeverity.high || 0)) / kpi.totalIncidents * 100 : 0) : 0
  const trainingComplianceRate = kpi && kpi.totalTrainings > 0 ? (kpi.validTrainings / kpi.totalTrainings * 100) : 0
  const attendanceRate = kpi && kpi.totalTalkAttendees > 0 ? (kpi.totalAttended / kpi.totalTalkAttendees * 100) : 0
  return (
    <Box>
      <PageHeader
        title={t('safety.dashboard')}
        breadcrumbs={[
          { label: t('common.projects'), path: '/projects' },
          { label: t('common.project'), path: `/projects/${projectId}` },
          { label: t('safety.dashboard') },
        ]}
      />
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('safety.dashboardDescription')}
        </Alert>
        {/* Incidents Section */}
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon fontSize="small" />
          {t('safety.incidents')}
        </Typography>
        <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title={t('safety.totalIncidents')}
              value={kpi?.totalIncidents || 0}
              icon={<ReportProblemIcon />}
              loading={loading}
              color="error"
              onClick={() => navigate(`/projects/${projectId}/safety/incidents`)}
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.25}>
            <KPICard
              title={t('safety.critical')}
              value={kpi?.incidentsBySeverity.critical || 0}
              loading={loading}
              color="error"
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.25}>
            <KPICard
              title={t('safety.high')}
              value={kpi?.incidentsBySeverity.high || 0}
              loading={loading}
              color="warning"
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.25}>
            <KPICard
              title={t('safety.medium')}
              value={kpi?.incidentsBySeverity.medium || 0}
              loading={loading}
              color="info"
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.25}>
            <KPICard
              title={t('safety.low')}
              value={kpi?.incidentsBySeverity.low || 0}
              loading={loading}
              color="success"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Near Misses Section */}
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon fontSize="small" />
          {t('safety.nearMisses')}
        </Typography>
        <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title={t('safety.totalNearMisses')}
              value={kpi?.totalNearMisses || 0}
              icon={<SecurityIcon />}
              loading={loading}
              color="warning"
              onClick={() => navigate(`/projects/${projectId}/safety/near-misses`)}
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.25}>
            <KPICard
              title={t('safety.highSeverity')}
              value={kpi?.nearMissesBySeverity.high || 0}
              loading={loading}
              color="error"
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.25}>
            <KPICard
              title={t('safety.mediumSeverity')}
              value={kpi?.nearMissesBySeverity.medium || 0}
              loading={loading}
              color="warning"
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.25}>
            <KPICard
              title={t('safety.lowSeverity')}
              value={kpi?.nearMissesBySeverity.low || 0}
              loading={loading}
              color="info"
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.25}>
            <KPICard
              title={t('safety.anonymous')}
              value={kpi?.anonymousNearMisses || 0}
              loading={loading}
              color="info"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Training Section */}
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon fontSize="small" />
          {t('safety.training')}
        </Typography>
        <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title={t('safety.totalTrainings')}
              value={kpi?.totalTrainings || 0}
              icon={<AssignmentIcon />}
              loading={loading}
              color="primary"
              onClick={() => navigate(`/projects/${projectId}/safety/training`)}
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.25}>
            <KPICard
              title={t('safety.valid')}
              value={kpi?.validTrainings || 0}
              loading={loading}
              color="success"
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.25}>
            <KPICard
              title={t('safety.expiringSoon')}
              value={kpi?.expiringSoonTrainings || 0}
              loading={loading}
              color="warning"
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.25}>
            <KPICard
              title={t('safety.expired')}
              value={kpi?.expiredTrainings || 0}
              loading={loading}
              color="error"
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.25}>
            <KPICard
              title={t('safety.trainedWorkers')}
              value={kpi?.uniqueTrainedWorkers || 0}
              loading={loading}
              color="info"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Toolbox Talks Section */}
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupsIcon fontSize="small" />
          {t('safety.toolboxTalks')}
        </Typography>
        <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title={t('safety.totalTalks')}
              value={kpi?.totalToolboxTalks || 0}
              icon={<GroupsIcon />}
              loading={loading}
              color="primary"
              onClick={() => navigate(`/projects/${projectId}/safety/toolbox-talks`)}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <KPICard
              title={t('safety.completedTalks')}
              value={kpi?.completedToolboxTalks || 0}
              loading={loading}
              color="success"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <KPICard
              title={t('safety.totalAttendees')}
              value={kpi?.totalTalkAttendees || 0}
              loading={loading}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <KPICard
              title={t('safety.attendanceRate')}
              value={`${attendanceRate.toFixed(0)}%`}
              loading={loading}
              color={attendanceRate >= 80 ? 'success' : attendanceRate >= 60 ? 'warning' : 'error'}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Summary Metrics */}
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HealthAndSafetyIcon fontSize="small" />
          {t('safety.safetyMetrics')}
        </Typography>
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          <Grid item xs={12} sm={4}>
            <KPICard
              title={t('safety.incidentRate')}
              value={`${incidentRate.toFixed(1)}%`}
              icon={<WarningIcon />}
              loading={loading}
              color={incidentRate < 20 ? 'success' : incidentRate < 40 ? 'warning' : 'error'}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <KPICard
              title={t('safety.trainingCompliance')}
              value={`${trainingComplianceRate.toFixed(0)}%`}
              icon={<TaskAltIcon />}
              loading={loading}
              color={trainingComplianceRate >= 80 ? 'success' : trainingComplianceRate >= 60 ? 'warning' : 'error'}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <KPICard
              title={t('safety.nearMissRatio')}
              value={kpi && kpi.totalIncidents > 0 ? `${(kpi.totalNearMisses / kpi.totalIncidents).toFixed(1)}:1` : 'N/A'}
              icon={<PeopleIcon />}
              loading={loading}
              color="info"
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}
