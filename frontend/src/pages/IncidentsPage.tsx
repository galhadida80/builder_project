import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge, SeverityBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField } from '../components/ui/TextField'
import FilterChips from '../components/ui/FilterChips'
import { safetyApi } from '../api/safety'
import type { SafetyIncident, IncidentSeverity, IncidentStatus } from '../types/safety'
import { useToast } from '../components/common/ToastProvider'
import { AddIcon, VisibilityIcon } from '@/icons'
import {
  Box,
  Typography,
  MenuItem,
  Skeleton,
  TextField as MuiTextField,
  useMediaQuery,
  useTheme,
} from '@/mui'

const SEVERITY_BORDER_COLORS: Record<IncidentSeverity, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#CA8A04',
  low: '#22C55E',
}

function formatRelativeTime(
  dateStr: string,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return t('common.justNow')
  if (diffMinutes < 60) return t('common.minutesAgo', { count: diffMinutes })
  if (diffHours < 24) return t('common.hoursAgo', { count: diffHours })
  if (diffDays === 1) return t('common.yesterday')
  if (diffDays < 30) return t('common.daysAgo', { count: diffDays })
  return date.toLocaleDateString(getDateLocale())
}

export default function IncidentsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { showError } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [incidents, setIncidents] = useState<SafetyIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | ''>('')

  useEffect(() => {
    if (projectId) loadIncidents()
  }, [projectId, activeTab, severityFilter, searchQuery])

  const loadIncidents = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params: {
        status?: IncidentStatus
        severity?: IncidentSeverity
        search?: string
      } = {}
      if (activeTab !== 'all') params.status = activeTab as IncidentStatus
      if (severityFilter) params.severity = severityFilter
      if (searchQuery) params.search = searchQuery
      const result = await safetyApi.incidents.list(projectId, params)
      setIncidents(result)
    } catch (error) {
      console.error('Failed to load incidents:', error)
      showError(t('safety.incidents.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (incident: SafetyIncident) => {
    navigate(`/projects/${projectId}/safety/incidents/${incident.id}`)
  }

  const handleCreateNew = () => {
    navigate(`/projects/${projectId}/safety/incidents/new`)
  }

  const getStatusCounts = () => {
    return {
      all: incidents.length,
      open: incidents.filter((i) => i.status === 'open').length,
      investigating: incidents.filter((i) => i.status === 'investigating').length,
      resolved: incidents.filter((i) => i.status === 'resolved').length,
      closed: incidents.filter((i) => i.status === 'closed').length,
    }
  }

  const getSeverityCounts = () => {
    return {
      critical: incidents.filter((i) => i.severity === 'critical').length,
      high: incidents.filter((i) => i.severity === 'high').length,
      medium: incidents.filter((i) => i.severity === 'medium').length,
      low: incidents.filter((i) => i.severity === 'low').length,
    }
  }

  const statusCounts = getStatusCounts()
  const severityCounts = getSeverityCounts()

  const statusFilterItems = [
    { label: t('safety.incidents.status_all'), value: 'all', count: statusCounts.all },
    { label: t('safety.incidents.status_open'), value: 'open', count: statusCounts.open },
    {
      label: t('safety.incidents.status_investigating'),
      value: 'investigating',
      count: statusCounts.investigating,
    },
    { label: t('safety.incidents.status_resolved'), value: 'resolved', count: statusCounts.resolved },
    { label: t('safety.incidents.status_closed'), value: 'closed', count: statusCounts.closed },
  ]

  const columns: Column<SafetyIncident>[] = [
    {
      id: 'incidentNumber',
      label: t('safety.incidents.number'),
      minWidth: isMobile ? 80 : 100,
      render: (incident) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          #{incident.incidentNumber}
        </Typography>
      ),
    },
    {
      id: 'title',
      label: t('safety.incidents.title'),
      minWidth: isMobile ? 150 : 250,
      render: (incident) => (
        <Box>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {incident.title}
          </Typography>
          {!isMobile && incident.location && (
            <Typography variant="caption" color="text.secondary">
              {incident.location}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'severity',
      label: t('safety.incidents.severity'),
      minWidth: isMobile ? 100 : 120,
      render: (incident) => <SeverityBadge severity={incident.severity} />,
    },
    {
      id: 'status',
      label: t('common.status'),
      minWidth: isMobile ? 100 : 120,
      render: (incident) => <StatusBadge status={incident.status} />,
    },
    {
      id: 'occurredAt',
      label: t('safety.incidents.occurredAt'),
      minWidth: isMobile ? 100 : 150,
      render: (incident) => (
        <Typography variant="caption" color="text.secondary">
          {formatRelativeTime(incident.occurredAt, t)}
        </Typography>
      ),
    },
  ]

  if (!isMobile) {
    columns.push({
      id: 'area',
      label: t('areas.area'),
      minWidth: 120,
      render: (incident) =>
        incident.area ? (
          <Typography variant="caption">{incident.area.name}</Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            -
          </Typography>
        ),
    })
  }

  columns.push({
    id: 'actions',
    label: '',
    minWidth: 60,
    align: 'center',
    render: (incident) => (
      <Button
        variant="tertiary"
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          handleRowClick(incident)
        }}
        sx={{ minWidth: 'auto', p: 0.5 }}
      >
        <VisibilityIcon fontSize="small" />
      </Button>
    ),
  })

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      <PageHeader title={t('safety.incidents.title')} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('safety.incidents.title')}</Typography>
        <Button
          variant="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
          size={isMobile ? 'small' : 'medium'}
        >
          {t('safety.incidents.createNew')}
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <FilterChips items={statusFilterItems} value={activeTab} onChange={setActiveTab} />
      </Box>

      <Card sx={{ p: isMobile ? 2 : 3, mt: 3 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 3,
            flexDirection: isMobile ? 'column' : 'row',
          }}
        >
          <SearchField
            placeholder={t('safety.incidents.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <MuiTextField
            select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as IncidentSeverity | '')}
            size="small"
            sx={{ minWidth: isMobile ? '100%' : 200 }}
            label={t('safety.incidents.filterBySeverity')}
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            <MenuItem value="critical">{t('safety.incidents.severity_critical')}</MenuItem>
            <MenuItem value="high">{t('safety.incidents.severity_high')}</MenuItem>
            <MenuItem value="medium">{t('safety.incidents.severity_medium')}</MenuItem>
            <MenuItem value="low">{t('safety.incidents.severity_low')}</MenuItem>
          </MuiTextField>
        </Box>

        {loading ? (
          <Box>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={60} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : (
          <DataTable
            columns={columns}
            rows={incidents}
            getRowId={(row) => row.id}
            onRowClick={handleRowClick}
            emptyMessage={t('safety.incidents.noIncidents')}
          />
        )}
      </Card>
    </Box>
  )
}
