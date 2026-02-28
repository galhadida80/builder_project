import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { Avatar } from '../ui/Avatar'
import type { ApprovalRequest, Equipment, Material } from '../../types'
import { BuildIcon, InventoryIcon, CheckCircleIcon, CancelIcon, DescriptionIcon, AccessTimeIcon } from '@/icons'
import { Box, Typography, Chip, alpha, useTheme } from '@/mui'
import { getDateLocale } from '../../utils/dateLocale'

interface ApprovalCardProps {
  approval: ApprovalRequest
  entity: Equipment | Material | undefined
  onApprove: (approval: ApprovalRequest) => void
  onReject: (approval: ApprovalRequest) => void
}

export function ApprovalCard({ approval, entity, onApprove, onReject }: ApprovalCardProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isPending = approval.currentStatus !== 'approved' && approval.currentStatus !== 'rejected'
  const isUrgent = isPending && approval.steps?.some(s => s.approverRole === 'project_admin')
  const categoryColor = approval.entityType === 'equipment'
    ? { bg: alpha(theme.palette.info.main, 0.1), text: theme.palette.info.dark, label: t('approvals.equipment') }
    : { bg: alpha(theme.palette.success.main, 0.1), text: theme.palette.success.dark, label: t('approvals.material') }
  const submitter = approval.createdBy
  const documents = entity && 'documents' in entity ? (entity as Equipment | Material).documents : undefined
  const docCount = documents?.length || 0

  return (
    <Card sx={{
      ...(isPending && { border: '1px solid', borderColor: 'warning.light' }),
      ...(isUrgent && {
        border: '2px solid',
        borderColor: 'error.main',
        boxShadow: `0 0 12px ${alpha(theme.palette.error.main, 0.25)}`,
      }),
    }}>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Chip
            icon={approval.entityType === 'equipment' ? <BuildIcon sx={{ fontSize: 14 }} /> : <InventoryIcon sx={{ fontSize: 14 }} />}
            label={categoryColor.label}
            size="small"
            sx={{
              height: 24, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              bgcolor: categoryColor.bg, color: categoryColor.text,
              '& .MuiChip-icon': { color: categoryColor.text },
            }}
          />
          {isPending && (
            <Chip
              label={t('approvals.pendingApproval')}
              size="small"
              sx={{
                height: 22, fontSize: '0.65rem', fontWeight: 600,
                bgcolor: 'warning.light', color: 'warning.dark',
                '&::before': {
                  content: '""', width: 8, height: 8, borderRadius: '50%',
                  bgcolor: 'warning.main', display: 'inline-block', mr: 0.5, ml: 0.5,
                },
              }}
            />
          )}
        </Box>

        <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.3, mb: 1.5 }}>
          {entity?.name || t('approvals.unknown')}
        </Typography>

        {submitter && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Avatar name={submitter.fullName || submitter.email} size="small" />
            <Typography variant="body2" color="text.secondary">
              {t('approvals.submittedBy')}: {submitter.fullName || submitter.email}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {new Date(approval.createdAt).toLocaleDateString(getDateLocale())}
            </Typography>
          </Box>
          <StatusBadge status={approval.currentStatus} size="small" />
          {docCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DescriptionIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {docCount} {t('approvals.documents')}
              </Typography>
            </Box>
          )}
        </Box>

        {isPending && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Button variant="success" size="small" icon={<CheckCircleIcon />} onClick={() => onApprove(approval)} fullWidth>
              {t('approvals.approve')}
            </Button>
            <Button variant="danger" size="small" icon={<CancelIcon />} onClick={() => onReject(approval)} fullWidth>
              {t('approvals.reject')}
            </Button>
          </Box>
        )}
      </Box>
    </Card>
  )
}
