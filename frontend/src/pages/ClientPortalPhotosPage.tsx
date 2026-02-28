import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useClientPortal } from '../contexts/ClientPortalContext'
import { clientPortalApi, type FileResponse } from '../api/clientPortal'
import { PhotoGallery } from '../components/client-portal/PhotoGallery'
import { EmptyState, LoadingError } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { ImageIcon } from '@/icons'
import { Box, Container } from '@/mui'

export default function ClientPortalPhotosPage() {
  const { t } = useTranslation()
  const { projectId, project } = useClientPortal()
  const [photos, setPhotos] = useState<FileResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPhotos = async () => {
      if (!projectId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await clientPortalApi.listPhotos(projectId, 100, 0)
        setPhotos(data)
      } catch (err) {
        console.error('Failed to fetch photos:', err)
        setError(err instanceof Error ? err.message : t('clientPortal.failedToLoadPhotos'))
      } finally {
        setLoading(false)
      }
    }

    fetchPhotos()
  }, [projectId, t])

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

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <PageHeader
          title={t('clientPortal.photos')}
          subtitle={project?.name}
          icon={<ImageIcon />}
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
        title={t('clientPortal.photos')}
        subtitle={project?.name}
        icon={<ImageIcon />}
      />
      <Box sx={{ mt: 3 }}>
        <PhotoGallery
          photos={photos}
          projectId={projectId}
          loading={loading}
        />
      </Box>
    </Container>
  )
}
