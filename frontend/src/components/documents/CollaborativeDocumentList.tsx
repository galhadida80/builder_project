import React, { useEffect, useState } from 'react'
import {
  Box, Button, Card, CardActionArea, CardContent, Chip, Dialog,
  DialogActions, DialogContent, DialogTitle, FormControl, Grid,
  IconButton, InputLabel, MenuItem, Select, TextField, Typography,
  CircularProgress, Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DescriptionIcon from '@mui/icons-material/Description'
import PeopleIcon from '@mui/icons-material/People'
import { useTranslation } from 'react-i18next'
import {
  collaborativeDocumentsApi,
  type CollaborativeDocumentListItem,
} from '@/api/collaborativeDocuments'

const CONTENT_TYPES = ['general', 'meeting_minutes', 'specification', 'report'] as const

interface CollaborativeDocumentListProps {
  projectId: string
  onOpenDocument: (docId: string) => void
}

export default function CollaborativeDocumentList({
  projectId, onOpenDocument,
}: CollaborativeDocumentListProps) {
  const { t } = useTranslation()
  const [documents, setDocuments] = useState<CollaborativeDocumentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContentType, setNewContentType] = useState<string>('general')
  const [creating, setCreating] = useState(false)

  async function loadDocuments() {
    try {
      setLoading(true)
      const docs = await collaborativeDocumentsApi.list(projectId)
      setDocuments(docs)
      setError(null)
    } catch {
      setError(t('collaborativeEditing.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDocuments() }, [projectId])

  async function handleCreate() {
    if (!newTitle.trim()) return
    try {
      setCreating(true)
      const doc = await collaborativeDocumentsApi.create(projectId, {
        title: newTitle.trim(), content_type: newContentType,
      })
      setCreateOpen(false)
      setNewTitle('')
      setNewContentType('general')
      onOpenDocument(doc.id)
    } catch {
      setError(t('collaborativeEditing.createError'))
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(docId: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await collaborativeDocumentsApi.delete(projectId, docId)
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
    } catch {
      setError(t('collaborativeEditing.deleteError'))
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">{t('collaborativeEditing.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)} size="small">
          {t('collaborativeEditing.newDocument')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>
      )}

      {documents.length === 0 ? (
        <Box textAlign="center" py={6}>
          <DescriptionIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">{t('collaborativeEditing.noDocuments')}</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {documents.map((doc) => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card variant="outlined">
                <CardActionArea onClick={() => onOpenDocument(doc.id)}>
                  <CardContent>
                    <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                      <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ flex: 1 }}>
                        {doc.title}
                      </Typography>
                      <IconButton size="small" onClick={(e) => handleDelete(doc.id, e)} sx={{ ml: 0.5 }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                      <Chip size="small" label={t(`collaborativeEditing.types.${doc.contentType}`)} variant="outlined" />
                      {doc.activeCount > 0 && (
                        <Chip size="small" icon={<PeopleIcon />} label={doc.activeCount} color="success" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      {doc.creatorName} &middot; {formatDate(doc.updatedAt)}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('collaborativeEditing.newDocument')}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label={t('collaborativeEditing.documentTitle')}
            value={newTitle} onChange={(e) => setNewTitle(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <FormControl fullWidth>
            <InputLabel>{t('collaborativeEditing.contentType')}</InputLabel>
            <Select value={newContentType} label={t('collaborativeEditing.contentType')}
              onChange={(e) => setNewContentType(e.target.value)}>
              {CONTENT_TYPES.map((type) => (
                <MenuItem key={type} value={type}>{t(`collaborativeEditing.types.${type}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!newTitle.trim() || creating}>
            {creating ? <CircularProgress size={20} /> : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
