import { useTranslation } from 'react-i18next'
import { CloudUploadIcon } from '@/icons'
import { Box, Typography, CircularProgress } from '@/mui'

interface BimUploadButtonProps {
  uploading: boolean
  onClick: () => void
}

export default function BimUploadButton({ uploading, onClick }: BimUploadButtonProps) {
  const { t } = useTranslation()

  return (
    <>
      <Box
        onClick={() => !uploading && onClick()}
        sx={{
          mt: 3,
          py: 2,
          borderRadius: 3,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: uploading ? 'default' : 'pointer',
          opacity: uploading ? 0.7 : 1,
          transition: 'all 0.2s ease',
          ...(!uploading && {
            '&:hover': { opacity: 0.9 },
            '&:active': { transform: 'scale(0.98)' },
          }),
        }}
      >
        {uploading ? (
          <>
            <CircularProgress size={20} sx={{ color: 'inherit' }} />
            <Typography fontWeight={700}>{t('bim.uploading')}</Typography>
          </>
        ) : (
          <>
            <CloudUploadIcon />
            <Typography fontWeight={700}>{t('bim.upload')}</Typography>
          </>
        )}
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}
      >
        {t('bim.supportedFormats', 'Supported formats')}: .rvt, .ifc, .nwd, .nwc, .dwg
      </Typography>
    </>
  )
}
