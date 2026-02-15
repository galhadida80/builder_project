import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge, SeverityBadge } from '../components/ui/StatusBadge'
import { Tabs } from '../components/ui/Tabs'
import { FormModal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField, SearchField } from '../components/ui/TextField'
import { defectsApi, DefectCreateData } from '../api/defects'
import { contactsApi } from '../api/contacts'
import { areasApi } from '../api/areas'
import type { Defect, DefectSummary, Contact, ConstructionArea } from '../types'
import { useToast } from '../components/common/ToastProvider'
import {
  AddIcon, ReportProblemIcon, CheckCircleIcon, WarningIcon, ErrorIcon,
  HourglassEmptyIcon, VisibilityIcon,
} from '@/icons'
import {
  Box, Typography, Skeleton, Chip, MenuItem,
  TextField as MuiTextField, Autocomplete,
} from '@/mui'

const CATEGORY_OPTIONS = [
  'concrete_structure', 'wet_room_waterproofing', 'plaster', 'roof',
  'painting', 'plumbing', 'flooring', 'fire_passage_sealing',
  'roof_waterproofing', 'building_general', 'moisture', 'waterproofing',
  'hvac', 'lighting', 'solar_system', 'other',
]

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical']

export default function DefectsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()

  const [defects, setDefects] = useState<Defect[]>([])
  const [summary, setSummary] = useState<DefectSummary | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [areas, setAreas] = useState<ConstructionArea[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [form, setForm] = useState<DefectCreateData>({
    description: '',
    category: 'other',
    severity: 'medium',
    assignee_ids: [],
  })

  useEffect(() => {
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [defectList, defectSummary, contactList, areaList] = await Promise.all([
        defectsApi.list(projectId),
        defectsApi.getSummary(projectId),
        contactsApi.list(projectId).catch(() => []),
        areasApi.list(projectId).catch(() => []),
      ])
      setDefects(defectList)
      setSummary(defectSummary)
      setContacts(contactList)
      setAreas(areaList)
    } catch (error) {
      console.error('Failed to load defects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!projectId) return
    try {
      await defectsApi.create(projectId, form)
      showSuccess(t('defects.createSuccess'))
      setDialogOpen(false)
      setForm({ description: '', category: 'other', severity: 'medium', assignee_ids: [] })
      loadData()
    } catch {
      showError(t('defects.createFailed'))
    }
  }

  const filteredDefects = defects.filter(d => {
    if (activeTab !== 'all' && d.status !== activeTab) return false
    if (categoryFilter && d.category !== categoryFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        d.description.toLowerCase().includes(q) ||
        String(d.defectNumber).includes(q) ||
        d.area?.name?.toLowerCase().includes(q) ||
        d.assignedContact?.contactName?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const columns: Column<Defect>[] = [
    {
      id: 'defectNumber',
      label: '#',
      minWidth: 70,
      sortable: true,
      render: (row) => (
        <Typography variant="body2" fontWeight={600}>#{row.defectNumber}</Typography>
      ),
    },
    {
      id: 'category',
      label: t('defects.category'),
      minWidth: 150,
      render: (row) => (
        <Chip
          size="small"
          label={t(`defects.categories.${row.category}`, { defaultValue: row.category })}
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      id: 'description',
      label: t('defects.description'),
      minWidth: 220,
      render: (row) => (
        <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
          {row.description}
        </Typography>
      ),
    },
    {
      id: 'location',
      label: t('defects.location'),
      minWidth: 130,
      render: (row) => (
        <Typography variant="body2" color={row.area ? 'text.primary' : 'text.secondary'}>
          {row.area ? `${row.area.name}${row.area.floorNumber != null ? ` / ${t('defects.floor')} ${row.area.floorNumber}` : ''}` : '-'}
        </Typography>
      ),
    },
    {
      id: 'severity',
      label: t('defects.severity'),
      minWidth: 110,
      render: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      id: 'status',
      label: t('common.status'),
      minWidth: 120,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'assignedContact',
      label: t('defects.assignedTo'),
      minWidth: 140,
      render: (row) => (
        <Typography variant="body2" color={row.assignedContact ? 'text.primary' : 'text.secondary'}>
          {row.assignedContact?.contactName || '-'}
        </Typography>
      ),
    },
    {
      id: 'createdAt',
      label: t('common.date'),
      minWidth: 100,
      sortable: true,
      render: (row) => (
        <Typography variant="body2">
          {new Date(row.createdAt).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: '',
      minWidth: 90,
      align: 'right',
      render: () => (
        <Button variant="tertiary" size="small" icon={<VisibilityIcon />}>
          {t('buttons.view')}
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={350} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={250} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 2, mb: 4 }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('defects.title')}
        subtitle={t('defects.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('nav.defects') }]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            {t('defects.reportDefect')}
          </Button>
        }
      />

      {summary && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 1.5,
            mb: 3,
          }}
        >
          <KPICard title={t('defects.total')} value={summary.total} icon={<ReportProblemIcon />} color="primary" />
          <KPICard title={t('defects.open')} value={summary.openCount} icon={<ErrorIcon />} color="error" />
          <KPICard title={t('defects.inProgress')} value={summary.inProgressCount} icon={<HourglassEmptyIcon />} color="warning" />
          <KPICard title={t('defects.resolved')} value={summary.resolvedCount} icon={<CheckCircleIcon />} color="success" />
          <KPICard title={t('defects.critical')} value={summary.criticalCount} icon={<WarningIcon />} color="error" />
        </Box>
      )}

      <Card>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              {t('defects.list')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <MuiTextField
                select
                size="small"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label={t('defects.category')}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                {CATEGORY_OPTIONS.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {t(`defects.categories.${cat}`, { defaultValue: cat })}
                  </MenuItem>
                ))}
              </MuiTextField>
              <SearchField
                placeholder={t('defects.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Box>
          </Box>

          <Tabs
            items={[
              { label: t('common.all'), value: 'all', badge: defects.length },
              { label: t('defects.open'), value: 'open', badge: defects.filter(d => d.status === 'open').length },
              { label: t('defects.inProgress'), value: 'in_progress', badge: defects.filter(d => d.status === 'in_progress').length },
              { label: t('defects.resolved'), value: 'resolved', badge: defects.filter(d => d.status === 'resolved').length },
              { label: t('defects.closed'), value: 'closed', badge: defects.filter(d => d.status === 'closed').length },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            size="small"
          />

          <Box sx={{ mt: 2 }}>
            {filteredDefects.length === 0 ? (
              <EmptyState
                title={t('defects.noDefects')}
                description={t('defects.noDefectsDescription')}
              />
            ) : (
              <DataTable
                columns={columns}
                rows={filteredDefects}
                getRowId={(row) => row.id}
                onRowClick={(row) => navigate(`/projects/${projectId}/defects/${row.id}`)}
              />
            )}
          </Box>
        </Box>
      </Card>

      <FormModal
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setForm({ description: '', category: 'other', severity: 'medium', assignee_ids: [] })
        }}
        onSubmit={handleCreate}
        title={t('defects.reportDefect')}
        submitLabel={t('defects.create')}
        submitDisabled={!form.description || !form.category || !form.severity}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            fullWidth
            label={t('defects.description')}
            multiline
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />

          <MuiTextField
            select
            fullWidth
            label={t('defects.category')}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          >
            {CATEGORY_OPTIONS.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {t(`defects.categories.${cat}`, { defaultValue: cat })}
              </MenuItem>
            ))}
          </MuiTextField>

          <MuiTextField
            select
            fullWidth
            label={t('defects.severity')}
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
            required
          >
            {SEVERITY_OPTIONS.map((sev) => (
              <MenuItem key={sev} value={sev}>
                {t(`defects.severities.${sev}`, { defaultValue: sev })}
              </MenuItem>
            ))}
          </MuiTextField>

          {areas.length > 0 && (
            <Autocomplete
              options={areas}
              getOptionLabel={(opt) => `${opt.name}${opt.floorNumber != null ? ` (${t('defects.floor')} ${opt.floorNumber})` : ''}`}
              value={areas.find(a => a.id === form.area_id) || null}
              onChange={(_, val) => setForm({ ...form, area_id: val?.id })}
              renderInput={(params) => <MuiTextField {...params} label={t('defects.location')} />}
            />
          )}

          {contacts.length > 0 && (
            <>
              <Autocomplete
                options={contacts}
                getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
                value={contacts.find(c => c.id === form.assigned_contact_id) || null}
                onChange={(_, val) => setForm({ ...form, assigned_contact_id: val?.id })}
                renderInput={(params) => <MuiTextField {...params} label={t('defects.primaryAssignee')} />}
              />

              <Autocomplete
                multiple
                options={contacts}
                getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
                value={contacts.filter(c => form.assignee_ids?.includes(c.id))}
                onChange={(_, val) => setForm({ ...form, assignee_ids: val.map(v => v.id) })}
                renderInput={(params) => <MuiTextField {...params} label={t('defects.additionalAssignees')} />}
              />

              <Autocomplete
                options={contacts}
                getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
                value={contacts.find(c => c.id === form.reporter_id) || null}
                onChange={(_, val) => setForm({ ...form, reporter_id: val?.id })}
                renderInput={(params) => <MuiTextField {...params} label={t('defects.reporter')} />}
              />

              <Autocomplete
                options={contacts}
                getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
                value={contacts.find(c => c.id === form.followup_contact_id) || null}
                onChange={(_, val) => setForm({ ...form, followup_contact_id: val?.id })}
                renderInput={(params) => <MuiTextField {...params} label={t('defects.followupPerson')} />}
              />
            </>
          )}

          <TextField
            fullWidth
            label={t('defects.dueDate')}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={form.due_date || ''}
            onChange={(e) => setForm({ ...form, due_date: e.target.value || undefined })}
          />
        </Box>
      </FormModal>
    </Box>
  )
}
