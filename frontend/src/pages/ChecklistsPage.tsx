import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, KPICard } from '../components/ui/Card'
import { DataTable, Column } from '../components/ui/DataTable'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { SearchField } from '../components/ui/TextField'
import { checklistsApi } from '../api/checklists'
import type { ChecklistTemplate, ChecklistSubSection } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { ChecklistIcon, AssignmentIcon, ExpandMoreIcon, ExpandLessIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, Collapse, IconButton } from '@/mui'

export default function ChecklistsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError } = useToast()
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await checklistsApi.getTemplates(projectId)
      setTemplates(data)
    } catch {
      showError(t('checklists.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates
    const q = searchQuery.toLowerCase()
    return templates.filter(tpl =>
      tpl.name.toLowerCase().includes(q) ||
      tpl.group.toLowerCase().includes(q) ||
      tpl.level.toLowerCase().includes(q)
    )
  }, [templates, searchQuery])

  const totalItems = useMemo(() =>
    templates.reduce((sum, tpl) =>
      sum + tpl.subsections.reduce((s, sub) => s + sub.items.length, 0), 0
    ), [templates])

  const totalSubsections = useMemo(() =>
    templates.reduce((sum, tpl) => sum + tpl.subsections.length, 0), [templates])

  const getItemCount = (tpl: ChecklistTemplate) =>
    tpl.subsections.reduce((sum, sub) => sum + sub.items.length, 0)

  const columns: Column<ChecklistTemplate>[] = [
    {
      id: 'expand',
      label: '',
      minWidth: 50,
      render: (row) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            setExpandedId(expandedId === row.id ? null : row.id)
          }}
        >
          {expandedId === row.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      ),
    },
    {
      id: 'name',
      label: t('checklists.name'),
      minWidth: 250,
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
            <ChecklistIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {row.name}
            </Typography>
            {row.category && (
              <Typography variant="caption" color="text.secondary">
                {row.category}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      id: 'group',
      label: t('checklists.group'),
      minWidth: 160,
      render: (row) => (
        <Chip size="small" label={row.group} color="default" sx={{ fontWeight: 500 }} />
      ),
    },
    {
      id: 'level',
      label: t('checklists.level'),
      minWidth: 120,
      render: (row) => (
        <Typography variant="body2">{row.level}</Typography>
      ),
    },
    {
      id: 'subsections',
      label: t('checklists.subsections'),
      minWidth: 120,
      align: 'center',
      render: (row) => (
        <Chip size="small" label={row.subsections.length} variant="outlined" color="primary" />
      ),
    },
    {
      id: 'items',
      label: t('checklists.items'),
      minWidth: 100,
      align: 'center',
      render: (row) => (
        <Chip size="small" label={getItemCount(row)} variant="outlined" color="info" />
      ),
    },
  ]

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={350} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={250} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
          {[...Array(3)].map((_, i) => (
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
        title={t('checklists.title')}
        subtitle={t('checklists.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('nav.checklists') }]}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 1.5,
          mb: 3,
        }}
      >
        <KPICard title={t('checklists.templates')} value={templates.length} icon={<ChecklistIcon />} color="primary" />
        <KPICard title={t('checklists.subsections')} value={totalSubsections} icon={<AssignmentIcon />} color="info" />
        <KPICard title={t('checklists.items')} value={totalItems} icon={<AssignmentIcon />} color="success" />
      </Box>

      <Card>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {t('checklists.templates')}
            </Typography>
            <SearchField
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('checklists.searchPlaceholder')}
            />
          </Box>

          {filteredTemplates.length === 0 ? (
            <EmptyState
              title={t('checklists.noTemplates')}
              icon={<ChecklistIcon sx={{ fontSize: 48 }} />}
            />
          ) : (
            <>
              <DataTable<ChecklistTemplate>
                columns={columns}
                rows={filteredTemplates}
                getRowId={(row) => row.id}
                onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
              />
              {filteredTemplates.map((tpl) => (
                <Collapse key={tpl.id} in={expandedId === tpl.id}>
                  <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', borderRadius: 2, mb: 1 }}>
                    {tpl.subsections
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((sub: ChecklistSubSection) => (
                        <SubsectionCard key={sub.id} subsection={sub} />
                      ))}
                  </Box>
                </Collapse>
              ))}
            </>
          )}
        </Box>
      </Card>
    </Box>
  )
}

function SubsectionCard({ subsection }: { subsection: ChecklistSubSection }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Box sx={{ mb: 1 }}>
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          bgcolor: 'background.paper',
          borderRadius: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'grey.50' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            {subsection.order + 1}
          </Box>
          <Typography variant="body2" fontWeight={500}>
            {subsection.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip size="small" label={`${subsection.items.length} ${t('checklists.items')}`} variant="outlined" />
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Box>
      </Box>
      <Collapse in={open}>
        <Box sx={{ pl: 5, pr: 2, py: 1 }}>
          {subsection.items.map((item, idx) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 0.75,
                borderBottom: idx < subsection.items.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" color="text.primary">
                {item.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {item.must_image && <Chip size="small" label={t('checklists.requiresImage')} color="warning" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
                {item.must_note && <Chip size="small" label={t('checklists.requiresNote')} color="info" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
                {item.must_signature && <Chip size="small" label={t('checklists.requiresSignature')} color="secondary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
              </Box>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}
