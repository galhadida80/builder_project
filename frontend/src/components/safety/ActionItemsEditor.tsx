import { useTranslation } from 'react-i18next'
import { TextField } from '../ui/TextField'
import { Button } from '../ui/Button'
import { AddIcon, CloseIcon } from '@/icons'
import { Box, Typography, IconButton, Paper } from '@/mui'

export interface TalkActionItem {
  id: string
  description: string
  assignedTo?: string
  isCompleted?: boolean
}

interface ActionItemsEditorProps {
  actionItems: TalkActionItem[]
  onChange: (actionItems: TalkActionItem[]) => void
  disabled?: boolean
}

export default function ActionItemsEditor({
  actionItems,
  onChange,
  disabled = false,
}: ActionItemsEditorProps) {
  const { t } = useTranslation()

  const addActionItem = () => {
    const newId = `ai-${Date.now()}-${Math.random().toString(36).substring(7)}`
    onChange([
      ...actionItems,
      { id: newId, description: '', assignedTo: undefined, isCompleted: false },
    ])
  }

  const updateActionItem = (index: number, field: 'description' | 'assignedTo', value: string) => {
    const updated = [...actionItems]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const removeActionItem = (index: number) => {
    onChange(actionItems.filter((_, i) => i !== index))
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
          {t('safety.toolboxTalks.actionItems')}
        </Typography>
        <Button
          variant="tertiary"
          size="small"
          startIcon={<AddIcon />}
          onClick={addActionItem}
          disabled={disabled}
        >
          {t('safety.toolboxTalks.addActionItem')}
        </Button>
      </Box>
      {actionItems.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {actionItems.map((item, idx) => (
            <Paper key={item.id} variant="outlined" sx={{ p: 2, position: 'relative' }}>
              <IconButton
                size="small"
                aria-label={t('common.removeItem')}
                onClick={() => removeActionItem(idx)}
                disabled={disabled}
                sx={{ position: 'absolute', top: 8, right: 8 }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pr: 4 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label={`${t('safety.toolboxTalks.actionItem')} ${idx + 1}`}
                  value={item.description}
                  onChange={(e) => updateActionItem(idx, 'description', e.target.value)}
                  disabled={disabled}
                />
                <TextField
                  fullWidth
                  label={t('safety.toolboxTalks.assignedTo')}
                  value={item.assignedTo || ''}
                  onChange={(e) => updateActionItem(idx, 'assignedTo', e.target.value)}
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
