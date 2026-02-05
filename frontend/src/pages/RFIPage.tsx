import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import MuiTextField from '@mui/material/TextField'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import EmailIcon from '@mui/icons-material/Email'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import IconButton from '@mui/material/IconButton'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField, TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import { rfiApi, RFI_PRIORITY_OPTIONS, RFI_CATEGORY_OPTIONS } from '../api/rfi'
import type { RFIListItem, RFI, RFICreate, RFISummary } from '../api/rfi'
import { useToast } from '../components/common/ToastProvider'

export default function RFIPage() {
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [rfis, setRfis] = useState<RFIListItem[]>([])
  const [summary, setSummary] = useState<RFISummary | null>(null)
  const [search, setSearch] = useState('')
  const [selectedRfi, setSelectedRfi] = useState<RFI | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRfi, setEditingRfi] = useState<RFI | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [rfiToDelete, setRfiToDelete] = useState<RFIListItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [detailLoading, setDetailLoading] = useState(false)
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
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadRfis()
    loadSummary()
  }, [projectId, page])

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
      showError('Failed to load RFIs. Please try again.')
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

  useEffect(() => {
    if (!loading) {
      loadRfis()
    }
  }, [activeTab, search])

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
    setEditingRfi(null)
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
        cc_emails: [],
        category: fullRfi.category,
        priority: fullRfi.priority,
        due_date: fullRfi.due_date || '',
        location: fullRfi.location || '',
        drawing_reference: fullRfi.drawing_reference || '',
        specification_reference: fullRfi.specification_reference || '',
      })
      setDialogOpen(true)
      setDrawerOpen(false)
    } catch {
      showError('Failed to load RFI details')
    }
  }

  const handleSaveRfi = async () => {
    if (!projectId) return
    if (!formData.subject || !formData.question || !formData.to_email) {
      showError('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      if (editingRfi) {
        await rfiApi.update(editingRfi.id, {
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
        })
        showSuccess('RFI updated successfully!')
      } else {
        await rfiApi.create(projectId, formData)
        showSuccess('RFI created successfully!')
      }
      handleCloseDialog()
      loadRfis()
      loadSummary()
    } catch {
      showError(`Failed to ${editingRfi ? 'update' : 'create'} RFI. Please try again.`)
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
    try {
      await rfiApi.delete(rfiToDelete.id)
      showSuccess('RFI deleted successfully!')
      setDeleteDialogOpen(false)
      setRfiToDelete(null)
      setDrawerOpen(false)
      loadRfis()
      loadSummary()
    } catch {
      showError('Failed to delete RFI. Only draft or cancelled RFIs can be deleted.')
    }
  }

  const handleSendRfi = async () => {
    if (!selectedRfi) return
    setSending(true)
    try {
      await rfiApi.send(selectedRfi.id)
      showSuccess('RFI sent successfully!')
      loadRfis()
      loadSummary()
      const updated = await rfiApi.get(selectedRfi.id)
      setSelectedRfi(updated)
    } catch {
      showError('Failed to send RFI. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleViewDetails = async (rfi: RFIListItem) => {
    setDetailLoading(true)
    setDrawerOpen(true)
    try {
      const fullRfi = await rfiApi.get(rfi.id)
      setSelectedRfi(fullRfi)
    } catch {
      showError('Failed to load RFI details')
      setDrawerOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setSelectedRfi(null)
  }

  const formatDate = (date?: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
  }

  const isOverdue = (rfi: RFIListItem) => {
    if (!rfi.due_date || rfi.status === 'closed' || rfi.status === 'answered') return false
    return new Date(rfi.due_date) < new Date()
  }

  const columns: Column<RFIListItem>[] = [
    {
      id: 'rfi_number',
      label: 'RFI #',
      minWidth: 140,
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
            <EmailIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>{row.rfi_number}</Typography>
            {isOverdue(row) && (
              <Chip label="Overdue" size="small" color="error" sx={{ height: 18, fontSize: 10 }} />
            )}
          </Box>
        </Box>
      ),
    },
    {
      id: 'subject',
      label: 'Subject',
      minWidth: 250,
      render: (row) => (
        <Box>
          <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 300 }}>
            {row.subject}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            To: {row.to_name || row.to_email}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'category',
      label: 'Category',
      minWidth: 110,
      render: (row) => {
        const cat = RFI_CATEGORY_OPTIONS.find(c => c.value === row.category)
        return <Chip label={cat?.label || row.category} size="small" variant="outlined" />
      },
    },
    {
      id: 'priority',
      label: 'Priority',
      minWidth: 100,
      render: (row) => <StatusBadge status={row.priority} />,
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 130,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'due_date',
      label: 'Due Date',
      minWidth: 110,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {row.due_date && <AccessTimeIcon sx={{ fontSize: 16, color: isOverdue(row) ? 'error.main' : 'text.secondary' }} />}
          <Typography variant="body2" color={isOverdue(row) ? 'error.main' : 'text.primary'}>
            {formatDate(row.due_date)}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'responses',
      label: 'Responses',
      minWidth: 90,
      align: 'center',
      render: (row) => (
        <Chip label={row.response_count} size="small" color={row.response_count > 0 ? 'success' : 'default'} />
      ),
    },
    {
      id: 'actions',
      label: '',
      minWidth: 120,
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleViewDetails(row); }} title="View details">
            <VisibilityIcon fontSize="small" />
          </IconButton>
          {row.status === 'draft' && (
            <>
              <IconButton size="small" onClick={(e) => handleOpenEdit(row, e)} title="Edit RFI">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={(e) => handleDeleteClick(row, e)} title="Delete RFI" color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      ),
    },
  ]

  if (loading && rfis.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 4 }} />
        <Skeleton variant="rounded" height={500} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="RFIs"
        subtitle="Manage Requests for Information"
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'RFIs' }]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
            New RFI
          </Button>
        }
      />

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <SearchField
              placeholder="Search RFIs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {summary && summary.overdue_count > 0 && (
                <Chip label={`${summary.overdue_count} Overdue`} size="small" color="error" />
              )}
              <Chip label={`${total} RFIs`} size="small" />
            </Box>
          </Box>

          <Tabs
            items={[
              { label: 'All', value: 'all', badge: summary?.total_rfis || 0 },
              { label: 'Draft', value: 'draft', badge: summary?.draft_count || 0 },
              { label: 'Open', value: 'open', badge: summary?.open_count || 0 },
              { label: 'Waiting', value: 'waiting_response', badge: summary?.waiting_response_count || 0 },
              { label: 'Answered', value: 'answered', badge: summary?.answered_count || 0 },
              { label: 'Closed', value: 'closed', badge: summary?.closed_count || 0 },
            ]}
            value={activeTab}
            onChange={(val) => { setActiveTab(val); setPage(1); }}
            size="small"
          />

          <Box sx={{ mt: 2 }}>
            <DataTable
              columns={columns}
              rows={rfis}
              getRowId={(row) => row.id}
              onRowClick={handleViewDetails}
              emptyMessage="No RFIs found"
            />
          </Box>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
              <Button variant="secondary" size="small" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                Page {page} of {totalPages}
              </Typography>
              <Button variant="secondary" size="small" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </Box>
          )}
        </Box>
      </Card>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, borderRadius: '16px 0 0 16px' } }}
      >
        {detailLoading ? (
          <Box sx={{ p: 3 }}>
            <Skeleton variant="text" width={200} height={32} />
            <Skeleton variant="text" width={150} height={24} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" height={200} />
          </Box>
        ) : selectedRfi && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>RFI Details</Typography>
              <IconButton onClick={handleCloseDrawer} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <EmailIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{selectedRfi.rfi_number}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <StatusBadge status={selectedRfi.status} />
                    <StatusBadge status={selectedRfi.priority} />
                  </Box>
                </Box>
              </Box>
            </Box>

            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>{selectedRfi.subject}</Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              Question
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, mb: 3 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{selectedRfi.question}</Typography>
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              Details
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                mb: 3,
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 2,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">To</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedRfi.to_name || selectedRfi.to_email}</Typography>
                <Typography variant="caption" color="text.secondary">{selectedRfi.to_email}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Category</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {RFI_CATEGORY_OPTIONS.find(c => c.value === selectedRfi.category)?.label || selectedRfi.category}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Due Date</Typography>
                <Typography variant="body2" fontWeight={500}>{formatDate(selectedRfi.due_date)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Created</Typography>
                <Typography variant="body2" fontWeight={500}>{formatDate(selectedRfi.created_at)}</Typography>
              </Box>
              {selectedRfi.location && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Location</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedRfi.location}</Typography>
                </Box>
              )}
              {selectedRfi.drawing_reference && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Drawing Ref</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedRfi.drawing_reference}</Typography>
                </Box>
              )}
            </Box>

            {selectedRfi.responses && selectedRfi.responses.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Responses ({selectedRfi.responses.length})
                </Typography>
                {selectedRfi.responses.map((response) => (
                  <Box key={response.id} sx={{ p: 2, bgcolor: response.is_internal ? 'warning.light' : 'success.light', borderRadius: 2, mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" fontWeight={600}>
                        {response.from_name || response.from_email}
                        {response.is_internal && <Chip label="Internal" size="small" sx={{ ml: 1, height: 16 }} />}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(response.created_at)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{response.response_text}</Typography>
                  </Box>
                ))}
              </>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              {selectedRfi.status === 'draft' && (
                <Button
                  variant="primary"
                  icon={sending ? undefined : <SendIcon />}
                  loading={sending}
                  fullWidth
                  onClick={handleSendRfi}
                >
                  Send RFI
                </Button>
              )}
              {selectedRfi.status === 'draft' && (
                <Button variant="secondary" fullWidth onClick={() => handleOpenEdit(selectedRfi as unknown as RFIListItem)}>
                  Edit RFI
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      <FormModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSaveRfi}
        title={editingRfi ? 'Edit RFI' : 'Create New RFI'}
        submitLabel={editingRfi ? 'Save Changes' : 'Create RFI'}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label="Subject"
            required
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              fullWidth
              label="To Email"
              required
              type="email"
              value={formData.to_email}
              onChange={(e) => setFormData({ ...formData, to_email: e.target.value })}
            />
            <TextField
              fullWidth
              label="To Name"
              value={formData.to_name}
              onChange={(e) => setFormData({ ...formData, to_name: e.target.value })}
            />
          </Box>
          <TextField
            fullWidth
            label="Question"
            required
            multiline
            rows={4}
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <MuiTextField
              fullWidth
              select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {RFI_CATEGORY_OPTIONS.map(cat => (
                <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
              ))}
            </MuiTextField>
            <MuiTextField
              fullWidth
              select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              {RFI_PRIORITY_OPTIONS.map(p => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </MuiTextField>
          </Box>
          <TextField
            fullWidth
            label="Due Date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <Divider />
          <Typography variant="subtitle2" color="text.secondary">Optional References</Typography>
          <TextField
            fullWidth
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              fullWidth
              label="Drawing Reference"
              value={formData.drawing_reference}
              onChange={(e) => setFormData({ ...formData, drawing_reference: e.target.value })}
            />
            <TextField
              fullWidth
              label="Specification Reference"
              value={formData.specification_reference}
              onChange={(e) => setFormData({ ...formData, specification_reference: e.target.value })}
            />
          </Box>
        </Box>
      </FormModal>

      <ConfirmModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete RFI"
        message={`Are you sure you want to delete "${rfiToDelete?.rfi_number}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </Box>
  )
}
