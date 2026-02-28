import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/common/ToastProvider'
import { getDateLocale } from '../utils/dateLocale'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { SearchField, TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { AddIcon, CommentIcon, SendIcon, ReplyIcon, DeleteIcon, EditIcon, AccessTimeIcon, ExpandMoreIcon, ExpandLessIcon, GroupsIcon, PeopleIcon } from '@/icons'
import { Box, Typography, Skeleton, IconButton, Collapse, Divider, useTheme, useMediaQuery } from '@/mui'
import { Avatar } from '../components/ui/Avatar'
import FilterChips from '../components/ui/FilterChips'

interface Author { id: string; fullName: string; email: string }

interface Discussion {
  id: string; projectId: string; entityType: string; entityId: string
  authorId: string; parentId: string | null; content: string
  createdAt: string; updatedAt: string; author: Author | null; replies: Discussion[]
}

export default function DiscussionsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()!
  const { user } = useAuth()
  const { showError, showSuccess } = useToast()

  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [filter, setFilter] = useState('all')

  useEffect(() => { if (projectId) loadDiscussions() }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDiscussions = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const { data } = await apiClient.get<Discussion[]>(
        `/projects/${projectId}/discussions`,
        { params: { entity_type: 'project', entity_id: projectId } }
      )
      setDiscussions(data)
    } catch { showError(t('discussions.failedToLoad')) }
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!projectId || !content.trim()) return
    setSaving(true)
    try {
      await apiClient.post(`/projects/${projectId}/discussions`, {
        entity_type: 'project', entity_id: projectId, content: content.trim(),
      })
      showSuccess(t('discussions.createSuccess'))
      setCreateOpen(false); setContent(''); loadDiscussions()
    } catch { showError(t('discussions.failedToCreate')) }
    finally { setSaving(false) }
  }

  const handleReply = async (parentId: string) => {
    if (!projectId || !replyContent.trim()) return
    setReplyLoading(true)
    try {
      await apiClient.post(`/projects/${projectId}/discussions`, {
        entity_type: 'project', entity_id: projectId,
        content: replyContent.trim(), parent_id: parentId,
      })
      showSuccess(t('discussions.replySuccess'))
      setReplyingTo(null); setReplyContent(''); loadDiscussions()
    } catch { showError(t('discussions.failedToReply')) }
    finally { setReplyLoading(false) }
  }

  const handleEdit = async (discussionId: string) => {
    if (!projectId || !editContent.trim()) return
    setSaving(true)
    try {
      await apiClient.put(`/projects/${projectId}/discussions/${discussionId}`, { content: editContent.trim() })
      showSuccess(t('discussions.editSuccess'))
      setEditingId(null); setEditContent(''); loadDiscussions()
    } catch { showError(t('discussions.failedToEdit')) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!projectId || !deletingId) return
    setDeleting(true)
    try {
      await apiClient.delete(`/projects/${projectId}/discussions/${deletingId}`)
      showSuccess(t('discussions.deleteSuccess'))
      setDeleteDialogOpen(false); setDeletingId(null); loadDiscussions()
    } catch { showError(t('discussions.failedToDelete')) }
    finally { setDeleting(false) }
  }

  const toggleThread = (id: string) => setExpandedThreads(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const getRelativeTime = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diffMs / 60000), hrs = Math.floor(mins / 60), days = Math.floor(hrs / 24)
    if (mins < 1) return t('discussions.justNow')
    if (mins < 60) return t('discussions.minutesAgo', { count: mins })
    if (hrs < 24) return t('discussions.hoursAgo', { count: hrs })
    return days < 30 ? t('discussions.daysAgo', { count: days }) : new Date(dateStr).toLocaleDateString(getDateLocale())
  }
  const isOwner = (d: Discussion) => user?.id === d.authorId
  const filteredDiscussions = search
    ? discussions.filter(d => d.content.toLowerCase().includes(search.toLowerCase()) ||
        d.author?.fullName.toLowerCase().includes(search.toLowerCase()) ||
        d.replies.some(r => r.content.toLowerCase().includes(search.toLowerCase())))
    : discussions
  const totalReplies = discussions.reduce((sum, d) => sum + d.replies.length, 0)
  const uniqueAuthors = new Set(discussions.flatMap(d => [d.authorId, ...d.replies.map(r => r.authorId)])).size
  const displayedDiscussions = filteredDiscussions.filter(d => {
    if (filter === 'my') return d.authorId === user?.id
    if (filter === 'recent') return new Date(d.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    return true
  })

  const TimeStamp = ({ date }: { date: string }) => (
    <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
      <AccessTimeIcon sx={{ fontSize: 12 }} />{getRelativeTime(date)}
    </Typography>
  )

  const OwnerActions = ({ item, iconSize = 14 }: { item: Discussion; iconSize?: number }) => (
    isOwner(item) && editingId !== item.id ? (<Box sx={{ display: 'flex', gap: 0.5 }}>
      <IconButton size="small" onClick={() => { setEditingId(item.id); setEditContent(item.content) }}><EditIcon sx={{ fontSize: iconSize }} /></IconButton>
      <IconButton size="small" color="error" onClick={() => { setDeletingId(item.id); setDeleteDialogOpen(true) }}><DeleteIcon sx={{ fontSize: iconSize }} /></IconButton>
    </Box>) : null
  )

  const EditInline = ({ id }: { id: string }) => (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
      <TextField fullWidth size="small" multiline maxRows={4} value={editContent} onChange={(e) => setEditContent(e.target.value)} />
      <Button variant="primary" size="small" loading={saving} onClick={() => handleEdit(id)}>{t('common.save')}</Button>
      <Button variant="secondary" size="small" onClick={() => setEditingId(null)}>{t('common.cancel')}</Button>
    </Box>
  )

  const renderReply = (reply: Discussion) => (
    <Box key={reply.id} sx={{ display: 'flex', gap: 1.5, py: 1.5 }}>
      <Avatar name={reply.author?.fullName || '?'} size="small" />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="caption" fontWeight={700}>{reply.author?.fullName}</Typography>
          <TimeStamp date={reply.createdAt} />
        </Box>
        {editingId === reply.id ? <EditInline id={reply.id} />
          : <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{reply.content}</Typography>}
        <OwnerActions item={reply} />
      </Box>
    </Box>
  )

  if (loading && discussions.length === 0) return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={300} height={24} sx={{ mb: 3 }} />
      {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 3, mb: 2 }} />)}
    </Box>
  )

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader title={t('discussions.title')} subtitle={t('discussions.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('discussions.title') }]}
        actions={
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            <Button variant="primary" icon={<AddIcon />} onClick={() => setCreateOpen(true)}>{t('discussions.create')}</Button>
          </Box>
        }
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2 }}>
        <KPICard title={t('discussions.threads')} value={discussions.length} icon={<GroupsIcon />} color="primary" />
        <KPICard title={t('discussions.totalReplies')} value={totalReplies} icon={<CommentIcon />} color="info" />
        <KPICard title={t('discussions.activeParticipants')} value={uniqueAuthors} icon={<PeopleIcon />} color="success" />
      </Box>

      <Box sx={{ mb: 2 }}>
        <SearchField placeholder={t('discussions.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
      </Box>

      <Box sx={{ mb: 2 }}>
        <FilterChips
          items={[
            { label: t('discussions.filterAll'), value: 'all', count: filteredDiscussions.length },
            { label: t('discussions.filterMyPosts'), value: 'my', count: filteredDiscussions.filter(d => d.authorId === user?.id).length },
            { label: t('discussions.filterRecent'), value: 'recent' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {displayedDiscussions.length === 0 ? (
          <EmptyState title={t('discussions.noDiscussions')} description={t('discussions.noDiscussionsDescription')}
            icon={<CommentIcon sx={{ color: 'text.secondary' }} />}
            action={{ label: t('discussions.create'), onClick: () => setCreateOpen(true) }} />
        ) : displayedDiscussions.map((discussion) => (
          <Card key={discussion.id}>
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Avatar name={discussion.author?.fullName || '?'} size="medium" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={700}>{discussion.author?.fullName}</Typography>
                      <TimeStamp date={discussion.createdAt} />
                    </Box>
                    <OwnerActions item={discussion} iconSize={16} />
                  </Box>
                  {editingId === discussion.id ? <EditInline id={discussion.id} /> : (
                    <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mb: 1 }}>
                      {discussion.content}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button variant="tertiary" size="small" icon={<ReplyIcon sx={{ fontSize: 14 }} />}
                      onClick={() => { setReplyingTo(replyingTo === discussion.id ? null : discussion.id); setReplyContent('') }}>
                      {t('discussions.reply')}
                    </Button>
                    {discussion.replies.length > 0 && (
                      <Button variant="tertiary" size="small"
                        icon={expandedThreads.has(discussion.id) ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                        onClick={() => toggleThread(discussion.id)}>
                        {t('discussions.repliesCount', { count: discussion.replies.length })}
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
              <Collapse in={replyingTo === discussion.id}>
                <Box sx={{ mt: 1.5, ms: 6, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <TextField fullWidth size="small" multiline maxRows={3} placeholder={t('discussions.replyPlaceholder')}
                    value={replyContent} onChange={(e) => setReplyContent(e.target.value)} />
                  <IconButton color="primary" disabled={!replyContent.trim() || replyLoading} onClick={() => handleReply(discussion.id)}>
                    <SendIcon />
                  </IconButton>
                </Box>
              </Collapse>
              <Collapse in={expandedThreads.has(discussion.id) && discussion.replies.length > 0}>
                <Box sx={{ ms: 6, mt: 1 }}>
                  <Divider sx={{ mb: 1 }} />
                  {discussion.replies.map(renderReply)}
                </Box>
              </Collapse>
            </Box>
          </Card>
        ))}
      </Box>

      {displayedDiscussions.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2, fontWeight: 500 }}>
          {t('discussions.totalCount', { count: displayedDiscussions.length })}
        </Typography>
      )}
      {isMobile && (
        <Box sx={{ position: 'fixed', bottom: 80, left: 16, zIndex: 10 }}>
          <Button variant="primary" icon={<AddIcon />} onClick={() => setCreateOpen(true)}>{t('discussions.create')}</Button>
        </Box>
      )}

      <FormModal open={createOpen} onClose={() => { setCreateOpen(false); setContent('') }}
        onSubmit={handleCreate} title={t('discussions.createNew')} submitLabel={t('discussions.post')} loading={saving}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField fullWidth label={t('discussions.content')} required multiline rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
        </Box>
      </FormModal>
      <ConfirmModal open={deleteDialogOpen} onClose={() => { setDeleteDialogOpen(false); setDeletingId(null) }}
        onConfirm={handleDelete} title={t('discussions.deleteTitle')} message={t('discussions.deleteConfirm')} confirmLabel={t('common.delete')} variant="danger" loading={deleting} />
    </Box>
  )
}
