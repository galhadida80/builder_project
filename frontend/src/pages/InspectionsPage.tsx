import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import MuiTextField from '@mui/material/TextField'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorIcon from '@mui/icons-material/Error'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AssignmentIcon from '@mui/icons-material/Assignment'
import VisibilityIcon from '@mui/icons-material/Visibility'
import FilterListIcon from '@mui/icons-material/FilterList'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { SeverityBadge } from '../components/ui/StatusBadge'
import { Tabs } from '../components/ui/Tabs'
import { FormModal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField, SearchField } from '../components/ui/TextField'
import { inspectionsApi } from '../api/inspections'
import type {
  Inspection, InspectionConsultantType, InspectionStageTemplate, InspectionSummary
} from '../types'

export default function InspectionsPage() {
  const { projectId } = useParams()
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [consultantTypes, setConsultantTypes] = useState<InspectionConsultantType[]>([])
  const [summary, setSummary] = useState<InspectionSummary | null>(null)
  const [selectedType, setSelectedType] = useState<InspectionConsultantType | null>(null)
  const [stageTemplates, setStageTemplates] = useState<InspectionStageTemplate[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newInspection, setNewInspection] = useState({ consultantTypeId: '', scheduledDate: '', notes: '' })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [types, projectInspections, inspSummary] = await Promise.all([
        inspectionsApi.getConsultantTypes(),
        inspectionsApi.getProjectInspections(projectId),
        inspectionsApi.getInspectionSummary(projectId)
      ])
      setConsultantTypes(types)
      setInspections(projectInspections)
      setSummary(inspSummary)
    } catch (error) {
      console.error('Failed to load inspections:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStageTemplates = async (consultantTypeId: string) => {
    const templates = await inspectionsApi.getStageTemplates(consultantTypeId)
    setStageTemplates(templates)
  }

  const handleTypeSelect = async (type: InspectionConsultantType) => {
    setSelectedType(type)
    await loadStageTemplates(type.id)
  }

  const handleCreateInspection = async () => {
    if (!projectId) return
    await inspectionsApi.createInspection(projectId, newInspection)
    setDialogOpen(false)
    setNewInspection({ consultantTypeId: '', scheduledDate: '', notes: '' })
    loadData()
  }

  const filteredInspections = inspections.filter(inspection => {
    if (activeTab !== 'all' && inspection.status !== activeTab) return false
    if (searchQuery && !inspection.consultantType?.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const inspectionColumns: Column<Inspection>[] = [
    {
      id: 'consultantType',
      label: 'Consultant Type',
      minWidth: 200,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AssignmentIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {row.consultantType?.name || 'Unknown'}
            </Typography>
            <Typography variant="caption" color="text.secondary" dir="rtl">
              {row.consultantType?.nameHe}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'scheduledDate',
      label: 'Scheduled Date',
      minWidth: 140,
      sortable: true,
      render: (row) => (
        <Box>
          <Typography variant="body2">
            {new Date(row.scheduledDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(row.scheduledDate).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 130,
      render: (row) => {
        const statusConfig: Record<string, { icon: React.ReactNode; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
          pending: { icon: <ScheduleIcon sx={{ fontSize: 16 }} />, color: 'info' },
          in_progress: { icon: <WarningIcon sx={{ fontSize: 16 }} />, color: 'warning' },
          completed: { icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, color: 'success' },
          failed: { icon: <ErrorIcon sx={{ fontSize: 16 }} />, color: 'error' },
        }
        const config = statusConfig[row.status] || statusConfig.pending
        return (
          <Chip
            size="small"
            icon={config.icon as React.ReactElement}
            label={row.status.replace('_', ' ')}
            color={config.color}
            sx={{ textTransform: 'capitalize', fontWeight: 500 }}
          />
        )
      },
    },
    {
      id: 'currentStage',
      label: 'Current Stage',
      minWidth: 140,
      render: (row) => (
        <Typography variant="body2" color={row.currentStage ? 'text.primary' : 'text.secondary'}>
          {row.currentStage || 'Not started'}
        </Typography>
      ),
    },
    {
      id: 'findings',
      label: 'Findings',
      minWidth: 180,
      render: (row) => {
        if (!row.findings || row.findings.length === 0) {
          return <Typography variant="body2" color="text.secondary">No findings</Typography>
        }
        const critical = row.findings.filter(f => f.severity === 'critical').length
        const high = row.findings.filter(f => f.severity === 'high').length
        const medium = row.findings.filter(f => f.severity === 'medium').length
        const low = row.findings.filter(f => f.severity === 'low').length

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {critical > 0 && <SeverityBadge severity="critical" />}
            {high > 0 && <SeverityBadge severity="high" />}
            {medium > 0 && <SeverityBadge severity="medium" />}
            {low > 0 && <SeverityBadge severity="low" />}
          </Box>
        )
      },
    },
    {
      id: 'actions',
      label: '',
      minWidth: 100,
      align: 'right',
      render: () => (
        <Button variant="tertiary" size="small" icon={<VisibilityIcon />}>
          View
        </Button>
      ),
    },
  ]

  const stageColumns: Column<InspectionStageTemplate>[] = [
    {
      id: 'stageOrder',
      label: '#',
      minWidth: 60,
      render: (row) => (
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {row.stageOrder}
        </Box>
      ),
    },
    {
      id: 'name',
      label: 'Stage Name',
      minWidth: 200,
      render: (row) => (
        <Typography variant="body2" fontWeight={500}>
          {row.name}
        </Typography>
      ),
    },
    {
      id: 'nameHe',
      label: 'Hebrew Name',
      minWidth: 200,
      render: (row) => (
        <Typography variant="body2" dir="rtl" color="text.secondary">
          {row.nameHe}
        </Typography>
      ),
    },
    {
      id: 'isActive',
      label: 'Status',
      minWidth: 100,
      render: (row) => (
        <Chip
          size="small"
          label={row.isActive ? 'Active' : 'Inactive'}
          color={row.isActive ? 'success' : 'default'}
          sx={{ fontWeight: 500 }}
        />
      ),
    },
  ]

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={350} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={250} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2, mb: 4 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Senior Supervision Inspections"
        subtitle="Manage and track all inspection activities"
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Inspections' }]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Schedule Inspection
          </Button>
        }
      />

      {summary && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          <KPICard
            title="Total Inspections"
            value={summary.totalInspections}
            icon={<AssignmentIcon />}
            color="primary"
          />
          <KPICard
            title="Pending"
            value={summary.pendingCount}
            icon={<ScheduleIcon />}
            color="info"
          />
          <KPICard
            title="In Progress"
            value={summary.inProgressCount}
            icon={<WarningIcon />}
            color="warning"
          />
          <KPICard
            title="Completed"
            value={summary.completedCount}
            icon={<CheckCircleIcon />}
            color="success"
          />
          <KPICard
            title="Overdue"
            value={summary.overdueCount}
            icon={<ErrorIcon />}
            color="error"
          />
          <KPICard
            title="Critical Findings"
            value={summary.findingsBySeverity?.critical || 0}
            icon={<ErrorIcon />}
            color="error"
          />
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' }, gap: 3, mb: 4 }}>
        <Card>
          <Box sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Consultant Types
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {consultantTypes.map((type) => (
                <Box
                  key={type.id}
                  onClick={() => handleTypeSelect(type)}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    cursor: 'pointer',
                    bgcolor: selectedType?.id === type.id ? 'primary.main' : 'transparent',
                    color: selectedType?.id === type.id ? 'white' : 'text.primary',
                    transition: 'all 150ms ease-out',
                    '&:hover': {
                      bgcolor: selectedType?.id === type.id ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    {type.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    dir="rtl"
                    sx={{
                      color: selectedType?.id === type.id ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                    }}
                  >
                    {type.nameHe}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Card>

        <Card>
          <Box sx={{ p: 2.5 }}>
            {selectedType ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {selectedType.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Inspection Stages ({stageTemplates.length} stages)
                    </Typography>
                  </Box>
                  <Chip label={`${stageTemplates.filter(s => s.isActive).length} active`} size="small" color="success" />
                </Box>

                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  Each inspection for <strong>{selectedType.name}</strong> goes through {stageTemplates.length} sequential stages.
                </Alert>

                <DataTable
                  columns={stageColumns}
                  rows={stageTemplates}
                  getRowId={(row) => row.id}
                  pagination={false}
                  emptyMessage="No stages defined"
                />
              </>
            ) : (
              <EmptyState
                title="Select a Consultant Type"
                description="Choose a consultant type from the list to view its inspection stages."
              />
            )}
          </Box>
        </Card>
      </Box>

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Project Inspections
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <SearchField
                placeholder="Search inspections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="secondary" size="small" icon={<FilterListIcon />}>
                Filters
              </Button>
            </Box>
          </Box>

          <Tabs
            items={[
              { label: 'All', value: 'all', badge: inspections.length },
              { label: 'Pending', value: 'pending', badge: inspections.filter(i => i.status === 'pending').length },
              { label: 'In Progress', value: 'in_progress', badge: inspections.filter(i => i.status === 'in_progress').length },
              { label: 'Completed', value: 'completed', badge: inspections.filter(i => i.status === 'completed').length },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            size="small"
          />

          <Box sx={{ mt: 2 }}>
            <DataTable
              columns={inspectionColumns}
              rows={filteredInspections}
              getRowId={(row) => row.id}
              emptyMessage="No inspections found"
              onRowClick={(row) => console.log('View inspection:', row.id)}
            />
          </Box>
        </Box>
      </Card>

      <FormModal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreateInspection}
        title="Schedule New Inspection"
        submitLabel="Schedule"
        submitDisabled={!newInspection.consultantTypeId || !newInspection.scheduledDate}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <MuiTextField
            select
            fullWidth
            label="Consultant Type"
            value={newInspection.consultantTypeId}
            onChange={(e) => setNewInspection({ ...newInspection, consultantTypeId: e.target.value })}
          >
            {consultantTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.name} ({type.nameHe})
              </MenuItem>
            ))}
          </MuiTextField>

          <TextField
            fullWidth
            label="Scheduled Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={newInspection.scheduledDate}
            onChange={(e) => setNewInspection({ ...newInspection, scheduledDate: e.target.value })}
          />

          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={3}
            value={newInspection.notes}
            onChange={(e) => setNewInspection({ ...newInspection, notes: e.target.value })}
            placeholder="Add any relevant notes for this inspection..."
          />
        </Box>
      </FormModal>
    </Box>
  )
}
