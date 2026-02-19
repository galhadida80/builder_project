import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChecklistSubSection, ChecklistItemTemplate, ChecklistItemResponse } from '../../types'
import { ExpandMoreIcon, ExpandLessIcon, CheckCircleIcon, RadioButtonUncheckedIcon, CancelIcon } from '@/icons'
import { Box, Typography, Collapse, LinearProgress, CircularProgress, IconButton, Chip, ToggleButton, ToggleButtonGroup, TextField } from '@/mui'
import { styled } from '@/mui'
import { PhotoCapture } from './PhotoCapture'
import { SignaturePad } from './SignaturePad'

interface ChecklistSectionProps {
  section: ChecklistSubSection
  responses?: ChecklistItemResponse[]
  defaultExpanded?: boolean
  onStatusChange?: (item: ChecklistItemTemplate, status: string, notes?: string) => void
  onPhotosChange?: (item: ChecklistItemTemplate, files: File[]) => void
  onSignatureChange?: (item: ChecklistItemTemplate, signature: string | null) => void
  savingResponse?: boolean
  readOnly?: boolean
}

const SectionContainer = styled(Box)(({ theme }) => ({
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  marginBottom: theme.spacing(2),
  transition: 'all 200ms ease-out',
  '&:hover': {
    boxShadow: theme.shadows[2],
  },
}))

const SectionHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  cursor: 'pointer',
  backgroundColor: theme.palette.background.paper,
  transition: 'background-color 150ms ease-out',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
  },
}))

const ItemRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5, 2),
  borderTop: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  transition: 'background-color 150ms ease-out',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
  },
}))

