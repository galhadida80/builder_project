import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable } from '../components/ui/DataTable'
import { PageHeader } from '../components/ui/Breadcrumbs'
import SummaryBar from '../components/ui/SummaryBar'
import FilterChips from '../components/ui/FilterChips'
import { NearMissFilters } from '../components/safety/NearMissFilters'
import NearMissCard from '../components/safety/NearMissCard'
import { useNearMissTableColumns } from '../components/safety/NearMissTableColumns'
import { safetyApi } from '../api/safety'
import type { NearMiss, NearMissSummary, NearMissSeverity, NearMissStatus } from '../types/safety'
import { useToast } from '../components/common/ToastProvider'
import { AddIcon } from '@/icons'
import { Box, Typography, TablePagination, useMediaQuery, useTheme } from '@/mui'

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

  const columns = useNearMissTableColumns()

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
      const params: {
        status?: NearMissStatus
        severity?: NearMissSeverity
        search?: string
        isAnonymous?: boolean
      } = {}
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
          <NearMissFilters
            severityFilter={severityFilter}
            anonymousFilter={anonymousFilter}
            searchQuery={searchQuery}
            onSeverityChange={(val) => {
              setSeverityFilter(val)
              setPage(1)
            }}
            onAnonymousChange={(val) => {
              setAnonymousFilter(val)
              setPage(1)
            }}
            onSearchChange={setSearchQuery}
          />

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
                  <NearMissCard
                    key={nearMiss.id}
                    nearMiss={nearMiss}
                    onClick={() => navigate(`/projects/${projectId}/safety/near-misses/${nearMiss.id}`)}
                  />
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
