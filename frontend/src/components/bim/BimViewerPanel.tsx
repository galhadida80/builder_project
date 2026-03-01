import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../../utils/dateLocale'
import { formatFileSize } from '../../utils/fileUtils'
import ForgeViewer from './ForgeViewer'
import IFCViewer from './IFCViewer'
import type { BimModel } from '../../types'
import { CategoryIcon, DeleteIcon, DescriptionIcon } from '@/icons'
import { Box, Typography, Chip, IconButton } from '@/mui'
import {
  STATUS_COLORS,
  FILE_TYPE_COLORS,
  FILE_TYPE_BG,
  FILE_FORMAT_LABEL,
  getFileExtension,
  isIfc,
} from './bimConstants'

interface BimViewerPanelProps {
  model: BimModel
  projectId: string
  selectedBimObjectIds: string[]
  isolationMode: boolean
  onElementClick: (bimObjectId: string | undefined, multiSelect?: boolean) => void
  onImport: (model: BimModel) => void
  onDelete: (model: BimModel) => void
  getViewerToken: () => Promise<string>
}

export default function BimViewerPanel({
  model,
  projectId,
  selectedBimObjectIds,
  isolationMode,
  onElementClick,
  onImport,
  onDelete,
  getViewerToken,
}: BimViewerPanelProps) {
  const { t } = useTranslation()
  const ext = getFileExtension(model.filename)

  const getFormatBadge = () => {
    const label = FILE_FORMAT_LABEL[ext] || ext.toUpperCase().replace('.', '')
    const size = model.fileSize ? formatFileSize(model.fileSize) : ''
    return size ? `${label} | ${size}` : label
  }

  return (
    <>
      <Box sx={{ position: 'relative', mb: 2, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ height: { xs: '45vh', md: '55vh' }, bgcolor: 'background.paper', borderRadius: 3 }}>
          {isIfc(model.filename) ? (
            <IFCViewer projectId={projectId} modelId={model.id} filename={model.filename} selectedBimObjectIds={selectedBimObjectIds} isolationMode={isolationMode} onElementClick={onElementClick} />
          ) : model.urn ? (
            <ForgeViewer urn={model.urn} getToken={getViewerToken} selectedBimObjectIds={selectedBimObjectIds} isolationMode={isolationMode} onElementClick={onElementClick} />
          ) : null}
        </Box>
        <Chip
          label={getFormatBadge()}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            bgcolor: 'action.hover',
            fontSize: '0.65rem',
            fontWeight: 600,
            backdropFilter: 'blur(8px)',
            height: 24,
          }}
        />
      </Box>

      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 2,
          borderRadius: 3,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            bgcolor: FILE_TYPE_BG[ext] || 'primary.light',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <DescriptionIcon sx={{ color: FILE_TYPE_COLORS[ext] || 'primary.main', fontSize: 24 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {model.filename}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(model.createdAt).toLocaleDateString(getDateLocale())} {ext}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
          {model.translationStatus === 'complete' && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'success.main',
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
          )}
          <Chip
            label={t(`bim.status.${model.translationStatus}`)}
            color={STATUS_COLORS[model.translationStatus] || 'default'}
            size="small"
            sx={{ height: 24, fontSize: '0.7rem' }}
          />
          {model.translationStatus === 'complete' && (
            <IconButton size="small" color="primary" onClick={() => onImport(model)}>
              <CategoryIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )}
          <IconButton size="small" color="error" onClick={() => onDelete(model)}>
            <DeleteIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>
    </>
  )
}
