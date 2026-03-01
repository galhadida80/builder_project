import { useTranslation } from 'react-i18next'
import { TextField } from '../ui/TextField'
import { Button } from '../ui/Button'
import { AddIcon, CloseIcon } from '@/icons'
import { Box, Typography, IconButton, Paper } from '@/mui'

export interface KeyPoint {
  id: string
  text: string
}

interface KeyPointsEditorProps {
  keyPoints: KeyPoint[]
  onChange: (keyPoints: KeyPoint[]) => void
  disabled?: boolean
}

export default function KeyPointsEditor({
  keyPoints,
  onChange,
  disabled = false,
}: KeyPointsEditorProps) {
  const { t } = useTranslation()

  const addKeyPoint = () => {
    const newId = `kp-${Date.now()}-${Math.random().toString(36).substring(7)}`
    onChange([...keyPoints, { id: newId, text: '' }])
  }

  const updateKeyPoint = (index: number, text: string) => {
    const updated = [...keyPoints]
    updated[index] = { ...updated[index], text }
    onChange(updated)
  }

  const removeKeyPoint = (index: number) => {
    onChange(keyPoints.filter((_, i) => i !== index))
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography variant="body2" fontWeight={500}>
          {t('safety.toolboxTalks.keyPoints')}
        </Typography>
        <Button
          variant="tertiary"
          size="small"
          startIcon={<AddIcon />}
          onClick={addKeyPoint}
          disabled={disabled}
        >
          {t('safety.toolboxTalks.addKeyPoint')}
        </Button>
      </Box>
      {keyPoints.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {keyPoints.map((kp, idx) => (
            <Paper key={kp.id} variant="outlined" sx={{ p: 2, position: 'relative' }}>
              <IconButton
                size="small"
                aria-label={t('common.removeItem')}
                onClick={() => removeKeyPoint(idx)}
                disabled={disabled}
                sx={{ position: 'absolute', top: 8, right: 8 }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <TextField
                fullWidth
                multiline
                rows={2}
                label={`${t('safety.toolboxTalks.keyPoint')} ${idx + 1}`}
                value={kp.text}
                onChange={(e) => updateKeyPoint(idx, e.target.value)}
                disabled={disabled}
                sx={{ pr: 4 }}
              />
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  )
}
