import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField } from '../components/ui/TextField'
import FilterChips from '../components/ui/FilterChips'
import { ToolboxTalkCard } from '../components/safety/ToolboxTalkCard'
import { AttendanceDialog } from '../components/safety/AttendanceDialog'
// import ToolboxTalkFormModal from '../components/safety/ToolboxTalkFormModal'
import { useToolboxTalks } from '../hooks/useToolboxTalks'
import { safetyApi } from '../api/safety'
import { contactsApi } from '../api/contacts'
import type { ToolboxTalk, ToolboxTalkStatus } from '../types/safety'
import type { Contact } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { AddIcon, PersonIcon } from '@/icons'
import { Box, Typography, Skeleton, useMediaQuery, useTheme, Stack } from '@/mui'

export default function ToolboxTalksPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [contacts, setContacts] = useState<Contact[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false)
  const [editingTalk, setEditingTalk] = useState<ToolboxTalk | null>(null)
  const [selectedTalk, setSelectedTalk] = useState<ToolboxTalk | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { talks, loading, loadTalks } = useToolboxTalks({
    projectId,
    status: activeTab !== 'all' ? (activeTab as ToolboxTalkStatus) : undefined,
    searchQuery,
  })

  const loadContacts = async () => {
    if (!projectId) return
    try {
      const contactList = await contactsApi.list(projectId).catch(() => [])
      setContacts(contactList.filter((c) => c.contactType === 'worker' || c.contactType === 'subcontractor'))
    } catch (error) {
      console.error('Failed to load contacts:', error)
    }
  }

  const handleEdit = (talk: ToolboxTalk) => {
    setEditingTalk(talk)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingTalk(null)
  }

  const handleManageAttendance = (talk: ToolboxTalk) => {
    setSelectedTalk(talk)
    setAttendanceDialogOpen(true)
  }

  const handleAttendanceToggle = async (attendeeId: string) => {
    if (!selectedTalk) return

    try {
      const attendee = selectedTalk.attendees.find((a) => a.id === attendeeId)
      if (!attendee) return

      const newAttended = !attendee.attended
      await safetyApi.toolboxTalks.updateAttendance(selectedTalk.id, attendeeId, newAttended)
      showSuccess(t('toolboxTalks.attendanceUpdated'))
      loadTalks()
    } catch (error) {
      console.error('Failed to update attendance:', error)
      showError(t('toolboxTalks.attendanceFailed'))
      throw error
    }
  }

  const filterItems = [
    { label: t('toolboxTalks.tabs.all'), value: 'all' },
    { label: t('toolboxTalks.tabs.scheduled'), value: 'scheduled' },
    { label: t('toolboxTalks.tabs.completed'), value: 'completed' },
    { label: t('toolboxTalks.tabs.cancelled'), value: 'cancelled' },
  ]

  const columns: Column<ToolboxTalk>[] = [
    {
      id: 'title',
      label: t('toolboxTalks.title'),
      render: (talk) => talk.title,
    },
    {
      id: 'topic',
      label: t('toolboxTalks.topic'),
      render: (talk) => talk.topic,
    },
    {
      id: 'scheduledDate',
      label: t('toolboxTalks.scheduledDate'),
      render: (talk) => new Date(talk.scheduledDate).toLocaleDateString(getDateLocale()),
    },
    {
      id: 'presenter',
      label: t('toolboxTalks.presenter'),
      render: (talk) => talk.presenter || '—',
    },
    {
      id: 'attendance',
      label: t('toolboxTalks.attendance'),
      render: (talk) => {
        const attended = talk.attendees.filter((a) => a.attended).length
        const total = talk.attendees.length
        return `${attended}/${total}`
      },
    },
    {
      id: 'status',
      label: t('common.status'),
      render: (talk) => <StatusBadge status={talk.status} />,
    },
    {
      id: 'actions',
      label: t('common.actions'),
      render: (talk) => (
        <Button
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            handleManageAttendance(talk)
          }}
          startIcon={<PersonIcon />}
        >
          {t('toolboxTalks.manageAttendance')}
        </Button>
      ),
    },
  ]

  return (
    <Box>
      <PageHeader
        title={t('toolboxTalks.title')}
        actions={
          <Button onClick={() => setDialogOpen(true)} startIcon={<AddIcon />}>
            {t('toolboxTalks.createNew')}
          </Button>
        }
      />

      {loading ? (
        <Card sx={{ p: 3 }}>
          <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={400} />
        </Card>
      ) : (
        <Card sx={{ p: isMobile ? 2 : 3 }}>
          <Box mb={3}>
            <SearchField
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('toolboxTalks.searchPlaceholder')}
            />
          </Box>

          <FilterChips items={filterItems} value={activeTab} onChange={setActiveTab} />

          {talks.length === 0 ? (
            <Box py={8} textAlign="center">
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {t('toolboxTalks.noTalks')}
              </Typography>
            </Box>
          ) : isMobile ? (
            <Stack spacing={2}>
              {talks.map((talk) => (
                <Box key={talk.id}>
                  <ToolboxTalkCard talk={talk} onClick={() => handleEdit(talk)} />
                  <Box mt={1} display="flex" justifyContent="flex-end">
                    <Button size="small" onClick={() => handleManageAttendance(talk)} startIcon={<PersonIcon />}>
                      {t('toolboxTalks.manageAttendance')}
                    </Button>
                  </Box>
                </Box>
              ))}
            </Stack>
          ) : (
            <DataTable columns={columns} rows={talks} getRowId={(talk) => talk.id} onRowClick={handleEdit} />
          )}
        </Card>
      )}

      {/* TODO: Add ToolboxTalkFormModal with proper props */}

      <AttendanceDialog
        open={attendanceDialogOpen}
        talk={selectedTalk}
        onClose={() => setAttendanceDialogOpen(false)}
        onToggleAttendance={handleAttendanceToggle}
      />
    </Box>
  )
}
