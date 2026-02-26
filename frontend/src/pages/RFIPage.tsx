import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField, TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import { EmptyState } from '../components/ui/EmptyState'
import { rfiApi, RFI_PRIORITY_OPTIONS, RFI_CATEGORY_OPTIONS } from '../api/rfi'
import type { RFIListItem, RFI, RFICreate, RFISummary } from '../api/rfi'
import { contactsApi } from '../api/contacts'
import { contactGroupsApi } from '../api/contactGroups'
import type { Contact, ContactGroupListItem } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { parseValidationErrors } from '../utils/apiErrors'
import HelpTooltip from '../components/help/HelpTooltip'
import { validateRFIForm, hasErrors, type ValidationError } from '../utils/validation'
import { AddIcon, DeleteIcon, EmailIcon, AccessTimeIcon, FilterListIcon } from '@/icons'
import { Box, Typography, Divider, MenuItem, TextField as MuiTextField, Skeleton, Chip, IconButton, Autocomplete, Avatar, FormControl, InputLabel, Select } from '@/mui'

export default function RFIPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [rfis, setRfis] = useState<RFIListItem[]>([])
  const [summary, setSummary] = useState<RFISummary | null>(null)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRfi, setEditingRfi] = useState<RFI | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [rfiToDelete, setRfiToDelete] = useState<RFIListItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [errors, setErrors] = useState<ValidationError>({})
  const [formData, setFormData] = useState<RFICreate & { cc_emails: string[] }>({
    subject: '',
    question: '',
    to_email: '',
    to_name: '',
    cc_emails: [],
    category: 'design',
    priority: 'medium',
    due_date: '',
    location: '',
    drawing_reference: '',
    specification_reference: '',
  })
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [projectContacts, setProjectContacts] = useState<Contact[]>([])
  const [contactGroups, setContactGroups] = useState<ContactGroupListItem[]>([])

  useEffect(() => {
    loadRfis()
  }, [projectId, page, activeTab, search])

  useEffect(() => {
    loadSummary()
    loadContactsAndGroups()
  }, [projectId])

  const loadRfis = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const statusFilter = activeTab !== 'all' ? activeTab : undefined
      const response = await rfiApi.list(projectId, {
        status: statusFilter,
        search: search || undefined,
        page,
        page_size: 20
      })
      setRfis(response.items)
      setTotalPages(response.total_pages)
      setTotal(response.total)
    } catch {
      showError(t('rfis.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const loadSummary = async () => {
    if (!projectId) return
    try {
      const data = await rfiApi.getSummary(projectId)
      setSummary(data)
    } catch {
      console.error('Failed to load RFI summary')
    }
  }

  const loadContactsAndGroups = async () => {
    if (!projectId) return
    try {
      const [contactsData, groupsData] = await Promise.all([
        contactsApi.list(projectId),
        contactGroupsApi.list(projectId),
      ])
      setProjectContacts(contactsData)
      setContactGroups(groupsData)
    } catch { /* non-critical */ }
  }

  const handleSelectContact = (contact: Contact | null) => {
    if (!contact) return
    setFormData(prev => ({
      ...prev,
      to_email: contact.email || prev.to_email,
      to_name: contact.contactName || prev.to_name,
    }))
  }

  const handleFillFromGroup = async (group: ContactGroupListItem | null) => {
    if (!group || !projectId) return
    try {
      const full = await contactGroupsApi.get(projectId, group.id)
      const emails = full.contacts.map(c => c.email).filter(Boolean) as string[]
      if (emails.length === 0) return
      const [first, ...rest] = emails
      setFormData(prev => ({
        ...prev,
        to_email: first,
        to_name: full.contacts[0]?.contactName || prev.to_name,
        cc_emails: [...new Set([...prev.cc_emails, ...rest])],
      }))
    } catch { /* ignore */ }
  }

  const resetForm = () => {
    setFormData({
      subject: '',
      question: '',
      to_email: '',
      to_name: '',
      cc_emails: [],
      category: 'design',
      priority: 'medium',
      due_date: '',
      location: '',
      drawing_reference: '',
      specification_reference: '',
    })
    setErrors({})
    setEditingRfi(null)
  }

  const validateField = (field: string, value: string) => {
    const testData = { ...formData, [field]: value }
    const allErrors = validateRFIForm(testData)
    setErrors(prev => ({ ...prev, [field]: allErrors[field] || null }))
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    resetForm()
  }

  const handleOpenCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleOpenEdit = async (rfi: RFIListItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      const fullRfi = await rfiApi.get(rfi.id)
      setEditingRfi(fullRfi)
      setFormData({
        subject: fullRfi.subject,
        question: fullRfi.question,
        to_email: fullRfi.to_email,
        to_name: fullRfi.to_name || '',
        cc_emails: fullRfi.cc_emails || [],
        category: fullRfi.category,
        priority: fullRfi.priority,
        due_date: fullRfi.due_date || '',
        location: fullRfi.location || '',
        drawing_reference: fullRfi.drawing_reference || '',
        specification_reference: fullRfi.specification_reference || '',
      })
      setErrors({})
      setDialogOpen(true)
    } catch {
      showError(t('rfis.failedToLoadDetails'))
    }
  }

  const handleSaveRfi = async () => {
    if (!projectId) return

    const validationErrors = validateRFIForm({
      subject: formData.subject,
      question: formData.question,
      to_email: formData.to_email,
      category: formData.category,
      priority: formData.priority,
      to_name: formData.to_name,
      location: formData.location,
      drawing_reference: formData.drawing_reference,
      specification_reference: formData.specification_reference
    })
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    setSaving(true)
    try {
      if (editingRfi) {
        await withMinDuration(rfiApi.update(editingRfi.id, {
          subject: formData.subject,
          question: formData.question,
          to_email: formData.to_email,
          to_name: formData.to_name || undefined,
          category: formData.category,
          priority: formData.priority,
          due_date: formData.due_date || undefined,
          location: formData.location || undefined,
          drawing_reference: formData.drawing_reference || undefined,
          specification_reference: formData.specification_reference || undefined,
        }))
        showSuccess(t('rfis.updateSuccess'))
      } else {
        await withMinDuration(rfiApi.create(projectId, {
          ...formData,
          due_date: formData.due_date || undefined,
          to_name: formData.to_name || undefined,
          location: formData.location || undefined,
          drawing_reference: formData.drawing_reference || undefined,
          specification_reference: formData.specification_reference || undefined,
        }))
        showSuccess(t('rfis.createSuccess'))
      }
      handleCloseDialog()
      loadRfis()
      loadSummary()
    } catch (err) {
      const serverErrors = parseValidationErrors(err)
      if (Object.keys(serverErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...serverErrors }))
        showError(t('validation.checkFields'))
        return
      }
      showError(editingRfi ? t('rfis.failedToUpdate') : t('rfis.failedToCreate'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (rfi: RFIListItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setRfiToDelete(rfi)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!rfiToDelete) return
    setDeleting(true)
    try {
      await withMinDuration(rfiApi.delete(rfiToDelete.id))
      showSuccess(t('rfis.deleteSuccess'))
      setDeleteDialogOpen(false)
      setRfiToDelete(null)
      loadRfis()
      loadSummary()
    } catch {
      showError(t('rfis.failedToDeleteDraft'))
    } finally {
      setDeleting(false)
    }
  }

  const handleViewDetails = (rfi: RFIListItem) => {
    navigate(`/projects/${projectId}/rfis/${rfi.id}`)
  }

  const formatDate = (date?: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString(getDateLocale())
  }

  const isOverdue = (rfi: RFIListItem) => {
    if (!rfi.due_date || rfi.status === 'closed' || rfi.status === 'answered' || rfi.status === 'cancelled') return false
    return new Date(rfi.due_date) < new Date()
  }

  const getRelativeTime = (dateStr: string): string => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffMins < 1) return t('rfis.timeAgo', { time: '<1m' })
    if (diffMins < 60) return t('rfis.timeAgo', { time: `${diffMins}m` })
    if (diffHours < 24) return t('rfis.timeAgo', { time: `${diffHours}h` })
    if (diffDays < 30) return t('rfis.timeAgo', { time: `${diffDays}d` })
    return formatDate(dateStr)
  }

  const filteredRfis = priorityFilter === 'all' ? rfis : rfis.filter(r => r.priority === priorityFilter)

  const urgentCount = summary?.by_priority?.urgent || 0

  if (loading && rfis.length === 0) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 4 }} />
        <Skeleton variant="rounded" height={500} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  const PRIORITY_BORDER: Record<string, string> = {
    urgent: 'error.main',
    high: 'warning.main',
    medium: 'info.main',
    low: 'grey.400',
  }

  const PRIORITY_DOT_COLOR: Record<string, string> = {
    urgent: '#d32f2f',
    high: '#ed6c02',
    medium: '#0288d1',
    low: '#9e9e9e',
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        <PageHeader
          title={t('rfis.title')}
          subtitle={t('rfis.subtitle')}
          breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('nav.rfis') }]}
          actions={
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
                {t('rfis.addRfi')}
              </Button>
            </Box>
          }
        />
        <HelpTooltip helpKey="help.tooltips.rfiForm" />
      </Box>

      {summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 3 }}>
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'primary.light', borderRadius: 2.5, p: 2, textAlign: 'center', borderTop: '3px solid', borderTopColor: 'primary.main' }}>
            <Typography variant="h4" fontWeight={800} color="primary.main">{summary.open_count}</Typography>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('rfis.openCount')}</Typography>
          </Box>
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'success.light', borderRadius: 2.5, p: 2, textAlign: 'center', borderTop: '3px solid', borderTopColor: 'success.main' }}>
            <Typography variant="h4" fontWeight={800} color="success.main">{summary.answered_count}</Typography>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('rfis.answeredCount')}</Typography>
          </Box>
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'error.light', borderRadius: 2.5, p: 2, textAlign: 'center', borderTop: '3px solid', borderTopColor: 'error.main' }}>
            <Typography variant="h4" fontWeight={800} color="error.main">{urgentCount}</Typography>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('rfis.urgentCount')}</Typography>
          </Box>
        </Box>
      )}

      <Tabs
        items={[
          { label: t('common.all'), value: 'all', badge: summary?.total_rfis || 0 },
          { label: t('rfis.statuses.open'), value: 'open', badge: summary?.open_count || 0 },
          { label: t('rfis.statuses.answered'), value: 'answered', badge: summary?.answered_count || 0 },
          { label: t('rfis.statuses.closed'), value: 'closed', badge: summary?.closed_count || 0 },
        ]}
        value={activeTab}
        onChange={(val) => { setActiveTab(val); setPage(1) }}
        size="small"
      />

      <Box sx={{ mt: 1.5, mb: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Box sx={{ flex: 1 }}>
          <SearchField
            placeholder={t('rfis.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="priority-filter-label">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FilterListIcon sx={{ fontSize: 16 }} />
              {t('rfis.priorityFilter')}
            </Box>
          </InputLabel>
          <Select
            labelId="priority-filter-label"
            value={priorityFilter}
            label={t('rfis.priorityFilter')}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1) }}
          >
            <MenuItem value="all">{t('rfis.allPriorities')}</MenuItem>
            {RFI_PRIORITY_OPTIONS.map(p => (
              <MenuItem key={p.value} value={p.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PRIORITY_DOT_COLOR[p.value] || 'grey.400' }} />
                  {t(`rfis.priorities.${p.value}`)}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {filteredRfis.length === 0 ? (
          <EmptyState
            title={t('rfis.noRfis')}
            description={t('rfis.noRfisDescription')}
            icon={<EmailIcon sx={{ color: 'text.secondary' }} />}
            action={{ label: t('rfis.newRfi'), onClick: handleOpenCreate }}
          />
        ) : (
          filteredRfis.map((row) => (
            <Card key={row.id} hoverable onClick={() => handleViewDetails(row)}
              sx={{ borderInlineStart: '4px solid', borderInlineStartColor: PRIORITY_BORDER[row.priority] || 'divider', overflow: 'visible' }}
            >
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <StatusBadge status={row.priority} />
                  <Chip
                    label={`#${row.rfi_number}`}
                    size="small"
                    sx={{
                      bgcolor: 'grey.100',
                      color: 'text.primary',
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      letterSpacing: 0.5,
                      border: '1px solid',
                      borderColor: 'grey.300',
                    }}
                  />
                </Box>

                <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.3, mb: 1 }}>{row.subject}</Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                  <Chip
                    label={t(`rfis.categories.${row.category}`, { defaultValue: row.category })}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 22, borderColor: 'primary.light', color: 'primary.main' }}
                  />
                  <StatusBadge status={row.status} size="small" />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'primary.main' }}>
                      {getInitials(row.to_name)}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary">{row.to_name || row.to_email}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {row.due_date && (
                      <Typography variant="caption" color={isOverdue(row) ? 'error.main' : 'text.secondary'} fontWeight={isOverdue(row) ? 700 : 400}>
                        {formatDate(row.due_date)}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                        {getRelativeTime(row.created_at)}
                      </Typography>
                    </Box>
                    {row.status === 'draft' && (
                      <IconButton size="small" onClick={(e) => handleDeleteClick(row, e)} color="error">
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </Box>
            </Card>
          ))
        )}
      </Box>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
          <Button variant="secondary" size="small" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            {t('common.previous')}
          </Button>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
            {t('rfis.pageOf', { current: page, total: totalPages })}
          </Typography>
          <Button variant="secondary" size="small" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            {t('common.next')}
          </Button>
        </Box>
      )}

      <FormModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSaveRfi}
        title={editingRfi ? t('rfis.editRfi') : t('rfis.createNewRfi')}
        submitLabel={editingRfi ? t('common.saveChanges') : t('rfis.createRfi')}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label={t('rfis.subject')}
            required
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            onBlur={() => validateField('subject', formData.subject)}
            error={!!errors.subject}
            helperText={errors.subject}
          />
          <Autocomplete
            options={projectContacts.filter(c => c.email)}
            getOptionLabel={(opt) => `${opt.contactName} (${opt.email})`}
            onChange={(_, val) => handleSelectContact(val)}
            renderInput={(params) => (
              <MuiTextField {...params} label={t('rfis.selectRecipient')} size="small" />
            )}
            size="small"
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              fullWidth
              label={t('rfis.toEmail')}
              required
              type="email"
              value={formData.to_email}
              onChange={(e) => setFormData({ ...formData, to_email: e.target.value })}
              onBlur={() => validateField('to_email', formData.to_email)}
              error={!!errors.to_email}
              helperText={errors.to_email}
            />
            <TextField
              fullWidth
              label={t('rfis.toName')}
              value={formData.to_name}
              onChange={(e) => setFormData({ ...formData, to_name: e.target.value })}
              error={!!errors.to_name}
              helperText={errors.to_name}
            />
          </Box>
          {contactGroups.length > 0 && (
            <Autocomplete
              options={contactGroups}
              getOptionLabel={(opt) => `${opt.name} (${opt.memberCount} ${t('contactGroups.members').toLowerCase()})`}
              onChange={(_, val) => handleFillFromGroup(val)}
              renderInput={(params) => (
                <MuiTextField {...params} label={t('rfis.selectGroup')} size="small" helperText={t('rfis.selectGroupHint')} />
              )}
              size="small"
            />
          )}
          <TextField
            fullWidth
            label={t('rfis.question')}
            required
            multiline
            rows={4}
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            onBlur={() => validateField('question', formData.question)}
            error={!!errors.question}
            helperText={errors.question}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <MuiTextField
              fullWidth
              select
              label={t('rfis.category')}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              error={!!errors.category}
              helperText={errors.category}
            >
              {RFI_CATEGORY_OPTIONS.map(cat => (
                <MenuItem key={cat.value} value={cat.value}>{t(cat.labelKey)}</MenuItem>
              ))}
            </MuiTextField>
            <MuiTextField
              fullWidth
              select
              label={t('rfis.priority')}
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              error={!!errors.priority}
              helperText={errors.priority}
            >
              {RFI_PRIORITY_OPTIONS.map(p => (
                <MenuItem key={p.value} value={p.value}>{t(p.labelKey)}</MenuItem>
              ))}
            </MuiTextField>
          </Box>
          <TextField
            fullWidth
            label={t('rfis.dueDate')}
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <Divider />
          <Typography variant="subtitle2" color="text.secondary">{t('rfis.optionalReferences')}</Typography>
          <TextField
            fullWidth
            label={t('rfis.location')}
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            error={!!errors.location}
            helperText={errors.location}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              fullWidth
              label={t('rfis.drawingReference')}
              value={formData.drawing_reference}
              onChange={(e) => setFormData({ ...formData, drawing_reference: e.target.value })}
              error={!!errors.drawing_reference}
              helperText={errors.drawing_reference}
            />
            <TextField
              fullWidth
              label={t('rfis.specificationReference')}
              value={formData.specification_reference}
              onChange={(e) => setFormData({ ...formData, specification_reference: e.target.value })}
              error={!!errors.specification_reference}
              helperText={errors.specification_reference}
            />
          </Box>
        </Box>
      </FormModal>

      <ConfirmModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('rfis.deleteRfi')}
        message={t('rfis.deleteConfirmationMessage', { number: rfiToDelete?.rfi_number })}
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={deleting}
      />
    </Box>
  )
}
