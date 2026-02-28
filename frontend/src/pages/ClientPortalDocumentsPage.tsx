import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useClientPortal } from '../contexts/ClientPortalContext'
import { clientPortalApi, type FileResponse, type Discussion } from '../api/clientPortal'
import { DocumentList } from '../components/client-portal/DocumentList'
import { FeedbackForm } from '../components/client-portal/FeedbackForm'
import { EmptyState, LoadingError } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { DescriptionIcon } from '@/icons'
import { Box, Container, Alert, Snackbar } from '@/mui'

export default function ClientPortalDocumentsPage() {
  const { t } = useTranslation()
  const { projectId, project, canViewDocuments, canSubmitFeedback } = useClientPortal()
  const [documents, setDocuments] = useState<FileResponse[]>([])
  const [feedbackList, setFeedbackList] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingFeedback, setLoadingFeedback] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!projectId || !canViewDocuments) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await clientPortalApi.listDocuments(projectId, undefined, 100, 0)
        setDocuments(data)
      } catch (err) {
        console.error('Failed to fetch documents:', err)
        setError(err instanceof Error ? err.message : t('clientPortal.failedToLoadDocuments'))
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [projectId, canViewDocuments, t])

  useEffect(() => {
    const fetchFeedback = async () => {
      if (!projectId || !canSubmitFeedback) {
        setLoadingFeedback(false)
        return
      }

      try {
        setLoadingFeedback(true)
        const data = await clientPortalApi.listFeedback(projectId)
        setFeedbackList(data)
      } catch (err) {
        console.error('Failed to fetch feedback:', err)
      } finally {
        setLoadingFeedback(false)
      }
    }

    fetchFeedback()
  }, [projectId, canSubmitFeedback])

  const handleSubmitFeedback = async (subject: string, content: string) => {
    if (!projectId) return

    try {
      const newFeedback = await clientPortalApi.createFeedback(projectId, {
        entityType: subject,
        entityId: projectId,
        content,
      })
      setFeedbackList((prev) => [newFeedback, ...prev])
      setSuccessMessage(t('clientPortal.feedbackSubmitted'))
    } catch (err) {
      console.error('Failed to submit feedback:', err)
      throw err
    }
  }

  if (!projectId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <EmptyState
          variant="error"
          title={t('clientPortal.noProjectSelected')}
          description={t('clientPortal.pleaseSelectProject')}
        />
      </Container>
    )
  }

  if (!canViewDocuments && !canSubmitFeedback) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <EmptyState
          variant="error"
          title={t('common.accessDenied')}
          description={t('common.noPermission')}
        />
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <PageHeader
          title={t('clientPortal.documents')}
          subtitle={project?.name}
          icon={<DescriptionIcon />}
        />
        <Box sx={{ mt: 3 }}>
          <LoadingError
            message={error}
            onRetry={() => window.location.reload()}
          />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
      <PageHeader
        title={t('clientPortal.documents')}
        subtitle={project?.name}
        icon={<DescriptionIcon />}
      />

      {/* Documents Section */}
      {canViewDocuments && (
        <Box sx={{ mt: 3 }}>
          <DocumentList
            documents={documents}
            projectId={projectId}
            loading={loading}
          />
        </Box>
      )}

      {/* Feedback Section */}
      {canSubmitFeedback && (
        <Box sx={{ mt: 4 }}>
          <FeedbackForm
            projectId={projectId}
            onSubmit={handleSubmitFeedback}
            feedbackList={feedbackList}
            loading={loadingFeedback}
          />
        </Box>
      )}

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccessMessage(null)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  )
}
