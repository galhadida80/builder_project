import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SendIcon, MicIcon, MicOffIcon, WarningIcon } from '@/icons'
import { Box, IconButton, TextField, CircularProgress, keyframes, Typography, Tooltip } from '@/mui'
import { useVoiceInput } from '@/hooks/useVoiceInput'

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(244, 67, 54, 0); }
  100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
`

interface ChatInputProps {
  onSend: (message: string) => void
  loading: boolean
}

export default function ChatInput({ onSend, loading }: ChatInputProps) {
  const [input, setInput] = useState('')
  const { t } = useTranslation()
  const {
    isListening, transcript, interimTranscript,
    startListening, stopListening, isSupported,
    micStatus, audioLevel, errorCode,
  } = useVoiceInput()

  useEffect(() => {
    if (transcript) {
      setInput((prev) => prev + transcript)
    }
  }, [transcript])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return
    if (isListening) stopListening()
    onSend(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMicClick = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const displayValue = isListening && interimTranscript
    ? input + interimTranscript
    : input

  const getMicTooltip = () => {
    if (micStatus === 'error' && errorCode === 'mic-blocked') return t('chat.micBlocked')
    if (micStatus === 'error') return t('chat.micError')
    if (micStatus === 'no-sound') return t('chat.micNoSound')
    if (micStatus === 'requesting') return t('chat.micRequesting')
    if (isListening) return t('chat.voiceInputStop')
    return t('chat.voiceInputStart')
  }

  const getMicColor = () => {
    if (micStatus === 'error' || micStatus === 'no-sound') return 'warning.main'
    if (isListening) return 'error.main'
    return 'action.active'
  }

  const getPlaceholder = () => {
    if (micStatus === 'requesting') return t('chat.micRequesting')
    if (micStatus === 'no-sound') return t('chat.micNoSound')
    if (isListening) return t('chat.voiceListening')
    return t('chat.placeholder')
  }

  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
      {isListening && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, pt: 1 }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            flex: 1, height: 20, overflow: 'hidden',
          }}>
            {Array.from({ length: 16 }, (_, i) => (
              <Box key={i} sx={{
                width: 3, borderRadius: 1,
                bgcolor: micStatus === 'no-sound' ? 'warning.main' : 'error.main',
                height: `${Math.max(3, audioLevel * (12 + Math.sin((i + Date.now() / 200) * 0.5) * 8))}px`,
                transition: 'height 0.1s ease',
                opacity: 0.7,
              }} />
            ))}
          </Box>
          {micStatus === 'no-sound' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <WarningIcon sx={{ fontSize: 14, color: 'warning.main' }} />
              <Typography variant="caption" color="warning.main" sx={{ fontSize: '0.7rem' }}>
                {t('chat.micNoSound')}
              </Typography>
            </Box>
          )}
          {micStatus === 'listening' && audioLevel > 0.05 && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', flexShrink: 0 }}>
              {t('chat.voiceListening')}
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', p: 2 }}>
        {isSupported && (
          <Tooltip title={getMicTooltip()} arrow>
            <IconButton
              aria-label={isListening ? t('chat.voiceInputStop') : t('chat.voiceInputStart')}
              onClick={handleMicClick}
              disabled={loading || micStatus === 'requesting'}
              sx={{
                minWidth: 44,
                minHeight: 44,
                color: getMicColor(),
                animation: isListening && micStatus !== 'no-sound' ? `${pulse} 1.5s infinite` : 'none',
                position: 'relative',
              }}
            >
              {micStatus === 'requesting' ? (
                <CircularProgress size={22} />
              ) : isListening ? (
                <MicOffIcon />
              ) : micStatus === 'error' ? (
                <WarningIcon />
              ) : (
                <MicIcon />
              )}
            </IconButton>
          </Tooltip>
        )}
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          value={displayValue}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: 3 },
            ...(isListening && interimTranscript ? { '& textarea': { color: 'text.secondary', fontStyle: 'italic' } } : {}),
          }}
        />
        <IconButton
          aria-label={t('chat.sendMessage')}
          color="primary"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          {loading ? <CircularProgress size={22} /> : <SendIcon />}
        </IconButton>
      </Box>
    </Box>
  )
}
