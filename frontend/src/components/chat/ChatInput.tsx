import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SendIcon, MicIcon, MicOffIcon } from '@/icons'
import { Box, IconButton, TextField, CircularProgress, keyframes } from '@/mui'
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
  const { isListening, transcript, interimTranscript, startListening, stopListening, isSupported } = useVoiceInput()

  useEffect(() => {
    if (transcript) {
      setInput((prev) => prev + transcript)
    }
  }, [transcript])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return
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

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', p: 2, borderTop: 1, borderColor: 'divider' }}>
      {isSupported && (
        <IconButton
          aria-label={isListening ? t('chat.voiceInputStop') : t('chat.voiceInputStart')}
          onClick={handleMicClick}
          disabled={loading}
          sx={{
            minWidth: 44,
            minHeight: 44,
            color: isListening ? 'error.main' : 'action.active',
            animation: isListening ? `${pulse} 1.5s infinite` : 'none',
          }}
        >
          {isListening ? <MicOffIcon /> : <MicIcon />}
        </IconButton>
      )}
      <TextField
        fullWidth
        multiline
        maxRows={4}
        size="small"
        value={displayValue}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isListening ? t('chat.voiceListening') : t('chat.placeholder')}
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
  )
}
