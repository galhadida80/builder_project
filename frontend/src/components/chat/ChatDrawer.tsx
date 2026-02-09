import { useState, useEffect, useRef, useCallback } from 'react'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import HistoryIcon from '@mui/icons-material/History'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import { useTranslation } from 'react-i18next'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { chatApi } from '../../api/chat'
import type { ChatMessage as ChatMessageType, Conversation } from '../../api/chat'

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
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (!open) return
    setMessages([])
    setConversationId(null)
    setShowHistory(false)
  }, [projectId, open])

  const handleSend = async (message: string) => {
    const optimisticMsg: ChatMessageType = {
      id: `temp-${Date.now()}`,
      conversationId: conversationId || '',
      role: 'user',
      content: message,
      toolCalls: null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setLoading(true)

    try {
      const response = await chatApi.send(projectId, message, conversationId || undefined)
      setConversationId(response.conversationId)
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimisticMsg.id)
        return [...withoutOptimistic, response.userMessage, response.assistantMessage]
      })
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
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (key: string) => {
    handleSend(t(key))
  }

  const loadConversations = async () => {
    try {
      const data = await chatApi.listConversations(projectId)
      setConversations(data)
    } catch {
      setConversations([])
    }
  }

  const handleShowHistory = () => {
    setShowHistory(true)
    loadConversations()
  }

  const handleLoadConversation = async (convId: string) => {
    try {
      const data = await chatApi.getConversation(projectId, convId)
      setMessages(data.messages)
      setConversationId(convId)
      setShowHistory(false)
    } catch {
      /* ignore */
    }
  }

  const handleDeleteConversation = async (convId: string) => {
    try {
      await chatApi.deleteConversation(projectId, convId)
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (conversationId === convId) {
        setMessages([])
        setConversationId(null)
      }
    } catch {
      /* ignore */
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
    setShowHistory(false)
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          maxWidth: '100vw',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, borderBottom: 1, borderColor: 'divider' }}>
          {showHistory ? (
            <IconButton size="small" onClick={() => setShowHistory(false)}>
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
              <IconButton size="small" onClick={handleNewChat} title={t('chat.newChat')}>
                <AddIcon />
              </IconButton>
              <IconButton size="small" onClick={handleShowHistory} title={t('chat.history')}>
                <HistoryIcon />
              </IconButton>
            </>
          )}
          <IconButton size="small" onClick={onClose}>
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
              {messages.length === 0 ? (
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
                messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
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
