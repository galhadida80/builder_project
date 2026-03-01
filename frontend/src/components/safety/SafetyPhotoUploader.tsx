import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { CameraAltIcon, CloseIcon } from '@/icons'
import { Box, Typography, IconButton } from '@/mui'

const MAX_PHOTOS = 5

interface SafetyPhotoUploaderProps {
  pendingPhotos: File[]
  photoPreviews: string[]
  onAddPhotos: (files: File[]) => void
  onRemovePhoto: (index: number) => void
  maxPhotos?: number
  disabled?: boolean
}

export default function SafetyPhotoUploader({
  pendingPhotos,
  photoPreviews,
  onAddPhotos,
  onRemovePhoto,
  maxPhotos = MAX_PHOTOS,
  disabled = false,
}: SafetyPhotoUploaderProps) {
  const { t } = useTranslation()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: maxPhotos,
    maxSize: 5 * 1024 * 1024,
    onDrop: onAddPhotos,
    noClick: pendingPhotos.length >= maxPhotos || disabled,
    noDrag: pendingPhotos.length >= maxPhotos || disabled,
    disabled,
  })

  return (
    <Box>
      <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
        {t('safety.incidents.attachPhotos')} ({pendingPhotos.length}/{maxPhotos})
      </Typography>

      <Box
        {...getRootProps()}
        sx={{
          p: 2,
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          textAlign: 'center',
          cursor: pendingPhotos.length >= maxPhotos || disabled ? 'default' : 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'transparent',
          transition: 'all 200ms ease',
          '&:hover':
            pendingPhotos.length < maxPhotos && !disabled
              ? { borderColor: 'primary.light', bgcolor: 'action.hover' }
              : {},
        }}
      >
        <input {...getInputProps()} />
        <CameraAltIcon sx={{ fontSize: 40, color: 'action.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {isDragActive
            ? t('safety.incidents.dropHere')
            : t('safety.incidents.dragOrTap')}
        </Typography>
        {pendingPhotos.length >= maxPhotos && (
          <Typography variant="caption" color="text.disabled">
            {t('safety.incidents.maxPhotos', { max: maxPhotos })}
          </Typography>
        )}
      </Box>

      {pendingPhotos.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
          {photoPreviews.map((url, idx) => (
            <Box
              key={idx}
              sx={{
                position: 'relative',
                width: 80,
                height: 80,
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box
                component="img"
                src={url}
                alt={pendingPhotos[idx]?.name}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemovePhoto(idx)
                }}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                  width: 24,
                  height: 24,
                }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
