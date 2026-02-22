import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { notificationsApi } from '../api/notifications'
import type { Notification, NotificationCategory } from '../types/notification'
import { useToast } from '../components/common/ToastProvider'
import { EmptyState } from '../components/ui/EmptyState'
import {
  NotificationsIcon, DeleteIcon, CheckCircleIcon, SearchIcon,
  FilterListIcon, CloseIcon, RefreshIcon, MoreVertIcon,
  CheckCircleOutlineIcon, ErrorOutlineIcon, WarningAmberIcon,
  InfoOutlinedIcon,
} from '@/icons'
import {
  Box, Typography, Skeleton, Chip, Checkbox, IconButton, Pagination,
  useTheme, useMediaQuery, TextField, InputAdornment, Tabs, Tab,
  Menu, MenuItem, Tooltip, Paper, Divider, Stack, Badge,
} from '@/mui'

const CATEGORIES: { key: NotificationCategory | 'all'; color: string }[] = [
  { key: 'all', color: '#757575' },
  { key: 'approval', color: '#4caf50' },
  { key: 'inspection', color: '#2196f3' },
  { key: 'defect', color: '#f44336' },
  { key: 'update', color: '#ff9800' },
  { key: 'general', color: '#9e9e9e' },
]

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  approval: <CheckCircleOutlineIcon fontSize="small" />,
  inspection: <InfoOutlinedIcon fontSize="small" />,
  defect: <ErrorOutlineIcon fontSize="small" />,
  update: <WarningAmberIcon fontSize="small" />,
  general: <NotificationsIcon fontSize="small" />,
}

const PAGE_SIZE = 20

