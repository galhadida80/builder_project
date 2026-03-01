import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Typography, IconButton, Skeleton, Toolbar, AppBar } from '@/mui'
import { ArrowBackIcon } from '@/icons'
import { useToast } from '../components/common/ToastProvider'
import { floorplansApi } from '../api/floorplans'
import { FloorplanCanvas } from '../components/floorplan/FloorplanCanvas'
import type { Floorplan } from '@/types/floorplan'

export default function FloorplanViewerPage() {
  const { t } = useTranslation()
  const { projectId, floorplanId } = useParams()
  const navigate = useNavigate()
  const { showError } = useToast()

  const [loading, setLoading] = useState(true)
  const [floorplan, setFloorplan] = useState<Floorplan | null>(null)

  useEffect(() => {
    if (!projectId || !floorplanId) {
      showError(t('floorplans.invalidParams'))
      navigate('/dashboard')
      return
    }
    loadFloorplan()
  }, [projectId, floorplanId])

  const loadFloorplan = async () => {
    if (!projectId || !floorplanId) return
    setLoading(true)
    try {
      const data = await floorplansApi.get(projectId, floorplanId)
      setFloorplan(data)
    } catch (error) {
      showError(t('floorplans.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handlePinCreated = () => {
    // Pin was created successfully - could reload pins here if needed
  }

  const handleBack = () => {
    navigate(`/projects/${projectId}/areas`)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t('floorplans.viewer')}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height="calc(100vh - 120px)" />
          </Box>
        ) : floorplan ? (
          <FloorplanCanvas
            floorplan={floorplan}
            onPinCreated={handlePinCreated}
          />
        ) : (
          <Box sx={{ p: 2 }}>
            <Typography color="error">{t('floorplans.loadFailed')}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
