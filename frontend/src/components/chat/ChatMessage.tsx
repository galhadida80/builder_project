import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import ChatActionCard from './ChatActionCard'
import type { ChatMessage as ChatMessageType } from '../../api/chat'
import { SmartToyIcon, PersonIcon } from '@/icons'
import { Box, Typography, Paper, Chip, Stack } from '@/mui'

function parseSuggestions(content: string): { cleanContent: string; suggestions: string[] } {
  const lines = content.split('\n')
  const suggestions: string[] = []
  let separatorIdx = -1

  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    const match = trimmed.match(/^[-*]\s*\[(.+)\]\s*$/)
    if (match) {
      suggestions.unshift(match[1])
    } else if (trimmed === '---' && suggestions.length > 0) {
      separatorIdx = i
      break
    } else if (trimmed === '' || trimmed.startsWith('**')) {
      continue
    } else {
      break
    }
  }

  if (suggestions.length === 0) return { cleanContent: content, suggestions: [] }

  const cutIdx = separatorIdx >= 0 ? separatorIdx : lines.length - suggestions.length
  const cleanContent = lines.slice(0, cutIdx).join('\n').trimEnd()
  return { cleanContent, suggestions }
}

interface ChatMessageProps {
  message: ChatMessageType
  onActionExecute?: (actionId: string) => Promise<void>
  onActionReject?: (actionId: string) => Promise<void>
  onSuggestionClick?: (text: string) => void
}

export default memo(function ChatMessage({ message, onActionExecute, onActionReject, onSuggestionClick }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const actions = message.pendingActions || []

  const { cleanContent, suggestions } = useMemo(() => {
    if (!isUser && message.content) return parseSuggestions(message.content)
    return { cleanContent: message.content, suggestions: [] }
  }, [isUser, message.content])

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 1.5,
        gap: 1,
        alignItems: 'flex-start',
      }}
    >
      {!isUser && (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            mt: 0.5,
          }}
        >
          <SmartToyIcon sx={{ fontSize: 18, color: 'white' }} />
        </Box>
      )}
      <Box sx={{ maxWidth: '80%' }}>
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1.5,
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            bgcolor: isUser ? 'primary.main' : 'action.hover',
            color: isUser ? 'primary.contrastText' : 'text.primary',
          }}
        >
          {isUser ? (
            <Typography
              variant="body2"
              sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}
            >
              {message.content}
            </Typography>
          ) : (
            <Box
              sx={{
                '& p': { m: 0, mb: 1, lineHeight: 1.6, fontSize: '0.875rem', '&:last-child': { mb: 0 } },
                '& ul, & ol': { paddingInlineStart: '20px', my: 0.5, fontSize: '0.875rem' },
                '& li': { mb: 0.3, lineHeight: 1.5 },
                '& strong': { fontWeight: 600 },
                '& h1, & h2, & h3, & h4': { mt: 1, mb: 0.5, fontWeight: 600 },
                '& h3': { fontSize: '1rem' },
                '& h4': { fontSize: '0.9rem' },
                '& code': {
                  bgcolor: 'rgba(0,0,0,0.06)',
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 0.5,
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                },
                '& pre': {
                  bgcolor: 'rgba(0,0,0,0.06)',
                  p: 1.5,
                  borderRadius: 1,
                  overflow: 'auto',
                  my: 1,
                  '& code': { bgcolor: 'transparent', p: 0 },
                },
                '& table': {
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.8rem',
                  my: 1,
                },
                '& th, & td': {
                  border: '1px solid',
                  borderColor: 'divider',
                  px: 1,
                  py: 0.5,
                  textAlign: 'start',
                },
                '& th': { fontWeight: 600, bgcolor: 'rgba(0,0,0,0.04)' },
                '& hr': { my: 1, borderColor: 'divider' },
                '& blockquote': {
                  borderInlineStart: '3px solid',
                  borderColor: 'primary.main',
                  paddingInlineStart: '12px',
                  marginInlineStart: 0,
                  my: 1,
                  color: 'text.secondary',
                },
              }}
            >
              <ReactMarkdown>{cleanContent}</ReactMarkdown>
            </Box>
          )}
        </Paper>
        {actions.length > 0 && onActionExecute && onActionReject && (
          <Box sx={{ mt: 0.5 }}>
            {actions.map((action) => (
              <ChatActionCard
                key={action.id}
                action={action}
                onExecute={onActionExecute}
                onReject={onActionReject}
              />
            ))}
          </Box>
        )}
        {suggestions.length > 0 && onSuggestionClick && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {suggestions.map((text, idx) => (
              <Chip
                key={idx}
                label={text}
                onClick={() => onSuggestionClick(text)}
                variant="outlined"
                color="primary"
                size="small"
                sx={{ mb: 0.5 }}
              />
            ))}
          </Stack>
        )}
      </Box>
      {isUser && (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'grey.300',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            mt: 0.5,
          }}
        >
          <PersonIcon sx={{ fontSize: 18, color: 'grey.700' }} />
        </Box>
      )}
    </Box>
  )
})
