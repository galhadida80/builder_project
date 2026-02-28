import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import {
  AutoAwesomeIcon,
  CheckCircleIcon,
  CloseIcon,
  TrendingUpIcon,
  BuildIcon,
} from '@/icons'
import {
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Collapse,
  alpha,
} from '@/mui'

interface MitigationItem {
  strategy: string
  priority: 'high' | 'medium' | 'low'
  impact?: string
  effort?: 'low' | 'medium' | 'high'
  target_tasks?: string[]
  risk_category?: string
}

interface MitigationSuggestionsData {
  suggestions?: MitigationItem[]
  processing_time_ms?: number
  model_used?: string
}

interface MitigationSuggestionsProps {
  data?: MitigationSuggestionsData | Record<string, unknown>
  onApply?: (suggestionIndex: number) => void
  onDismiss?: (suggestionIndex: number) => void
}

const PRIORITY_CONFIG = {
  high: { color: '#EF4444', icon: <TrendingUpIcon fontSize="small" />, label: 'גבוהה' },
  medium: { color: '#F59E0B', icon: <TrendingUpIcon fontSize="small" />, label: 'בינונית' },
  low: { color: '#22C55E', icon: <CheckCircleIcon fontSize="small" />, label: 'נמוכה' },
}

const EFFORT_CONFIG = {
  low: { label: 'נמוך', color: '#22C55E' },
  medium: { label: 'בינוני', color: '#F59E0B' },
  high: { label: 'גבוה', color: '#EF4444' },
}

