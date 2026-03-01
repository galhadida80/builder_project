import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { permitsApi } from '../api/permits'
import type { Permit, PermitComplianceReport } from '../types/permit'
import { parseValidationErrors } from '../utils/apiErrors'
import { useToast } from '../components/common/ToastProvider'
import HelpTooltip from '../components/help/HelpTooltip'
import { AddIcon } from '@/icons'
import { Box, Fab, useMediaQuery, useTheme, Alert } from '@/mui'
import PermitComplianceDashboard from '../components/permits/PermitComplianceDashboard'
import { PermitList } from '../components/permits/PermitList'
import { PermitForm, type PermitFormData } from '../components/permits/PermitForm'

export default function PermitsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [permits, setPermits] = useState<Permit[]>([])
  const [complianceReport, setComplianceReport] = useState<PermitComplianceReport | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) loadData()
  }, [projectId])

  useEffect(() => {
    if ((location.state as { openCreate?: boolean })?.openCreate) {
      setDialogOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate, location.pathname])

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [projectPermits, compliance] = await Promise.all([
        permitsApi.getProjectPermits(projectId),
        permitsApi.getComplianceReport(projectId)
      ])
      setPermits(projectPermits)
      setComplianceReport(compliance)
    } catch {
      showError(t('permits.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePermit = async (data: PermitFormData) => {
    if (!projectId) return

    setSubmitLoading(true)
    try {
      await permitsApi.createPermit(projectId, data)
      showSuccess(t('permits.createSuccess'))
      setDialogOpen(false)
      loadData()
    } catch (err) {
      const serverErrors = parseValidationErrors(err)
      if (Object.keys(serverErrors).length > 0) {
        showError(t('validation.checkFields'))
      } else {
        showError(t('permits.failedToCreate'))
      }
      throw err
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEditPermit = async (data: PermitFormData) => {
    if (!editingPermit) return

    setSubmitLoading(true)
    try {
      await permitsApi.updatePermit(editingPermit.id, data)
      showSuccess(t('permits.updateSuccess'))
      setDialogOpen(false)
      setEditingPermit(null)
      loadData()
    } catch (err) {
      const serverErrors = parseValidationErrors(err)
      if (Object.keys(serverErrors).length > 0) {
        showError(t('validation.checkFields'))
      } else {
        showError(t('permits.failedToUpdate'))
      }
      throw err
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeletePermit = async (permitId: string) => {
    try {
      await permitsApi.deletePermit(permitId)
      showSuccess(t('permits.deleteSuccess'))
      setDeleteConfirmId(null)
      loadData()
    } catch {
      showError(t('permits.failedToDelete'))
    }
  }

  const handleOpenEdit = (permit: Permit) => {
    setEditingPermit(permit)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingPermit(null)
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title={t('permits.title')}
        subtitle={t('permits.subtitle')}
        actions={
          !isMobile ? (
            <>
              <HelpTooltip helpKey="permits.help" />
              <Button
                variant="primary"
                startIcon={<AddIcon />}
                onClick={() => setDialogOpen(true)}
              >
                {t('permits.addPermit')}
              </Button>
            </>
          ) : (
            <HelpTooltip helpKey="permits.help" />
          )
        }
      />

      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Box sx={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Compliance Dashboard */}
          <PermitComplianceDashboard
            complianceReport={complianceReport}
            loading={loading}
          />

          {/* Permit List */}
          <Card>
            <PermitList
              projectId={projectId!}
              onEdit={handleOpenEdit}
              onDelete={(permitId) => setDeleteConfirmId(permitId)}
            />
          </Card>

          {/* Delete Confirmation */}
          {deleteConfirmId && (
            <Alert
              severity="warning"
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" onClick={() => handleDeletePermit(deleteConfirmId)}>
                    {t('common.delete')}
                  </Button>
                  <Button size="small" onClick={() => setDeleteConfirmId(null)}>
                    {t('common.cancel')}
                  </Button>
                </Box>
              }
            >
              {t('permits.confirmDelete')}
            </Alert>
          )}
        </Box>
      </Box>

      {/* Create/Edit Dialog */}
      <PermitForm
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={editingPermit ? handleEditPermit : handleCreatePermit}
        permit={editingPermit}
        loading={submitLoading}
      />

      {/* Mobile FAB */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label={t('permits.addPermit')}
          onClick={() => setDialogOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  )
}