export function ChecklistSection({
  section,
  responses = [],
  defaultExpanded = false,
  onStatusChange,
  onPhotosChange,
  onSignatureChange,
  savingResponse = false,
  readOnly = false,
}: ChecklistSectionProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})

  const totalItems = section.items?.length || 0
  const completedItems = section.items?.filter((item) => {
    const response = responses.find((r) => r.item_template_id === item.id)
    return response && response.status !== 'pending'
  }).length || 0

  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  const isComplete = completedItems === totalItems && totalItems > 0

  const getItemResponse = (itemId: string): ChecklistItemResponse | undefined => {
    return responses.find((r) => r.item_template_id === itemId)
  }

  const isItemComplete = (itemId: string): boolean => {
    const response = getItemResponse(itemId)
    return !!response && response.status !== 'pending'
  }

  const handleItemClick = (item: ChecklistItemTemplate) => {
    if (readOnly) return
    if (activeItemId === item.id) {
      setActiveItemId(null)
      return
    }
    setActiveItemId(item.id)
    const existing = getItemResponse(item.id)
    if (existing?.notes && !itemNotes[item.id]) {
      setItemNotes((prev) => ({ ...prev, [item.id]: existing.notes || '' }))
    }
  }

  const handleStatusChange = (item: ChecklistItemTemplate, status: string) => {
    if (onStatusChange) {
      onStatusChange(item, status, itemNotes[item.id] || undefined)
    }
  }

  const getNotes = (itemId: string): string => {
    return itemNotes[itemId] ?? getItemResponse(itemId)?.notes ?? ''
  }

  return (
    <SectionContainer>
      <SectionHeader
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded) }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box
            sx={{
              width: 32, height: 32, borderRadius: '50%',
              bgcolor: isComplete ? 'success.main' : 'primary.main',
              color: 'white', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600,
            }}
          >
            {section.order}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {section.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {t('checklists.itemsCompleted', { completed: completedItems, total: totalItems })}
              </Typography>
              {isComplete && (
                <Chip
                  size="small"
                  icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                  label={t('common.statuses.completed')}
                  color="success"
                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                />
              )}
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ minWidth: 80, textAlign: 'right' }}>
            <Typography variant="caption" fontWeight={600} sx={{ color: isComplete ? 'success.main' : 'primary.main' }}>
              {progressPercent}%
            </Typography>
          </Box>
          <IconButton
            aria-label={expanded ? t('checklist.collapseSection') : t('checklist.expandSection')}
            size="small"
            sx={{ transition: 'transform 200ms ease-out', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </SectionHeader>

      <LinearProgress
        variant="determinate"
        value={progressPercent}
        sx={{
          height: 4, backgroundColor: 'action.hover',
          '& .MuiLinearProgress-bar': { backgroundColor: isComplete ? 'success.main' : 'primary.main' },
        }}
      />

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ bgcolor: 'background.default' }}>
          {section.items && section.items.length > 0 ? (
            section.items.map((item) => {
              const itemComplete = isItemComplete(item.id)
              const response = getItemResponse(item.id)
              const isActive = activeItemId === item.id

              return (
                <Box key={item.id}>
                  <ItemRow
                    role="button"
                    tabIndex={0}
                    onClick={() => handleItemClick(item)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleItemClick(item) }
                    }}
                    sx={isActive ? { bgcolor: 'action.selected', borderInlineStart: 3, borderColor: 'primary.main' } : {}}
                  >
                    <Box>
                      {itemComplete ? (
                        <CheckCircleIcon sx={{ fontSize: 24, color: response?.status === 'rejected' ? 'error.main' : 'success.main' }} />
                      ) : (
                        <RadioButtonUncheckedIcon sx={{ fontSize: 24, color: 'text.secondary' }} />
                      )}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{
                          color: itemComplete && response?.status !== 'rejected' ? 'text.secondary' : 'text.primary',
                          textDecoration: response?.status === 'approved' ? 'line-through' : 'none',
                        }}
                      >
                        {item.name}
                      </Typography>
                      {item.description && (
                        <Typography variant="caption" color="text.secondary">{item.description}</Typography>
                      )}
                      {response && response.status && (
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={t(`common.statuses.${response.status}`, response.status)}
                            color={
                              response.status === 'approved' ? 'success'
                                : response.status === 'rejected' ? 'error'
                                : response.status === 'not_applicable' ? 'default'
                                : 'info'
                            }
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                          />
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      {item.must_image && (
                        <Chip size="small" label={t('checklists.requiresImage')} sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'info.light', color: 'info.dark' }} />
                      )}
                      {item.must_note && (
                        <Chip size="small" label={t('checklists.requiresNote')} sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'warning.light', color: 'warning.dark' }} />
                      )}
                      {item.must_signature && (
                        <Chip size="small" label={t('checklists.requiresSignature')} sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'secondary.light', color: 'secondary.dark' }} />
                      )}
                      {isActive && (
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setActiveItemId(null) }}>
                          <CancelIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                    </Box>
                  </ItemRow>

                  {/* Inline form */}
                  <Collapse in={isActive} timeout="auto" unmountOnExit>
                    <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: 1, borderColor: 'primary.light', bgcolor: 'background.paper' }}>
                      {/* Status buttons */}
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        {t('common.status')}
                      </Typography>
                      <ToggleButtonGroup
                        value={response?.status || 'pending'}
                        exclusive
                        onChange={(_, val) => { if (val) handleStatusChange(item, val) }}
                        size="small"
                        disabled={savingResponse}
                        sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5, '& .MuiToggleButton-root': { borderRadius: '8px !important', border: '1px solid', borderColor: 'divider' } }}
                      >
                        <ToggleButton value="approved" color="success" sx={{ textTransform: 'none', fontSize: '0.75rem', px: { xs: 1, sm: 1.5 } }}>
                          {t('checklists.statusApproved')}
                        </ToggleButton>
                        <ToggleButton value="rejected" color="error" sx={{ textTransform: 'none', fontSize: '0.75rem', px: { xs: 1, sm: 1.5 } }}>
                          {t('checklists.statusRejected')}
                        </ToggleButton>
                        <ToggleButton value="not_applicable" sx={{ textTransform: 'none', fontSize: '0.75rem', px: { xs: 1, sm: 1.5 } }}>
                          {t('checklists.statusNotApplicable')}
                        </ToggleButton>
                        <ToggleButton value="pending" sx={{ textTransform: 'none', fontSize: '0.75rem', px: { xs: 1, sm: 1.5 } }}>
                          {t('checklists.statusPending')}
                        </ToggleButton>
                      </ToggleButtonGroup>

                      {savingResponse && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <CircularProgress size={14} />
                          <Typography variant="caption" color="text.secondary">
                            {t('common.saving')}
                          </Typography>
                        </Box>
                      )}

                      {/* Comment field - always visible */}
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        label={t('common.notes')}
                        placeholder={t('checklists.addNotes')}
                        value={getNotes(item.id)}
                        onChange={(e) => setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        disabled={savingResponse}
                        sx={{ mb: 2 }}
                      />

                      {/* Photo upload */}
                      {item.must_image && (
                        <Box sx={{ mb: 2 }}>
                          <PhotoCapture
                            maxPhotos={5}
                            onPhotosChange={(files) => onPhotosChange?.(item, files)}
                            disabled={savingResponse}
                          />
                        </Box>
                      )}

                      {/* Signature */}
                      {item.must_signature && (
                        <Box sx={{ mb: 1 }}>
                          <SignaturePad
                            onSignatureChange={(sig) => onSignatureChange?.(item, sig)}
                            required
                            disabled={savingResponse}
                          />
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              )
            })
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t('checklists.noItems')}
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </SectionContainer>
  )
}
