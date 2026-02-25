import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../../utils/dateLocale'
import { apiClient } from '../../api/client'
import { HistoryIcon, PersonIcon, ExpandMoreIcon, ExpandLessIcon } from '@/icons'
import { Box, Typography, CircularProgress, Chip, Collapse, Avatar } from '@/mui'

interface VersionEntry {
  id: string
  versionNumber: number
  changes: Record<string, { old: unknown; new: unknown }>
  changedBy?: { id: string; fullName?: string; email: string }
  createdAt: string
}

interface EntityVersionHistoryProps {
  projectId: string
  entityType: string
  entityId: string
  title?: string
  maxVisible?: number
}

export default function EntityVersionHistory({
  projectId,
  entityType,
  entityId,
  title,
  maxVisible = 5,
}: EntityVersionHistoryProps) {
  const { t } = useTranslation()
  const dateLocale = getDateLocale()
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!projectId || !entityId) return
    const loadVersions = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await apiClient.get(
          `/projects/${projectId}/versions?entity_type=${entityType}&entity_id=${entityId}`
        )
        setVersions(response.data)
      } catch {
        setError(t('versionHistory.failedToLoad'))
      } finally {
        setLoading(false)
      }
    }
    loadVersions()
  }, [projectId, entityType, entityId, t])

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no')
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(dateLocale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const visibleVersions = showAll ? versions : versions.slice(0, maxVisible)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (error) {
    return <Typography color="error" variant="body2">{error}</Typography>
  }

  if (versions.length === 0) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <HistoryIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {title || t('versionHistory.title')}
          </Typography>
        </Box>
        <Box sx={{ py: 2, px: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
          <Typography color="text.secondary" variant="body2">
            {t('versionHistory.noHistory')}
          </Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <HistoryIcon fontSize="small" color="action" />
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {title || t('versionHistory.title')}
        </Typography>
        <Chip label={versions.length} size="small" color="default" sx={{ height: 20, fontSize: 11 }} />
      </Box>

      <Box sx={{ position: 'relative', pl: 3 }}>
        <Box
          sx={{
            position: 'absolute',
            left: 10,
            top: 0,
            bottom: 0,
            width: 2,
            bgcolor: 'divider',
            borderRadius: 1,
          }}
        />

        {visibleVersions.map((version) => {
          const isExpanded = expandedVersion === version.id
          const changeCount = Object.keys(version.changes).length

          return (
            <Box
              key={version.id}
              sx={{
                position: 'relative',
                mb: 2,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: -19,
                  top: 12,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  border: '2px solid',
                  borderColor: 'background.paper',
                },
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.selected' },
                  transition: 'background-color 150ms ease-out',
                }}
                onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`v${version.versionNumber}`}
                      size="small"
                      color="primary"
                      sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                    />
                    <Chip
                      label={t('versionHistory.changes', { count: changeCount })}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: 10 }}
                    />
                  </Box>
                  {isExpanded ? <ExpandLessIcon fontSize="small" color="action" /> : <ExpandMoreIcon fontSize="small" color="action" />}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  {version.changedBy && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Avatar sx={{ width: 18, height: 18, bgcolor: 'primary.light' }}>
                        <PersonIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        {version.changedBy.fullName || version.changedBy.email}
                      </Typography>
                    </Box>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(version.createdAt)}
                  </Typography>
                </Box>

                <Collapse in={isExpanded}>
                  <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Object.entries(version.changes).map(([field, change]) => (
                      <Box
                        key={field}
                        sx={{
                          p: 1,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {field}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          <Typography
                            variant="caption"
                            sx={{
                              textDecoration: 'line-through',
                              color: 'error.main',
                              bgcolor: 'error.50',
                              px: 0.5,
                              borderRadius: 0.5,
                              wordBreak: 'break-word',
                            }}
                          >
                            {formatValue(change.old)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">→</Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'success.main',
                              bgcolor: 'success.50',
                              px: 0.5,
                              borderRadius: 0.5,
                              fontWeight: 500,
                              wordBreak: 'break-word',
                            }}
                          >
                            {formatValue(change.new)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            </Box>
          )
        })}
      </Box>

      {versions.length > maxVisible && (
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Typography
            variant="caption"
            color="primary"
            sx={{ cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
            onClick={() => setShowAll(!showAll)}
          >
            {showAll
              ? t('versionHistory.showLess')
              : t('versionHistory.showAll', { count: versions.length })
            }
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export type { VersionEntry, EntityVersionHistoryProps }
