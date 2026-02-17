import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { chatApi } from '../../api/chat'
import type { ChatMessage as ChatMessageType, ChatAction, Conversation } from '../../api/chat'
import { CloseIcon, ArrowBackIcon, AddIcon, HistoryIcon, DeleteOutlineIcon, SmartToyIcon } from '@/icons'
import { Box, Drawer, Typography, IconButton, Chip, Stack, Divider, List, ListItemButton, ListItemText, styled, keyframes, useMediaQuery } from '@/mui'
import { useTheme } from '@/mui'

const dotBounce = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
  30% { transform: translateY(-6px); opacity: 0.8; }
`

const Dot = styled('span')<{ delay: number }>(({ delay }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: 'currentColor',
  opacity: 0.5,
  display: 'inline-block',
  animation: `${dotBounce} 1.4s infinite`,
  animationDelay: `${delay}s`,
}))

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1.5 }}>
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
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: '16px 16px 16px 4px',
          bgcolor: 'action.hover',
          display: 'flex',
          gap: 0.5,
          alignItems: 'center',
          color: 'text.secondary',
        }}
      >
        <Dot delay={0} />
        <Dot delay={0.2} />
        <Dot delay={0.4} />
      </Box>
    </Box>
  )
})

const DRAWER_WIDTH = 420

const SUGGESTION_KEYS = [
  'chat.suggestions.projectSummary',
  'chat.suggestions.openRfis',
  'chat.suggestions.equipmentStatus',
  'chat.suggestions.upcomingMeetings',
  'chat.suggestions.areaProgress',
  'chat.suggestions.pendingApprovals',
]

interface ChatDrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
}

export default function ChatDrawer({ open, onClose, projectId }: ChatDrawerProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages.length, scrollToBottom])

  useEffect(() => {
    if (!open) return
    setMessages([])
    setConversationId(null)
    setShowHistory(false)
  }, [projectId, open])

  const updateActionInMessages = useCallback((actionId: string, updatedAction: ChatAction) => {
    setMessages((prev) =>
      prev.map((msg) => ({
        ...msg,
        pendingActions: (msg.pendingActions || []).map((a) =>
          a.id === actionId ? updatedAction : a
        ),
      }))
    )
  }, [])

  const handleActionExecute = useCallback(async (actionId: string) => {
    try {
      const updated = await chatApi.executeAction(projectId, actionId)
      updateActionInMessages(actionId, updated)
    } catch (err) {
      console.error('Action execute failed:', err)
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, conversationId: conversationId || '', role: 'assistant', content: t('chat.actionError'), toolCalls: null, createdAt: new Date().toISOString(), pendingActions: [] },
      ])
    }
  }, [projectId, conversationId, updateActionInMessages, t])

  const handleActionReject = useCallback(async (actionId: string) => {
    try {
      const updated = await chatApi.rejectAction(projectId, actionId)
      updateActionInMessages(actionId, updated)
    } catch (err) {
      console.error('Action reject failed:', err)
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, conversationId: conversationId || '', role: 'assistant', content: t('chat.actionError'), toolCalls: null, createdAt: new Date().toISOString(), pendingActions: [] },
      ])
    }
  }, [projectId, conversationId, updateActionInMessages, t])

  const handleSend = useCallback(async (message: string) => {
    const optimisticMsg: ChatMessageType = {
      id: `temp-${Date.now()}`,
      conversationId: conversationId || '',
      role: 'user',
      content: message,
      toolCalls: null,
      createdAt: new Date().toISOString(),
      pendingActions: [],
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setLoading(true)

    try {
      const response = await chatApi.send(projectId, message, conversationId || undefined)
      setConversationId(response.conversationId)
      setMessages((prev) =>
        prev.map((m) => m.id === optimisticMsg.id ? response.userMessage : m).concat(response.assistantMessage)
      )
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          conversationId: conversationId || '',
          role: 'assistant',
          content: t('chat.error'),
          toolCalls: null,
          createdAt: new Date().toISOString(),
          pendingActions: [],
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [projectId, conversationId, t])

  const handleSuggestionClick = useCallback((key: string) => {
    handleSend(t(key))
  }, [handleSend, t])

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatApi.listConversations(projectId)
      setConversations(data)
    } catch (err) {
      console.error('Failed to load conversations:', err)
      setConversations([])
    }
  }, [projectId])

  const handleShowHistory = useCallback(() => {
    setShowHistory(true)
    loadConversations()
  }, [loadConversations])

  const handleLoadConversation = useCallback(async (convId: string) => {
    try {
      const data = await chatApi.getConversation(projectId, convId)
      setMessages(data.messages)
      setConversationId(convId)
      setShowHistory(false)
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }, [projectId])

  const handleDeleteConversation = useCallback(async (convId: string) => {
    try {
      await chatApi.deleteConversation(projectId, convId)
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      setConversationId((prev) => {
        if (prev === convId) {
          setMessages([])
          return null
        }
        return prev
      })
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }, [projectId])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setShowHistory(false)
  }, [])

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        zIndex: 1400,
        '& .MuiDrawer-paper': {
          width: isMobile ? '100vw' : DRAWER_WIDTH,
          maxWidth: '100vw',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, borderBottom: 1, borderColor: 'divider' }}>
          {showHistory ? (
            <IconButton size="small" aria-label={t('chat.backToChat')} onClick={() => setShowHistory(false)}>
              <ArrowBackIcon />
            </IconButton>
          ) : (
            <SmartToyIcon color="primary" />
          )}
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
            {showHistory ? t('chat.history') : t('chat.title')}
          </Typography>
          {!showHistory && (
            <>
              <IconButton size="small" aria-label={t('chat.newChat')} onClick={handleNewChat}>
                <AddIcon />
              </IconButton>
              <IconButton size="small" aria-label={t('chat.history')} onClick={handleShowHistory}>
                <HistoryIcon />
              </IconButton>
            </>
          )}
          <IconButton
            aria-label={t('chat.closeChat')}
            onClick={onClose}
            size={isMobile ? 'medium' : 'small'}
            sx={{
              bgcolor: isMobile ? 'action.hover' : 'transparent',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {showHistory ? (
          /* Conversation History List */
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {conversations.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">{t('chat.noConversations')}</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {conversations.map((conv) => (
                  <ListItemButton
                    key={conv.id}
                    onClick={() => handleLoadConversation(conv.id)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                  >
                    <ListItemText
                      primary={conv.title || t('chat.untitledChat')}
                      secondary={`${conv.messageCount} ${t('chat.messages')} · ${new Date(conv.updatedAt).toLocaleDateString()}`}
                      primaryTypographyProps={{ noWrap: true }}
                    />
                    <IconButton
                      size="small"
                      aria-label={t('chat.deleteConversation')}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteConversation(conv.id)
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        ) : (
          <>
            {/* Messages Area */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {messages.length === 0 && !loading ? (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <SmartToyIcon sx={{ fontSize: 48, color: 'primary.light', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    {t('chat.welcomeMessage')}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    {t('chat.suggestionsTitle')}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" useFlexGap>
                    {SUGGESTION_KEYS.map((key) => (
                      <Chip
                        key={key}
                        label={t(key)}
                        onClick={() => handleSuggestionClick(key)}
                        variant="outlined"
                        color="primary"
                        size="small"
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Stack>
                </Box>
              ) : (
                messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onActionExecute={handleActionExecute}
                    onActionReject={handleActionReject}
                    onSuggestionClick={handleSend}
                  />
                ))
              )}
              {loading && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1.5 }}>
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
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderRadius: '16px 16px 16px 4px',
                      bgcolor: 'action.hover',
                      display: 'flex',
                      gap: 0.5,
                      alignItems: 'center',
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <Box
                        key={i}
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'text.secondary',
                          opacity: 0.5,
                          animation: 'typing-dot 1.4s infinite',
                          animationDelay: `${i * 0.2}s`,
                          '@keyframes typing-dot': {
                            '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.3 },
                            '30%': { transform: 'translateY(-6px)', opacity: 0.8 },
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Input */}
            <ChatInput onSend={handleSend} loading={loading} />
          </>
        )}
      </Box>
    </Drawer>
  )
}
