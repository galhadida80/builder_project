import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@/mui'
import { KPICard } from '../ui/Card'
import { HealthAndSafetyIcon, WarningIcon, PersonIcon, GroupsIcon } from '@/icons'
import { safetyApi } from '@/api/safety'
import type { SafetyKPI } from '@/types/safety'

export default function SafetyKPICards() {
  const { projectId } = useParams<{ projectId: string }>()
  const { t } = useTranslation()
  const [kpiData, setKpiData] = useState<SafetyKPI | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchKPI = async () => {
      if (!projectId) return

      try {
        setLoading(true)
        setError(null)
        const data = await safetyApi.getKPI(projectId)
        setKpiData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load KPI data')
      } finally {
        setLoading(false)
      }
    }

    fetchKPI()
  }, [projectId])

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error" variant="body2">{error}</Typography>
      </Box>
    )
  }

  const incidentRate = kpiData ? kpiData.totalIncidents : 0
  const nearMissRate = kpiData ? kpiData.totalNearMisses : 0
  const trainingCompliance = kpiData && kpiData.totalTrainings > 0
    ? Math.round((kpiData.validTrainings / kpiData.totalTrainings) * 100)
    : 0
  const attendanceRate = kpiData && kpiData.totalTalkAttendees > 0
    ? Math.round((kpiData.totalAttended / kpiData.totalTalkAttendees) * 100)
    : 0

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
      <KPICard
        title={t('safety.totalIncidents', { defaultValue: 'Total Incidents' })}
        value={incidentRate}
        icon={<HealthAndSafetyIcon />}
        color="error"
        loading={loading}
      />
      <KPICard
        title={t('safety.nearMisses', { defaultValue: 'Near Misses' })}
        value={nearMissRate}
        icon={<WarningIcon />}
        color="warning"
        loading={loading}
      />
      <KPICard
        title={t('safety.trainingCompliance', { defaultValue: 'Training Compliance' })}
        value={`${trainingCompliance}%`}
        icon={<PersonIcon />}
        color={trainingCompliance >= 80 ? 'success' : trainingCompliance >= 50 ? 'warning' : 'error'}
        loading={loading}
      />
      <KPICard
        title={t('safety.talkAttendance', { defaultValue: 'Talk Attendance' })}
        value={`${attendanceRate}%`}
        icon={<GroupsIcon />}
        color={attendanceRate >= 80 ? 'success' : attendanceRate >= 50 ? 'warning' : 'error'}
        loading={loading}
      />
    </Box>
  )
}
