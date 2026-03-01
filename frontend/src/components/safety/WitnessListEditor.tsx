import { useTranslation } from 'react-i18next'
import { TextField } from '../ui/TextField'
import { Button } from '../ui/Button'
import { AddIcon, CloseIcon } from '@/icons'
import { Box, Typography, IconButton, Paper } from '@/mui'

export interface WitnessData {
  name: string
  contact: string
}

interface WitnessListEditorProps {
  witnesses: WitnessData[]
  onChange: (witnesses: WitnessData[]) => void
  disabled?: boolean
}

export default function WitnessListEditor({
  witnesses,
  onChange,
  disabled = false,
}: WitnessListEditorProps) {
  const { t } = useTranslation()

  const addWitness = () => {
    onChange([...witnesses, { name: '', contact: '' }])
  }

  const updateWitness = (index: number, field: 'name' | 'contact', value: string) => {
    const updated = [...witnesses]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const removeWitness = (index: number) => {
    onChange(witnesses.filter((_, i) => i !== index))
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
          {t('safety.incidents.witnesses')}
        </Typography>
        <Button
          variant="tertiary"
          size="small"
          startIcon={<AddIcon />}
          onClick={addWitness}
          disabled={disabled}
        >
          {t('safety.incidents.addWitness')}
        </Button>
      </Box>
      {witnesses.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {witnesses.map((witness, idx) => (
            <Paper key={idx} variant="outlined" sx={{ p: 2, position: 'relative' }}>
              <IconButton
                size="small"
                aria-label={t('common.removeItem')}
                onClick={() => removeWitness(idx)}
                disabled={disabled}
                sx={{ position: 'absolute', top: 8, right: 8 }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pr: 4 }}>
                <TextField
                  fullWidth
                  label={t('safety.incidents.witnessName')}
                  value={witness.name}
                  onChange={(e) => updateWitness(idx, 'name', e.target.value)}
                  size="small"
                  disabled={disabled}
                />
                <TextField
                  fullWidth
                  label={t('safety.incidents.witnessContact')}
                  value={witness.contact}
                  onChange={(e) => updateWitness(idx, 'contact', e.target.value)}
                  size="small"
                  disabled={disabled}
                />
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  )
}
