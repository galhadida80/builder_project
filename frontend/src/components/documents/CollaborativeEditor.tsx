import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Avatar,
  AvatarGroup,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PeopleIcon from '@mui/icons-material/People'
import SaveIcon from '@mui/icons-material/Save'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { useTranslation } from 'react-i18next'
import {
  collaborativeDocumentsApi,
  getCollabWebSocketUrl,
} from '@/api/collaborativeDocuments'
import type { CollaborativeDocument } from '@/api/collaborativeDocuments'

interface PresenceUser {
  userId: string
  name: string
}

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
]

function getUserColor(index: number): string {
  return CURSOR_COLORS[index % CURSOR_COLORS.length]
}

interface CollaborativeEditorProps {
  projectId: string
  documentId: string
  onBack: () => void
}

export default function CollaborativeEditor({
  projectId,
  documentId,
  onBack,
}: CollaborativeEditorProps) {
  const { t } = useTranslation()
  const [document, setDocument] = useState<CollaborativeDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([])
  const providerRef = useRef<WebsocketProvider | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadDocument() {
      try {
        const doc = await collaborativeDocumentsApi.get(projectId, documentId)
        if (!cancelled) setDocument(doc)
        await collaborativeDocumentsApi.join(projectId, documentId)
      } catch {
        if (!cancelled) setError(t('collaborativeEditing.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadDocument()
    return () => {
      cancelled = true
      collaborativeDocumentsApi.leave(projectId, documentId).catch(() => {})
    }
  }, [projectId, documentId, t])

  const ydoc = useMemo(() => new Y.Doc(), [])

  useEffect(() => {
    const wsUrl = getCollabWebSocketUrl(documentId)
    const baseUrl = wsUrl.split('/ws/collab/')[0]
    const provider = new WebsocketProvider(
      baseUrl + '/ws/collab',
      documentId,
      ydoc,
      { params: { token: localStorage.getItem('authToken') || '' } }
    )
    providerRef.current = provider

    provider.on('status', (event: { status: string }) => {
      setConnected(event.status === 'connected')
    })

    provider.awareness.on('change', () => {
      const states = provider.awareness.getStates()
      const users: PresenceUser[] = []
      states.forEach((state: Record<string, unknown>) => {
        const user = state.user as PresenceUser | undefined
        if (user) users.push(user)
      })
      setPresenceUsers(users)
    })

    const currentUser = localStorage.getItem('userName') || 'User'
    const userId = localStorage.getItem('userId') || 'unknown'
    provider.awareness.setLocalStateField('user', {
      userId, name: currentUser,
      color: getUserColor(Math.floor(Math.random() * CURSOR_COLORS.length)),
    })

    return () => {
      provider.destroy()
      ydoc.destroy()
    }
  }, [documentId, ydoc])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false } as Record<string, unknown>),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider: providerRef.current!,
        user: {
          name: localStorage.getItem('userName') || 'User',
          color: getUserColor(Math.floor(Math.random() * CURSOR_COLORS.length)),
        },
      }),
    ],
  }, [ydoc])

  const handleSave = useCallback(async () => {
    if (!document) return
    try {
      await collaborativeDocumentsApi.update(projectId, documentId, document.title)
    } catch {
      setError(t('collaborativeEditing.saveError'))
    }
  }, [document, projectId, documentId, t])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          p: 1.5, borderBottom: 1, borderColor: 'divider',
        }}
      >
        <IconButton onClick={onBack} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flex: 1, fontSize: '1rem' }} noWrap>
          {document?.title}
        </Typography>
        <Chip
          size="small" icon={<PeopleIcon />}
          label={`${presenceUsers.length}`}
          color={connected ? 'success' : 'default'}
          variant="outlined"
        />
        <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 12 } }}>
          {presenceUsers.map((user, index) => (
            <Tooltip key={user.userId} title={user.name}>
              <Avatar sx={{ bgcolor: getUserColor(index), width: 28, height: 28 }}>
                {user.name.charAt(0).toUpperCase()}
              </Avatar>
            </Tooltip>
          ))}
        </AvatarGroup>
        <Tooltip title={t('collaborativeEditing.save')}>
          <IconButton onClick={handleSave} size="small">
            <SaveIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper
        elevation={0}
        sx={{
          flex: 1, overflow: 'auto', p: 2,
          '& .ProseMirror': {
            minHeight: 300, outline: 'none',
            '& p': { margin: '0.5em 0' },
          },
          '& .collaboration-cursor__caret': {
            borderLeft: '2px solid', borderRight: 'none',
            marginLeft: '-1px', pointerEvents: 'none',
            position: 'relative', wordBreak: 'normal',
          },
          '& .collaboration-cursor__label': {
            fontSize: '11px', fontWeight: 600,
            padding: '1px 4px', borderRadius: '3px',
            position: 'absolute', top: '-1.4em', left: '-1px',
            whiteSpace: 'nowrap', color: '#fff',
          },
        }}
      >
        {editor && <EditorContent editor={editor} />}
      </Paper>
    </Box>
  )
}
