import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import FileAttachmentPanel from '../ui/FileAttachmentPanel'
import ApprovalWorkflowSection from '../ui/ApprovalWorkflowSection'
import EntityVersionHistory from '../ui/EntityVersionHistory'
import type { Equipment } from '../../types'
import { CloseIcon, SendIcon, BuildIcon } from '@/icons'
import { Box, Typography, Drawer, Divider, Chip, IconButton } from '@/mui'

interface EquipmentDrawerProps {
  open: boolean
  onClose: () => void
  equipment: Equipment | null
  projectId: string
  onEdit: (eq: Equipment) => void
  onSubmitForApproval: () => void
  submitting: boolean
}

export default function EquipmentDrawer({ open, onClose, equipment, projectId, onEdit, onSubmitForApproval, submitting }: EquipmentDrawerProps) {
  const { t } = useTranslation()

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: 1400 }}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, borderRadius: '16px 0 0 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
    >
      {equipment && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: { xs: 1.5, sm: 2, md: 3 }, pb: 0, position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.default' }}>
            <Typography variant="h6" fontWeight={600}>{t('equipment.details')}</Typography>
            <IconButton aria-label={t('common.close')} onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, pt: 1.5, overflowY: 'auto', flex: 1 }}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BuildIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{equipment.name}</Typography>
                  <StatusBadge status={equipment.status} />
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              {t('equipment.details')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3, p: { xs: 1.5, sm: 2 }, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('equipment.type')}</Typography>
                <Typography variant="body2" fontWeight={500}>{equipment.equipmentType || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('equipment.manufacturer')}</Typography>
                <Typography variant="body2" fontWeight={500}>{equipment.manufacturer || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('equipment.model')}</Typography>
                <Typography variant="body2" fontWeight={500}>{equipment.modelNumber || '-'}</Typography>
              </Box>
              {equipment.notes && (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="caption" color="text.secondary">{t('common.notes')}</Typography>
                  <Typography variant="body2">{equipment.notes}</Typography>
                </Box>
              )}
            </Box>

            {equipment.specifications && Object.keys(equipment.specifications).length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                  {t('keyValueEditor.title')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(equipment.specifications).map(([key, value]) => (
                    <Chip key={key} label={`${key}: ${value}`} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
                  ))}
                </Box>
              </>
            )}

            <Divider sx={{ my: 2 }} />

            <FileAttachmentPanel projectId={projectId} entityType="equipment" entityId={equipment.id} />

            <Divider sx={{ my: 2 }} />

            <ApprovalWorkflowSection
              status={equipment.status as any}
              onSubmitForApproval={onSubmitForApproval}
              submitting={submitting}
            />

            <Divider sx={{ my: 2 }} />

            <EntityVersionHistory projectId={projectId} entityType="equipment" entityId={equipment.id} />

            <Box sx={{ mt: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              {equipment.status === 'draft' && (
                <Button variant="primary" icon={submitting ? undefined : <SendIcon />} loading={submitting} fullWidth onClick={onSubmitForApproval}>
                  {t('equipment.submitForApproval')}
                </Button>
              )}
              <Button variant="secondary" fullWidth onClick={() => onEdit(equipment)}>
                {t('equipment.editEquipment')}
              </Button>
            </Box>
          </Box>
        </>
      )}
    </Drawer>
  )
}
