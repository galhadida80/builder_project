import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'
import { KPICard } from '../ui/Card'
import { rfiApi, RFISummary } from '../../api/rfi'
import { useToast } from '../common/ToastProvider'
import { InfoOutlinedIcon, WarningAmberIcon, CheckCircleOutlineIcon, TaskAltIcon } from '@/icons'
import { Box, Typography, Skeleton } from '@/mui'

interface RFIStatsWidgetProps {
  projectId?: string
}

export default function RFIStatsWidget({ projectId }: RFIStatsWidgetProps) {
  const { t } = useTranslation()
  const [stats, setStats] = useState<RFISummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { showError } = useToast()

  const loadRFIStats = async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      const data = await rfiApi.getSummary(projectId)
      setStats(data)
    } catch (err) {
      const errorMessage = t('rfis.failedToLoadStats')
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadRFIStats()
    } else {
      setLoading(false)
      setError('No project selected')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const handleStatClick = (status: string) => {
    if (!projectId) return
    navigate(`/projects/${projectId}/rfis?status=${status}`)
  }

  const handleOverdueClick = () => {
    if (!projectId) return
    navigate(`/projects/${projectId}/rfis?overdue=true`)
  }

  if (!projectId) {
    return (
      <Card>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            RFI Statistics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a project to view RFI statistics
          </Typography>
        </Box>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            RFI Statistics
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            {[...Array(4)].map((_, i) => (
              <Box key={i}>
                <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} />
              </Box>
            ))}
          </Box>
        </Box>
      </Card>
    )
  }

  if (error || !stats) {
    return (
      <Card>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            RFI Statistics
          </Typography>
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            {error || t('rfis.failedToLoadStats')}
          </Typography>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={loadRFIStats}
          >
            Retry
          </Typography>
        </Box>
      </Card>
    )
  }

  return (
    <Card>
      <Box sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          RFI Statistics
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <KPICard
            title="Open RFIs"
            value={stats.open_count}
            icon={<InfoOutlinedIcon />}
            color="info"
            onClick={() => handleStatClick('open')}
          />
          <KPICard
            title="Overdue"
            value={stats.overdue_count}
            icon={<WarningAmberIcon />}
            color="error"
            onClick={handleOverdueClick}
          />
          <KPICard
            title="Answered"
            value={stats.answered_count}
            icon={<CheckCircleOutlineIcon />}
            color="success"
            onClick={() => handleStatClick('answered')}
          />
          <KPICard
            title="Closed"
            value={stats.closed_count}
            icon={<TaskAltIcon />}
            color="primary"
            onClick={() => handleStatClick('closed')}
          />
        </Box>
      </Box>
    </Card>
  )
}
