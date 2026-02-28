import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { notificationsApi } from '../api/notifications'
import type { Notification, NotificationCategory } from '../types/notification'
import { useToast } from '../components/common/ToastProvider'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { Card } from '../components/ui/Card'
import { SearchField } from '../components/ui/TextField'
import FilterChips from '../components/ui/FilterChips'
import { ConfirmModal } from '../components/ui/Modal'
import { NotificationRow } from '../components/notifications/NotificationRow'
import {
  NotificationsIcon, DeleteIcon, CheckCircleIcon, RefreshIcon,
} from '@/icons'
import {
  Box, Typography, Skeleton, Checkbox, IconButton, Pagination,
  useTheme, useMediaQuery, Tabs, Tab, Menu, MenuItem, Tooltip, Divider, Stack,
} from '@/mui'

const CATEGORY_KEYS: (NotificationCategory | 'all')[] = [
  'all', 'approval', 'inspection', 'defect', 'update', 'general',
]

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
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

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

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

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
    if (selected.size === notifications.length) setSelected(new Set())
    else setSelected(new Set(notifications.map(n => n.id)))
  }

  const handleToggleRead = async (id: string, isRead: boolean) => {
    isRead ? await notificationsApi.markAsUnread(id) : await notificationsApi.markAsRead(id)
    fetchNotifications()
  }

  const handleDelete = async (id: string) => { await notificationsApi.deleteNotification(id); showToast(t('notificationCenter.deleted'), 'success'); fetchNotifications() }

  const handleBulkMarkRead = async () => {
    if (selected.size === 0) return
    await notificationsApi.bulkMarkRead(Array.from(selected)); setSelected(new Set()); showToast(t('notificationCenter.bulkMarkedRead'), 'success'); fetchNotifications()
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    await notificationsApi.bulkDelete(Array.from(selected)); setSelected(new Set()); setBulkDeleteOpen(false); showToast(t('notificationCenter.bulkDeleted'), 'success'); fetchNotifications()
  }

  const handleMarkAllRead = async () => { await notificationsApi.markAllAsRead(); showToast(t('notificationCenter.allMarkedRead'), 'success'); fetchNotifications() }

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, id: string) => { setMenuAnchor(e.currentTarget); setActiveMenuId(id) }
  const closeMenu = () => { setMenuAnchor(null); setActiveMenuId(null) }
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const diff = Date.now() - date.getTime()
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
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        title={t('notificationCenter.title')}
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={t('notificationCenter.markAllRead')}>
              <IconButton onClick={handleMarkAllRead} size="small"><CheckCircleIcon /></IconButton>
            </Tooltip>
            <Tooltip title={t('notificationCenter.refresh')}>
              <IconButton onClick={fetchNotifications} size="small"><RefreshIcon /></IconButton>
            </Tooltip>
          </Box>
        }
      />

      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}>
        <Card sx={{ mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {CATEGORY_KEYS.map(key => (
              <Tab
                key={key}
                value={key}
                label={key === 'all'
                  ? t('notificationCenter.all')
                  : t(`notifications.categories.${key}`)}
              />
            ))}
          </Tabs>
        </Card>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2} alignItems="center">
          <SearchField
            placeholder={t('notificationCenter.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <FilterChips
            items={[
              { label: t('notificationCenter.all'), value: 'all' },
              { label: t('notificationCenter.unread'), value: 'unread' },
              { label: t('notificationCenter.read'), value: 'read' },
            ]}
            value={readFilter}
            onChange={(v) => setReadFilter(v as 'all' | 'unread' | 'read')}
          />
        </Stack>

        {selected.size > 0 && (
          <Card sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              {t('notificationCenter.selectedCount', { count: selected.size })}
            </Typography>
            <Tooltip title={t('notificationCenter.markRead')}>
              <IconButton size="small" onClick={handleBulkMarkRead}>
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('notificationCenter.delete')}>
              <IconButton size="small" color="error" onClick={() => setBulkDeleteOpen(true)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Card>
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
                <NotificationRow
                  notification={notification}
                  selected={selected.has(notification.id)}
                  onToggleSelect={handleToggleSelect}
                  onToggleRead={handleToggleRead}
                  onMenuOpen={handleMenuOpen}
                  formatTime={formatTime}
                />
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
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => { if (activeMenuId) { const n = notifications.find(x => x.id === activeMenuId); if (n) handleToggleRead(activeMenuId, n.isRead) } closeMenu() }}>
          {notifications.find(x => x.id === activeMenuId)?.isRead ? t('notificationCenter.markUnread') : t('notificationCenter.markRead')}
        </MenuItem>
        <MenuItem onClick={() => { if (activeMenuId) handleDelete(activeMenuId); closeMenu() }} sx={{ color: 'error.main' }}>
          {t('notificationCenter.delete')}
        </MenuItem>
      </Menu>

      <ConfirmModal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title={t('notificationCenter.delete')}
        message={t('notificationCenter.bulkDeleteConfirm', { count: selected.size })}
        variant="danger"
      />
    </Box>
  )
}
