import { useTranslation } from 'react-i18next'
import { formatFileSize } from '../../utils/fileUtils'
import { bimApi } from '../../api/bim'
import { useToast } from '../common/ToastProvider'
import type { BimModel } from '../../types'
import { CategoryIcon, DeleteIcon, DescriptionIcon, RotateRightIcon } from '@/icons'
import { Box, Typography, Chip, IconButton, LinearProgress, CircularProgress } from '@/mui'
import {
  STATUS_COLORS,
  FILE_TYPE_COLORS,
  FILE_TYPE_BG,
  FILE_FORMAT_LABEL,
  getFileExtension,
  isIfc,
} from './bimConstants'

interface BimModelCardProps {
  model: BimModel
  projectId: string
  isSelected: boolean
  onModelClick: (model: BimModel) => void
  onDelete: (model: BimModel) => void
  onImport: (model: BimModel) => void
  onTranslate: (model: BimModel) => void
}

export default function BimModelCard({
  model,
  projectId,
  isSelected,
  onModelClick,
  onDelete,
  onImport,
  onTranslate,
}: BimModelCardProps) {
  const { t } = useTranslation()
  const { showError } = useToast()

  const viewable = isIfc(model.filename) || model.translationStatus === 'complete'
  const ext = getFileExtension(model.filename)

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!projectId) return
    try {
      await bimApi.translate(projectId, model.id)
      onTranslate(model)
    } catch {
      showError(t('bim.translateFailed'))
    }
  }

  return (
    <Box
      onClick={() => onModelClick(model)}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 3,
        p: 2,
        cursor: viewable ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        ...(isSelected && { border: '2px solid', borderColor: 'primary.main' }),
        ...(viewable && {
          '&:hover': { bgcolor: 'action.hover' },
          '&:active': { transform: 'scale(0.98)' },
        }),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: FILE_TYPE_BG[ext] || 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <DescriptionIcon sx={{ color: FILE_TYPE_COLORS[ext] || 'text.secondary', fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {model.filename}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {FILE_FORMAT_LABEL[ext] || ext} {model.fileSize ? `| ${formatFileSize(model.fileSize)}` : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {model.translationStatus === 'translating' ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" fontWeight={700} color="primary.main">
                {model.translationProgress}%
              </Typography>
              <CircularProgress size={16} sx={{ color: 'primary.main' }} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {model.translationStatus === 'complete' && (
                <Box
                  sx={{
                    width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main',
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
                  }}
                />
              )}
              <Chip
                label={t(`bim.status.${model.translationStatus}`)}
                color={STATUS_COLORS[model.translationStatus] || 'default'}
                size="small"
                sx={{ height: 22, fontSize: '0.65rem' }}
              />
            </Box>
          )}
        </Box>
      </Box>

      {model.translationStatus === 'translating' && (
        <LinearProgress variant="determinate" value={model.translationProgress} sx={{ height: 4, borderRadius: 2, mt: 1.5 }} />
      )}

      <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5, justifyContent: 'flex-end' }}>
        {model.translationStatus === 'uploaded' && model.urn && (
          <IconButton size="small" onClick={handleTranslate}>
            <RotateRightIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
        {model.translationStatus === 'complete' && (
          <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); onImport(model) }}>
            <CategoryIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(model) }}>
          <DeleteIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  )
}
