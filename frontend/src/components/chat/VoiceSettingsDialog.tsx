import { useTranslation } from 'react-i18next'
import { CloseIcon, VolumeUpIcon, SpeedIcon } from '@/icons'
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography,
  Slider, List, ListItemButton, ListItemText, ListItemIcon,
  Radio, styled, Chip,
} from '@/mui'
import type { VoiceOption } from '@/hooks/useVoiceOutput'

interface VoiceSettingsDialogProps {
  open: boolean
  onClose: () => void
  voices: VoiceOption[]
  selectedVoice: SpeechSynthesisVoice | null
  prefs: { rate: number; pitch: number; volume: number }
  onSelectVoice: (voiceURI: string) => void
  onPreviewVoice: (voiceURI: string) => void
  onChangeRate: (rate: number) => void
  onChangePitch: (pitch: number) => void
  onChangeVolume: (volume: number) => void
}

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    boxShadow: theme.shadows[8],
    maxHeight: 'calc(100% - 64px)',
  },
  '& .MuiBackdrop-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
  },
}))

export default function VoiceSettingsDialog({
  open, onClose, voices, selectedVoice, prefs,
  onSelectVoice, onPreviewVoice, onChangeRate, onChangePitch, onChangeVolume,
}: VoiceSettingsDialogProps) {
  const { t } = useTranslation()

  return (
    <StyledDialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem' }}>
          {t('chat.voiceSettings')}
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2, pb: 3 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
          {t('chat.voiceSelect')}
        </Typography>

        <List sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 2, mb: 2, p: 0 }}>
          {voices.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">{t('chat.noVoicesAvailable')}</Typography>
            </Box>
          ) : (
            voices.map((v) => {
              const isSelected = selectedVoice?.voiceURI === v.voice.voiceURI
              return (
                <ListItemButton
                  key={v.voice.voiceURI}
                  selected={isSelected}
                  onClick={() => {
                    onSelectVoice(v.voice.voiceURI)
                    onPreviewVoice(v.voice.voiceURI)
                  }}
                  sx={{ py: 0.75 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Radio checked={isSelected} size="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" fontWeight={isSelected ? 600 : 400} noWrap>
                          {v.voice.name}
                        </Typography>
                        {v.voice.localService && (
                          <Chip label={t('chat.voiceLocal')} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                        )}
                        {!v.voice.localService && (
                          <Chip label={t('chat.voiceCloud')} size="small" color="primary" sx={{ height: 18, fontSize: '0.6rem' }} />
                        )}
                      </Box>
                    }
                    secondary={v.voice.lang}
                    secondaryTypographyProps={{ sx: { fontSize: '0.7rem' } }}
                  />
                </ListItemButton>
              )
            })
          )}
        </List>

        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1.5 }}>
          {t('chat.voiceControls')}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <SpeedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" fontWeight={500}>{t('chat.voiceSpeed')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>{prefs.rate.toFixed(1)}x</Typography>
            </Box>
            <Slider
              value={prefs.rate}
              onChange={(_, val) => onChangeRate(val as number)}
              min={0.5} max={2} step={0.1}
              size="small"
              marks={[{ value: 0.5, label: '0.5x' }, { value: 1, label: '1x' }, { value: 2, label: '2x' }]}
            />
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: 16, lineHeight: 1 }}>🎵</Typography>
              <Typography variant="body2" fontWeight={500}>{t('chat.voicePitch')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>{prefs.pitch.toFixed(1)}</Typography>
            </Box>
            <Slider
              value={prefs.pitch}
              onChange={(_, val) => onChangePitch(val as number)}
              min={0.5} max={2} step={0.1}
              size="small"
              marks={[{ value: 0.5, label: t('chat.voiceLow') }, { value: 1, label: t('chat.voiceNormal') }, { value: 2, label: t('chat.voiceHigh') }]}
            />
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <VolumeUpIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" fontWeight={500}>{t('chat.voiceVolume')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>{Math.round(prefs.volume * 100)}%</Typography>
            </Box>
            <Slider
              value={prefs.volume}
              onChange={(_, val) => onChangeVolume(val as number)}
              min={0} max={1} step={0.1}
              size="small"
            />
          </Box>
        </Box>
      </DialogContent>
    </StyledDialog>
  )
}