export default function NotificationsPage() {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { showToast } = useToast()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<NotificationCategory | 'all'>('all')
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const result = await notificationsApi.getAll({
        category: activeTab === 'all' ? undefined : activeTab,
        isRead: readFilter === 'all' ? undefined : readFilter === 'read',
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
      setNotifications(result.items)
      setTotal(result.total)
    } catch {
      showToast(t('notificationCenter.fetchError'), 'error')
    } finally {
      setLoading(false)
    }
  }, [activeTab, readFilter, search, page, t, showToast])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    setPage(1)
    setSelected(new Set())
  }, [activeTab, readFilter, search])

  const handleToggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selected.size === notifications.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(notifications.map(n => n.id)))
    }
  }

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markAsRead(id)
    fetchNotifications()
  }

  const handleMarkUnread = async (id: string) => {
    await notificationsApi.markAsUnread(id)
    fetchNotifications()
  }

  const handleDelete = async (id: string) => {
    await notificationsApi.deleteNotification(id)
    showToast(t('notificationCenter.deleted'), 'success')
    fetchNotifications()
  }

  const handleBulkMarkRead = async () => {
    if (selected.size === 0) return
    await notificationsApi.bulkMarkRead(Array.from(selected))
    setSelected(new Set())
    showToast(t('notificationCenter.bulkMarkedRead'), 'success')
    fetchNotifications()
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    await notificationsApi.bulkDelete(Array.from(selected))
    setSelected(new Set())
    showToast(t('notificationCenter.bulkDeleted'), 'success')
    fetchNotifications()
  }

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllAsRead()
    showToast(t('notificationCenter.allMarkedRead'), 'success')
    fetchNotifications()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const getCategoryColor = (cat: string) =>
    CATEGORIES.find(c => c.key === cat)?.color || '#9e9e9e'

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return t('notifications.justNow')
    if (minutes < 60) return t('notifications.minutesAgo', { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('notifications.hoursAgo', { count: hours })
    const days = Math.floor(hours / 24)
    if (days < 7) return t('notifications.daysAgo', { count: days })
    return t('notifications.weeksAgo', { count: Math.floor(days / 7) })
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          {t('notificationCenter.title')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title={t('notificationCenter.markAllRead')}>
            <IconButton onClick={handleMarkAllRead} size="small">
              <CheckCircleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('notificationCenter.refresh')}>
            <IconButton onClick={fetchNotifications} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {CATEGORIES.map(cat => (
            <Tab
              key={cat.key}
              value={cat.key}
              label={cat.key === 'all'
                ? t('notificationCenter.all')
                : t(`notifications.categories.${cat.key}`)}
            />
          ))}
        </Tabs>
      </Paper>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2} alignItems="center">
        <TextField
          size="small"
          placeholder={t('notificationCenter.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch('')}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <Stack direction="row" spacing={0.5}>
          {(['all', 'unread', 'read'] as const).map(filter => (
            <Chip
              key={filter}
              label={t(`notificationCenter.${filter}`)}
              variant={readFilter === filter ? 'filled' : 'outlined'}
              color={readFilter === filter ? 'primary' : 'default'}
              onClick={() => setReadFilter(filter)}
              size="small"
            />
          ))}
        </Stack>
      </Stack>

      {selected.size > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ mr: 1 }}>
            {t('notificationCenter.selectedCount', { count: selected.size })}
          </Typography>
          <Chip
            label={t('notificationCenter.markRead')}
            size="small"
            onClick={handleBulkMarkRead}
            icon={<CheckCircleIcon fontSize="small" />}
          />
          <Chip
            label={t('notificationCenter.delete')}
            size="small"
            color="error"
            onClick={handleBulkDelete}
            icon={<DeleteIcon fontSize="small" />}
          />
        </Paper>
      )}

      {loading ? (
        <Stack spacing={1}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={72} />
          ))}
        </Stack>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<NotificationsIcon sx={{ fontSize: 48 }} />}
          title={t('notificationCenter.empty')}
          description={t('notificationCenter.emptyDescription')}
        />
      ) : (
        <Stack spacing={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 1, pb: 1 }}>
            <Checkbox
              size="small"
              checked={selected.size === notifications.length && notifications.length > 0}
              indeterminate={selected.size > 0 && selected.size < notifications.length}
              onChange={handleSelectAll}
            />
            <Typography variant="caption" color="text.secondary">
              {t('notificationCenter.selectAll')}
            </Typography>
          </Box>
          {notifications.map((notification, idx) => (
            <Box key={notification.id}>
              <Paper
                elevation={0}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                  transition: 'background 0.2s',
                  '&:hover': { bgcolor: 'action.selected' },
                  cursor: 'pointer',
                }}
              >
                <Checkbox
                  size="small"
                  checked={selected.has(notification.id)}
                  onChange={() => handleToggleSelect(notification.id)}
                  onClick={e => e.stopPropagation()}
                />
                <Badge
                  variant="dot"
                  invisible={notification.isRead}
                  color="primary"
                  sx={{ mt: 0.5 }}
                >
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: getCategoryColor(notification.category) + '20',
                    color: getCategoryColor(notification.category),
                  }}>
                    {CATEGORY_ICONS[notification.category] || <NotificationsIcon fontSize="small" />}
                  </Box>
                </Badge>
                <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => notification.isRead ? handleMarkUnread(notification.id) : handleMarkRead(notification.id)}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography
                      variant="body2"
                      fontWeight={notification.isRead ? 400 : 600}
                      noWrap
                    >
                      {notification.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                      {formatTime(notification.createdAt)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {notification.message}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={e => { setMenuAnchor(e.currentTarget); setActiveMenuId(notification.id) }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Paper>
              {idx < notifications.length - 1 && <Divider />}
            </Box>
          ))}
        </Stack>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Box>
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => { setMenuAnchor(null); setActiveMenuId(null) }}
      >
        <MenuItem onClick={() => {
          if (activeMenuId) {
            const n = notifications.find(x => x.id === activeMenuId)
            if (n?.isRead) handleMarkUnread(activeMenuId)
            else if (activeMenuId) handleMarkRead(activeMenuId)
          }
          setMenuAnchor(null)
        }}>
          {notifications.find(x => x.id === activeMenuId)?.isRead
            ? t('notificationCenter.markUnread')
            : t('notificationCenter.markRead')}
        </MenuItem>
        <MenuItem onClick={() => {
          if (activeMenuId) handleDelete(activeMenuId)
          setMenuAnchor(null)
        }} sx={{ color: 'error.main' }}>
          {t('notificationCenter.delete')}
        </MenuItem>
      </Menu>
    </Box>
  )
}