export function MitigationSuggestions({ data, onApply, onDismiss }: MitigationSuggestionsProps) {
  const { t } = useTranslation()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [appliedIndices, setAppliedIndices] = useState<Set<number>>(new Set())
  const [dismissedIndices, setDismissedIndices] = useState<Set<number>>(new Set())

  // Handle nested structure: data might be { suggestions: { suggestions: [...] } } or { suggestions: [...] }
  let suggestions: MitigationItem[] = []
  if (data) {
    if ('suggestions' in data && Array.isArray(data.suggestions)) {
      suggestions = data.suggestions as MitigationItem[]
    } else if ('suggestions' in data && typeof data.suggestions === 'object' && data.suggestions !== null) {
      const nested = data.suggestions as Record<string, unknown>
      if ('suggestions' in nested && Array.isArray(nested.suggestions)) {
        suggestions = nested.suggestions as MitigationItem[]
      }
    }
  }

  const handleToggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  const handleApply = (index: number) => {
    setAppliedIndices(prev => new Set(prev).add(index))
    if (onApply) onApply(index)
  }

  const handleDismiss = (index: number) => {
    setDismissedIndices(prev => new Set(prev).add(index))
    if (onDismiss) onDismiss(index)
  }

  const visibleSuggestions = suggestions.filter((_, index) => !dismissedIndices.has(index))

  if (!data || visibleSuggestions.length === 0) {
    return (
      <Card sx={{ p: { xs: 2, sm: 3 } }}>
        <EmptyState
          icon={<AutoAwesomeIcon sx={{ fontSize: 48, color: 'text.disabled' }} />}
          title={t('scheduleRisk.mitigation.noSuggestions', 'אין המלצות זמינות')}
          description={t('scheduleRisk.mitigation.noSuggestionsDesc', 'המלצות AI למיתון סיכונים יופיעו כאן לאחר ניתוח לוח הזמנים')}
        />
      </Card>
    )
  }

  return (
    <Card sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AutoAwesomeIcon sx={{ color: 'warning.main', fontSize: { xs: 20, sm: 24 } }} />
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {t('scheduleRisk.mitigation.title', 'המלצות למיתון סיכונים')}
        </Typography>
        <Chip
          label={`${visibleSuggestions.length}`}
          size="small"
          sx={{
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
            color: 'primary.main',
            fontWeight: 600,
            fontSize: { xs: '0.7rem', sm: '0.75rem' },
            height: { xs: 20, sm: 24 },
            mr: 'auto',
          }}
        />
      </Box>

      {/* Suggestions List */}
      <List sx={{ p: 0 }}>
        {visibleSuggestions.map((suggestion, index) => {
          const originalIndex = suggestions.indexOf(suggestion)
          const isExpanded = expandedIndex === originalIndex
          const isApplied = appliedIndices.has(originalIndex)
          const priorityConfig = PRIORITY_CONFIG[suggestion.priority] || PRIORITY_CONFIG.medium
          const effortConfig = suggestion.effort ? EFFORT_CONFIG[suggestion.effort] : null

          return (
            <ListItem
              key={originalIndex}
              sx={{
                flexDirection: 'column',
                alignItems: 'stretch',
                borderRadius: 2,
                mb: 1.5,
                bgcolor: (theme) => alpha(theme.palette.background.default, 0.4),
                border: 1,
                borderColor: isApplied ? 'success.main' : 'divider',
                p: { xs: 1, sm: 1.5 },
                '&:last-child': { mb: 0 },
              }}
            >
              {/* Main Content */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1, sm: 1.5 }, width: '100%' }}>
                <ListItemIcon sx={{ minWidth: { xs: 32, sm: 40 }, mt: 0.5 }}>
                  <Box
                    sx={{
                      width: { xs: 32, sm: 36 },
                      height: { xs: 32, sm: 36 },
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(priorityConfig.color, 0.15),
                      color: priorityConfig.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {priorityConfig.icon}
                  </Box>
                </ListItemIcon>

                <ListItemText
                  sx={{ flex: 1, minWidth: 0 }}
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Chip
                        label={t(`scheduleRisk.priority.${suggestion.priority}`, priorityConfig.label)}
                        size="small"
                        sx={{
                          bgcolor: (theme) => alpha(priorityConfig.color, 0.15),
                          color: priorityConfig.color,
                          fontWeight: 600,
                          fontSize: { xs: '0.65rem', sm: '0.7rem' },
                          height: { xs: 20, sm: 24 },
                        }}
                      />
                      {effortConfig && (
                        <Chip
                          icon={<BuildIcon sx={{ fontSize: '0.875rem !important' }} />}
                          label={t(`scheduleRisk.effort.${suggestion.effort}`, effortConfig.label)}
                          size="small"
                          sx={{
                            bgcolor: (theme) => alpha(effortConfig.color, 0.1),
                            color: effortConfig.color,
                            fontSize: { xs: '0.65rem', sm: '0.7rem' },
                            height: { xs: 20, sm: 24 },
                          }}
                        />
                      )}
                      {isApplied && (
                        <Chip
                          icon={<CheckCircleIcon sx={{ fontSize: '0.875rem !important' }} />}
                          label={t('scheduleRisk.mitigation.applied', 'יושם')}
                          size="small"
                          sx={{
                            bgcolor: (theme) => alpha(theme.palette.success.main, 0.15),
                            color: 'success.main',
                            fontSize: { xs: '0.65rem', sm: '0.7rem' },
                            height: { xs: 20, sm: 24 },
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.primary',
                        fontSize: { xs: '0.875rem', sm: '0.95rem' },
                        fontWeight: 500,
                        lineHeight: 1.5,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleToggleExpand(originalIndex)}
                    >
                      {suggestion.strategy}
                    </Typography>
                  }
                />

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                  {!isApplied && onApply && (
                    <IconButton
                      size="small"
                      onClick={() => handleApply(originalIndex)}
                      sx={{
                        color: 'success.main',
                        '&:hover': { bgcolor: (theme) => alpha(theme.palette.success.main, 0.1) },
                      }}
                      title={t('scheduleRisk.mitigation.markApplied', 'סמן כיושם')}
                    >
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  )}
                  {onDismiss && (
                    <IconButton
                      size="small"
                      onClick={() => handleDismiss(originalIndex)}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': { bgcolor: (theme) => alpha(theme.palette.error.main, 0.1), color: 'error.main' },
                      }}
                      title={t('scheduleRisk.mitigation.dismiss', 'הסתר')}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {/* Expanded Details */}
              <Collapse in={isExpanded}>
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                  {suggestion.impact && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {t('scheduleRisk.mitigation.expectedImpact', 'השפעה צפויה')}:
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.25, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {suggestion.impact}
                      </Typography>
                    </Box>
                  )}
                  {suggestion.target_tasks && suggestion.target_tasks.length > 0 && !suggestion.target_tasks.includes('general') && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {t('scheduleRisk.mitigation.targetTasks', 'משימות מטרה')}:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {suggestion.target_tasks.slice(0, 5).map((task, taskIdx) => (
                          <Chip
                            key={taskIdx}
                            label={task}
                            size="small"
                            sx={{
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              height: { xs: 20, sm: 24 },
                            }}
                          />
                        ))}
                        {suggestion.target_tasks.length > 5 && (
                          <Chip
                            label={`+${suggestion.target_tasks.length - 5}`}
                            size="small"
                            sx={{
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              height: { xs: 20, sm: 24 },
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}
                  {suggestion.risk_category && (
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {t('scheduleRisk.mitigation.category', 'קטגוריה')}:
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.25, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {t(`scheduleRisk.category.${suggestion.risk_category}`, suggestion.risk_category.replace(/_/g, ' '))}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </ListItem>
          )
        })}
      </List>

      {/* Footer Info */}
      {data && 'model_used' in data && (
        <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textAlign: 'center' }}>
            {t('scheduleRisk.mitigation.poweredBy', 'מופעל על ידי')} {(data as any).model_used}
            {(data as any).processing_time_ms && ` • ${Math.round((data as any).processing_time_ms)}ms`}
          </Typography>
        </Box>
      )}
    </Card>
  )
}
