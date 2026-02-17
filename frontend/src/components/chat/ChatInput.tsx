import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SendIcon } from '@/icons'
import { Box, IconButton, TextField, CircularProgress } from '@/mui'

interface ChatInputProps {
  onSend: (message: string) => void
  loading: boolean
}

export default function ChatInput({ onSend, loading }: ChatInputProps) {
  const [input, setInput] = useState('')
  const { t } = useTranslation()

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

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', p: 2, borderTop: 1, borderColor: 'divider' }}>
      <TextField
        fullWidth
        multiline
        maxRows={4}
        size="small"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('chat.placeholder')}
        disabled={loading}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
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
