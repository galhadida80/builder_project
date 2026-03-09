import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { ConstructionArea, AreaChecklistSummary, ChecklistInstance } from '../../types'
import { areaStructureApi } from '../../api/areaStructure'
import { checklistsApi } from '../../api/checklists'
import { useToast } from '../common/ToastProvider'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { EmptyState } from '../ui/EmptyState'
import { AreaChecklistSummaryCard } from './AreaChecklistSummary'
import { Box, Typography, Drawer, IconButton, Chip, Divider, Skeleton, LinearProgress } from '@/mui'
import { CloseIcon, AddIcon, AssignmentIcon, BuildIcon, InventoryIcon } from '@/icons'

interface AreaDetailDrawerProps {
  open: boolean
  onClose: () => void
  area: ConstructionArea | null
  projectId: string
}

interface AreaEntity {
  id: string
  name: string
  equipmentType?: string
  materialType?: string
  status: string
}

interface AreaEntities {
  equipment: AreaEntity[]
  materials: AreaEntity[]
  checklists: Array<{ id: string; unitIdentifier: string; status: string }>
}

export function AreaDetailDrawer({ open, onClose, area, projectId }: AreaDetailDrawerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [summary, setSummary] = useState<AreaChecklistSummary | null>(null)
  const [instances, setInstances] = useState<ChecklistInstance[]>([])
  const [entities, setEntities] = useState<AreaEntities | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingInstances, setLoadingInstances] = useState(false)
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (open && area && projectId) {
      loadData(area.id)
    }
    if (!open) {
      setSummary(null)
      setInstances([])
      setEntities(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, area?.id, projectId])

  const loadData = async (areaId: string) => {
    setLoadingSummary(true)
    setLoadingInstances(true)
    setLoadingEntities(true)

    try {
      const summaryData = await areaStructureApi.getAreaChecklistSummary(projectId, areaId)
      setSummary(summaryData)
    } catch {
      setSummary(null)
    } finally {
      setLoadingSummary(false)
    }

    try {
      const instanceData = await checklistsApi.getInstances(projectId, areaId)
      setInstances(instanceData)
    } catch {
      setInstances([])
    } finally {
      setLoadingInstances(false)
    }

    try {
      const entitiesData = await areaStructureApi.getEntities(projectId, areaId)
      setEntities(entitiesData)
    } catch {
      setEntities(null)
    } finally {
      setLoadingEntities(false)
    }
  }

  const handleCreateChecklists = async () => {
    if (!area) return
    setCreating(true)
    try {
      const result = await areaStructureApi.createAreaChecklists(projectId, area.id)
      showSuccess(t('areaChecklists.checklistsCreated', { count: result.checklistsCreated }))
      loadData(area.id)
    } catch {
      showError(t('checklists.failedToCreate'))
    } finally {
      setCreating(false)
    }
  }

  if (!area) return null

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: 1400 }}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 420 }, maxWidth: '100vw' } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={600} noWrap>
                {area.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                {area.areaCode && (
                  <Chip size="small" label={area.areaCode} variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                )}
                {area.areaType && (
                  <Chip size="small" label={area.areaType} sx={{ fontSize: '0.7rem' }} />
                )}
                {area.areaLevel && (
                  <Chip
                    size="small"
                    label={t(`areaLevels.${area.areaLevel}`, area.areaLevel)}
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}
                {area.status && <StatusBadge status={area.status} />}
              </Box>
            </Box>
            <IconButton
              aria-label={t('common.close')}
              onClick={onClose}
              sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Area details row */}
          <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
            {area.floorNumber !== undefined && (
              <Typography variant="caption" color="text.secondary">
                {t('areas.floor')} {area.floorNumber}
              </Typography>
            )}
            {area.totalUnits !== undefined && area.totalUnits > 0 && (
              <Typography variant="caption" color="text.secondary">
                {area.totalUnits} {t('areas.units')}
              </Typography>
            )}
            {area.currentProgress !== undefined && (
              <Typography variant="caption" color="text.secondary">
                {t('areas.progress')}: {area.currentProgress}%
              </Typography>
            )}
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <AreaChecklistSummaryCard summary={summary} loading={loadingSummary} />

          {/* Linked Equipment */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <BuildIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              {t('areas.linkedEquipment')}
            </Typography>
            {entities?.equipment && <Chip size="small" label={entities.equipment.length} color="primary" variant="outlined" />}
          </Box>
          {loadingEntities ? (
            <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mb: 1 }} />
          ) : !entities?.equipment?.length ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('areas.noLinkedEquipment')}</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1 }}>
              {entities.equipment.map((eq) => (
                <Card key={eq.id} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => { onClose(); navigate(`/projects/${projectId}/equipment`) }}>
                  <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <BuildIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500} noWrap>{eq.name}</Typography>
                        {eq.equipmentType && <Typography variant="caption" color="text.secondary" noWrap>{eq.equipmentType}</Typography>}
                      </Box>
                    </Box>
                    <StatusBadge status={eq.status} size="small" />
                  </Box>
                </Card>
              ))}
            </Box>
          )}

          {/* Linked Materials */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <InventoryIcon sx={{ fontSize: 18, color: 'info.main' }} />
              {t('areas.linkedMaterials')}
            </Typography>
            {entities?.materials && <Chip size="small" label={entities.materials.length} color="info" variant="outlined" />}
          </Box>
          {loadingEntities ? (
            <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mb: 1 }} />
          ) : !entities?.materials?.length ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('areas.noLinkedMaterials')}</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1 }}>
              {entities.materials.map((mat) => (
                <Card key={mat.id} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => { onClose(); navigate(`/projects/${projectId}/materials`) }}>
                  <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <InventoryIcon sx={{ fontSize: 16, color: 'info.main', flexShrink: 0 }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500} noWrap>{mat.name}</Typography>
                        {mat.materialType && <Typography variant="caption" color="text.secondary" noWrap>{mat.materialType}</Typography>}
                      </Box>
                    </Box>
                    <StatusBadge status={mat.status} size="small" />
                  </Box>
                </Card>
              ))}
            </Box>
          )}

          {/* Checklists */}
          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {t('areaChecklists.viewChecklists')}
            </Typography>
            <Chip size="small" label={instances.length} color="primary" variant="outlined" />
          </Box>

          {loadingInstances ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 2 }} />
              ))}
            </Box>
          ) : instances.length === 0 ? (
            <EmptyState
              variant="no-data"
              title={t('areaChecklists.noChecklists')}
              description={t('areaChecklists.noChecklistsDescription')}
              icon={<AssignmentIcon sx={{ fontSize: 48 }} />}
              sx={{ py: 3 }}
            />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {instances.map((instance) => {
                const totalItems = instance.responses.length
                const completedItems = instance.responses.filter(
                  (r) => r.status === 'approved' || r.status === 'not_applicable'
                ).length
                const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

                return (
                  <Card key={instance.id} sx={{ cursor: 'default' }}>
                    <Box sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                          <AssignmentIcon sx={{ fontSize: 16, color: 'info.main', flexShrink: 0 }} />
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {instance.unit_identifier}
                          </Typography>
                        </Box>
                        <StatusBadge status={instance.status} size="small" />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={percent}
                          sx={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              bgcolor: percent === 100 ? 'success.main' : 'primary.main',
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, textAlign: 'end' }}>
                          {completedItems}/{totalItems}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                )
              })}
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            variant="primary"
            fullWidth
            icon={<AddIcon />}
            onClick={handleCreateChecklists}
            loading={creating}
          >
            {t('areaChecklists.createInstances')}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}
