'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import CancelIcon from '@mui/icons-material/Cancel'
import { apiClient } from '@/lib/api/client'

interface ApprovalStep {
  id: string
  step_order: number
  status: string
  reviewer_role?: string
}

interface Approval {
  id: string
  entity_type: string
  entity_id: string
  current_status: string
  steps: ApprovalStep[]
  created_at?: string
}

const STATUS_CHIP: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  draft: 'default',
}

export default function ApprovalsPage() {
  const t = useTranslations()
  const params = useParams()!
  const projectId = params.projectId as string
  const [items, setItems] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get(`/approvals?project_id=${projectId}`)
      setItems(res.data || [])
    } catch {
      setError('Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }

  const pendingCount = items.filter((a) => a.current_status === 'pending').length
  const approvedCount = items.filter((a) => a.current_status === 'approved').length
  const rejectedCount = items.filter((a) => a.current_status === 'rejected').length

  if (loading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Skeleton variant="text" width={250} height={48} sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, mb: 3 }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />)}
        </Box>
        {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3, mb: 2 }} />)}
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>{t('approvals.title', { defaultValue: 'Approvals' })}</Typography>
        <Typography variant="body1" color="text.secondary">
          {t('approvals.subtitle', { defaultValue: 'Track approval workflows for equipment and materials' })}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssignmentTurnedInIcon color="primary" />
            <Box>
              <Typography variant="h5" fontWeight={700}>{items.length}</Typography>
              <Typography variant="body2" color="text.secondary">Total</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <HourglassEmptyIcon color="warning" />
            <Box>
              <Typography variant="h5" fontWeight={700}>{pendingCount}</Typography>
              <Typography variant="body2" color="text.secondary">Pending</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircleIcon color="success" />
            <Box>
              <Typography variant="h5" fontWeight={700}>{approvedCount}</Typography>
              <Typography variant="body2" color="text.secondary">Approved</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CancelIcon color="error" />
            <Box>
              <Typography variant="h5" fontWeight={700}>{rejectedCount}</Typography>
              <Typography variant="body2" color="text.secondary">Rejected</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {items.length === 0 ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <AssignmentTurnedInIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>No approval requests</Typography>
            <Typography variant="body2" color="text.secondary">
              Approvals are created automatically from equipment and material submissions
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((approval) => {
            const totalSteps = approval.steps?.length || 1
            const completedSteps = approval.steps?.filter((s) => s.status === 'approved').length || 0
            const progress = Math.round((completedSteps / totalSteps) * 100)

            return (
              <Card key={approval.id} sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Chip
                        label={approval.entity_type}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        ID: {approval.entity_id?.slice(0, 8)}...
                      </Typography>
                    </Box>
                    <Chip
                      label={approval.current_status}
                      size="small"
                      color={STATUS_CHIP[approval.current_status] || 'default'}
                      sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                    />
                  </Box>
                  <Box sx={{ mb: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Step {completedSteps} of {totalSteps} completed
                      </Typography>
                      <Typography variant="caption" fontWeight={600}>{progress}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      color={approval.current_status === 'rejected' ? 'error' : approval.current_status === 'approved' ? 'success' : 'primary'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  {approval.steps && approval.steps.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                      {approval.steps.map((step) => (
                        <Chip
                          key={step.id}
                          label={step.reviewer_role || `Step ${step.step_order}`}
                          size="small"
                          variant={step.status === 'approved' ? 'filled' : 'outlined'}
                          color={step.status === 'approved' ? 'success' : step.status === 'rejected' ? 'error' : 'default'}
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
