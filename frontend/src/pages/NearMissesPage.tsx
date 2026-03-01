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
import SummaryBar from '../components/ui/SummaryBar'
import FilterChips from '../components/ui/FilterChips'
import { safetyApi } from '../api/safety'
import type { NearMiss, NearMissSummary, NearMissSeverity, NearMissStatus } from '../types/safety'
import { useToast } from '../components/common/ToastProvider'
import { AddIcon, VisibilityIcon, SecurityIcon } from '@/icons'
import { Box, Typography, Chip, MenuItem, Tooltip, TablePagination, useMediaQuery, useTheme, TextField as MuiTextField } from '@/mui'

const SEVERITY_BORDER_COLORS: Record<NearMissSeverity, string> = {
  high: '#EA580C',
  medium: '#CA8A04',
  low: '#22C55E',
}

function formatRelativeTime(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return t('defects.justNow')
  if (diffMinutes < 60) return t('defects.minutesAgo', { count: diffMinutes })
  if (diffHours < 24) return t('defects.hoursAgo', { count: diffHours })
  if (diffDays === 1) return t('defects.yesterday')
  if (diffDays < 30) return t('defects.daysAgo', { count: diffDays })
  return date.toLocaleDateString(getDateLocale())
}

export default function NearMissesPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { showError } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [nearMisses, setNearMisses] = useState<NearMiss[]>([])
  const [totalNearMisses, setTotalNearMisses] = useState(0)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [summary, setSummary] = useState<NearMissSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [anonymousFilter, setAnonymousFilter] = useState<string>('all')

  useEffect(() => {
    if (projectId) loadSummary()
  }, [projectId])

  useEffect(() => {
    if (projectId) loadNearMisses()
  }, [projectId, page, rowsPerPage, activeTab, severityFilter, searchQuery, anonymousFilter])

  const loadSummary = async () => {
    if (!projectId) return
    try {
      const data = await safetyApi.nearMisses.getSummary(projectId)
      setSummary(data)
    } catch (error) {
      console.error('Failed to load summary:', error)
    }
  }

  const loadNearMisses = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params: { status?: NearMissStatus; severity?: NearMissSeverity; search?: string; isAnonymous?: boolean } = {}
      if (activeTab !== 'all') params.status = activeTab as NearMissStatus
      if (severityFilter) params.severity = severityFilter as NearMissSeverity
      if (searchQuery) params.search = searchQuery
      if (anonymousFilter === 'anonymous') params.isAnonymous = true
      else if (anonymousFilter === 'identified') params.isAnonymous = false

      const result = await safetyApi.nearMisses.list(projectId, params)
      setNearMisses(result)
      setTotalNearMisses(result.length)
    } catch (error) {
      console.error('Failed to load near misses:', error)
      showError(t('safety.failedToLoadNearMisses'))
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<NearMiss>[] = [
    {
      id: 'nearMissNumber',
      label: '#',
      minWidth: 70,
      sortable: true,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 4,
              height: 28,
              borderRadius: 1,
              bgcolor: SEVERITY_BORDER_COLORS[row.severity] || SEVERITY_BORDER_COLORS.low,
              flexShrink: 0,
            }}
          />
          <Typography variant="body2" fontWeight={600}>
            #{row.nearMissNumber}
          </Typography>
          {row.isAnonymous && (
            <Tooltip title={t('safety.anonymousReport')} arrow>
              <SecurityIcon fontSize="small" color="action" />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      id: 'title',
      label: t('safety.title'),
      minWidth: 220,
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}
        >
          {row.title}
        </Typography>
      ),
    },
    {
      id: 'location',
      label: t('safety.location'),
      minWidth: 130,
      hideOnMobile: true,
      render: (row) => (
        <Typography variant="body2" color={row.area ? 'text.primary' : 'text.secondary'}>
          {row.area
            ? `${row.area.name}${row.area.floorNumber != null ? ` / ${t('defects.floor')} ${row.area.floorNumber}` : ''}`
            : row.location || '-'}
        </Typography>
      ),
    },
    {
      id: 'severity',
      label: t('safety.severity'),
      minWidth: 110,
      hideOnMobile: true,
      render: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      id: 'status',
      label: t('common.status'),
      minWidth: 120,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'reportedBy',
      label: t('safety.reportedBy'),
      minWidth: 140,
      hideOnMobile: true,
      render: (row) => (
        <Typography variant="body2" color={row.reportedBy ? 'text.primary' : 'text.secondary'}>
          {row.isAnonymous ? t('safety.anonymous') : row.reportedBy?.contactName || '-'}
        </Typography>
      ),
    },
    {
      id: 'createdAt',
      label: t('common.date'),
      minWidth: 100,
      sortable: true,
      hideOnMobile: true,
      render: (row) => (
        <Tooltip title={new Date(row.createdAt).toLocaleDateString(getDateLocale())} arrow>
          <Typography variant="body2" color="text.secondary">
            {formatRelativeTime(row.createdAt, t)}
          </Typography>
        </Tooltip>
      ),
    },
    {
      id: 'actions',
      label: '',
      minWidth: 90,
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <Button
          variant="tertiary"
          size="small"
          icon={<VisibilityIcon />}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/projects/${projectId}/safety/near-misses/${row.id}`)
          }}
        >
          {t('buttons.view')}
        </Button>
      ),
    },
  ]

  return (
    <Box sx={{ p: { xs: 1, sm: 1.5, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('safety.nearMisses')}
        subtitle={t('safety.nearMissesSubtitle')}
        breadcrumbs={[
          { label: t('nav.projects'), href: '/projects' },
          { label: t('common.project'), href: `/projects/${projectId}` },
          { label: t('safety.dashboard'), href: `/projects/${projectId}/safety` },
          { label: t('safety.nearMisses') },
        ]}
        actions={
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Button
                variant="primary"
                icon={<AddIcon />}
                onClick={() => navigate(`/projects/${projectId}/safety/near-misses/new`)}
              >
                {t('safety.reportNearMiss')}
              </Button>
            </Box>
          </Box>
        }
      />

      {summary && (
        <Box sx={{ mb: 2 }}>
          <SummaryBar
            items={[
              { label: t('safety.total'), value: summary.total },
              { label: t('safety.open'), value: summary.openCount, color: theme.palette.error.main },
              { label: t('safety.inProgress'), value: summary.inProgressCount, color: theme.palette.warning.main },
              { label: t('safety.resolved'), value: summary.resolvedCount, color: theme.palette.success.main },
              { label: t('safety.anonymous'), value: summary.anonymousCount, color: theme.palette.info.main },
            ]}
          />
        </Box>
      )}

      <Card>
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 1,
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <MuiTextField
                select
                size="small"
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value)
                  setPage(1)
                }}
                label={t('safety.severity')}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="high">{t('safety.high')}</MenuItem>
                <MenuItem value="medium">{t('safety.medium')}</MenuItem>
                <MenuItem value="low">{t('safety.low')}</MenuItem>
              </MuiTextField>

              <MuiTextField
                select
                size="small"
                value={anonymousFilter}
                onChange={(e) => {
                  setAnonymousFilter(e.target.value)
                  setPage(1)
                }}
                label={t('safety.reportType')}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="all">{t('common.all')}</MenuItem>
                <MenuItem value="anonymous">{t('safety.anonymous')}</MenuItem>
                <MenuItem value="identified">{t('safety.identified')}</MenuItem>
              </MuiTextField>

              <SearchField
                placeholder={t('safety.searchNearMisses')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <FilterChips
              items={[
                { label: t('common.all'), value: 'all', count: summary?.total ?? 0 },
                { label: t('safety.open'), value: 'open', count: summary?.openCount ?? 0 },
                { label: t('safety.inProgress'), value: 'in_progress', count: summary?.inProgressCount ?? 0 },
                { label: t('safety.resolved'), value: 'resolved', count: summary?.resolvedCount ?? 0 },
                { label: t('safety.closed'), value: 'closed', count: summary?.closedCount ?? 0 },
              ]}
              value={activeTab}
              onChange={(val) => {
                setActiveTab(val)
                setPage(1)
              }}
            />
          </Box>

          {isMobile ? (
            <Box>
              {loading ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  {t('common.loading')}
                </Typography>
              ) : nearMisses.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  {t('safety.noNearMisses')}
                </Typography>
              ) : (
                nearMisses.map((nearMiss) => (
                  <Card
                    key={nearMiss.id}
                    sx={{ mb: 1.5, cursor: 'pointer', border: '1px solid', borderColor: 'divider' }}
                    onClick={() => navigate(`/projects/${projectId}/safety/near-misses/${nearMiss.id}`)}
                  >
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          #{nearMiss.nearMissNumber}
                        </Typography>
                        {nearMiss.isAnonymous && (
                          <Chip
                            label={t('safety.anonymous')}
                            size="small"
                            color="info"
                            icon={<SecurityIcon fontSize="small" />}
                          />
                        )}
                        <Box sx={{ ml: 'auto' }}>
                          <SeverityBadge severity={nearMiss.severity} />
                        </Box>
                      </Box>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        {nearMiss.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusBadge status={nearMiss.status} />
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(nearMiss.createdAt, t)}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                ))
              )}
            </Box>
          ) : (
            <DataTable
              columns={columns}
              rows={nearMisses}
              getRowId={(row) => row.id}
              onRowClick={(row) => navigate(`/projects/${projectId}/safety/near-misses/${row.id}`)}
              pagination={false}
              emptyVariant="no-results"
              emptyTitle={t('safety.noNearMisses')}
              emptyDescription={t('safety.noNearMissesDescription')}
            />
          )}

          {totalNearMisses > rowsPerPage && (
            <TablePagination
              component="div"
              count={totalNearMisses}
              page={page - 1}
              rowsPerPage={rowsPerPage}
              onPageChange={(_, newPage) => setPage(newPage + 1)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10))
                setPage(1)
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
              labelRowsPerPage={t('table.rowsPerPage')}
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} ${t('table.of')} ${count !== -1 ? count : `>${to}`}`
              }
            />
          )}
        </Box>
      </Card>

      {/* Mobile FAB */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Button
            variant="primary"
            icon={<AddIcon />}
            onClick={() => navigate(`/projects/${projectId}/safety/near-misses/new`)}
          >
            {t('safety.reportNearMiss')}
          </Button>
        </Box>
      )}
    </Box>
  )
}
