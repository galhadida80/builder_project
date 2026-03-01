import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { FormModal } from '../components/ui/Modal'
import { Tabs, TabPanel } from '../components/ui/Tabs'
import { useToast } from '../components/common/ToastProvider'
import { subcontractorsApi, SubcontractorProfile, SubcontractorDashboardResponse } from '../api/subcontractors'
import type { TimelineEvent } from '../api/clientPortal'
import { PortalDashboard } from '../components/subcontractor-portal/PortalDashboard'
import { ProfileView } from '../components/subcontractor-portal/ProfileView'
import { ProfileForm } from '../components/subcontractor-portal/ProfileForm'
import { TasksList } from '../components/subcontractor-portal/TasksList'
import { RFIsList } from '../components/subcontractor-portal/RFIsList'
import { ApprovalsList } from '../components/subcontractor-portal/ApprovalsList'
import { ActivityFeed } from '../components/subcontractor-portal/ActivityFeed'
import { useProfileEditor } from '../components/subcontractor-portal/ProfileSection'
import { createTabConfig } from '../components/subcontractor-portal/TabConfig'
import { Box, Typography, Skeleton, Fab, Paper, alpha, useTheme, useMediaQuery } from '@/mui'
import { EditIcon, PersonIcon, CheckCircleIcon, WorkIcon } from '@/icons'

export default function SubcontractorPortalPage() {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [activeTab, setActiveTab] = useState('dashboard')
  const [profile, setProfile] = useState<SubcontractorProfile | null>(null)
  const [dashboard, setDashboard] = useState<SubcontractorDashboardResponse | null>(null)
  const [activities, setActivities] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [activityLoading, setActivityLoading] = useState(false)

  const loadProfile = async () => {
    setLoading(true)
    try {
      const data = await subcontractorsApi.getMyProfile()
      setProfile(data)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const {
    dialogOpen,
    setDialogOpen,
    saving,
    form,
    setForm,
    openEditDialog,
    handleSave,
  } = useProfileEditor(profile, loadProfile)

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true)
    try {
      const data = await subcontractorsApi.getDashboard()
      setDashboard(data)
    } catch {
      showError(t('subcontractorPortal.dashboardLoadFailed'))
    } finally {
      setDashboardLoading(false)
    }
  }, [showError, t])

  const loadActivityFeed = useCallback(async () => {
    setActivityLoading(true)
    try {
      const data = await subcontractorsApi.getActivityFeed()
      setActivities(data || [])
    } catch {
      showError(t('subcontractorPortal.activityLoadFailed'))
    } finally {
      setActivityLoading(false)
    }
  }, [showError, t])

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (profile && activeTab === 'dashboard' && !dashboard) {
      loadDashboard()
    }
    if (profile && activeTab === 'activity' && activities.length === 0) {
      loadActivityFeed()
    }
  }, [activeTab, profile, dashboard, activities.length, loadDashboard, loadActivityFeed])

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={20} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rounded" height={250} sx={{ borderRadius: 3, mb: 3 }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  if (!profile) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <EmptyState
          icon={<PersonIcon sx={{ fontSize: 48 }} />}
          title={t('subcontractors.noProfile')}
          description={t('subcontractors.noProfileDescription')}
          action={{ label: t('subcontractors.createProfile'), onClick: openEditDialog }}
        />
        <FormModal
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSave}
          title={t('subcontractors.createProfile')}
          submitLabel={saving ? t('subcontractors.saving') : t('subcontractors.save')}
          loading={saving}
        >
          <ProfileForm form={form} onChange={setForm} />
        </FormModal>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              background: (theme) =>
                `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.primary.main, 0.08)})`,
              color: 'primary.main',
              flexShrink: 0,
            }}
          >
            <WorkIcon sx={{ fontSize: '1.25rem' }} />
          </Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
          >
            {t('subcontractorPortal.title')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography
            variant="body1"
            sx={{ color: 'text.secondary', fontSize: { xs: '0.9rem', sm: '1rem' }, ml: { xs: 0, sm: 7 } }}
          >
            {profile.companyName}
          </Typography>
          {!isMobile && (
            <Button startIcon={<EditIcon />} onClick={openEditDialog} size="small">
              {t('subcontractors.editProfile')}
            </Button>
          )}
        </Box>
      </Box>

      {profile.isVerified && (
        <Paper
          sx={{
            borderRadius: 3,
            p: { xs: 2, sm: 2.5 },
            mb: 3,
            bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
            border: 1,
            borderColor: (theme) => alpha(theme.palette.success.main, 0.12),
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <CheckCircleIcon sx={{ color: 'success.main', fontSize: '1.25rem' }} />
          <Typography
            variant="body2"
            sx={{
              color: 'success.main',
              fontSize: { xs: '0.85rem', sm: '0.9rem' },
              fontWeight: 600,
            }}
          >
            {t('subcontractors.verifiedProfile')}
          </Typography>
        </Paper>
      )}

      <Tabs items={createTabConfig(t)} value={activeTab} onChange={setActiveTab} />

      <TabPanel value="dashboard" activeValue={activeTab}>
        <PortalDashboard dashboard={dashboard} loading={dashboardLoading} />
      </TabPanel>

      <TabPanel value="tasks" activeValue={activeTab}>
        <TasksList />
      </TabPanel>

      <TabPanel value="rfis" activeValue={activeTab}>
        <RFIsList />
      </TabPanel>

      <TabPanel value="approvals" activeValue={activeTab}>
        <ApprovalsList />
      </TabPanel>

      <TabPanel value="activity" activeValue={activeTab}>
        <ActivityFeed activities={activities} loading={activityLoading} />
      </TabPanel>

      <TabPanel value="profile" activeValue={activeTab}>
        <ProfileView profile={profile} />
      </TabPanel>

      <FormModal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSave}
        title={profile ? t('subcontractors.editProfile') : t('subcontractors.createProfile')}
        submitLabel={saving ? t('subcontractors.saving') : t('subcontractors.save')}
        loading={saving}
      >
        <ProfileForm form={form} onChange={setForm} />
      </FormModal>

      {isMobile && (
        <Fab
          color="primary"
          onClick={openEditDialog}
          sx={{ position: 'fixed', bottom: 80, insetInlineEnd: 16, zIndex: 10 }}
        >
          <EditIcon />
        </Fab>
      )}
    </Box>
  )
}
