import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { adminApi } from '../api/admin'
import type { User } from '../types'
import { SearchField } from '../components/ui/TextField'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { KPICard, Card } from '../components/ui/Card'
import FilterChips from '../components/ui/FilterChips'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { AdminPanelSettingsIcon, SecurityIcon, MoreVertIcon } from '@/icons'
import { Box, Typography, Switch, Chip, Skeleton, Alert, IconButton, useTheme, useMediaQuery } from '@/mui'

export default function AdminUsersPage() {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await adminApi.listUsers()
      setUsers(data)
    } catch {
      setError(t('admin.failedToLoadUsers'))
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (userId: string, field: 'is_active' | 'is_super_admin', value: boolean) => {
    try {
      await adminApi.updateUser(userId, { [field]: value })
      setUsers((prev) => prev.map((u) => {
        if (u.id !== userId) return u
        if (field === 'is_active') return { ...u, isActive: value }
        if (field === 'is_super_admin') return { ...u, isSuperAdmin: value }
        return u
      }))
    } catch {
      setError(t('admin.failedToUpdateUser'))
    }
  }

  const filtered = users.filter(u => {
    const matchesSearch = (u.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    if (roleFilter === 'admin') return matchesSearch && u.isSuperAdmin
    if (roleFilter === 'active') return matchesSearch && u.isActive
    if (roleFilter === 'inactive') return matchesSearch && !u.isActive
    return matchesSearch
  })

  const totalUsers = users.length
  const activeToday = users.filter(u => u.isActive).length
  const pendingUsers = users.filter(u => !u.isActive).length

  const roleChips = [
    { key: 'all', label: t('admin.filterAll', 'All') },
    { key: 'admin', label: t('admin.filterAdmin', 'Admin') },
    { key: 'active', label: t('admin.filterActive', 'Active') },
    { key: 'inactive', label: t('admin.filterInactive', 'Inactive') },
  ]

  if (loading) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        <Skeleton variant="rounded" height={48} sx={{ mb: 2, borderRadius: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 3 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={88} sx={{ borderRadius: 3, mb: 1.5 }} />
        ))}
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 10 }}>
      <PageHeader title={t('admin.usersTitle')} icon={<AdminPanelSettingsIcon />} />

      <Box sx={{
        bgcolor: 'error.main', color: 'error.contrastText',
        px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon sx={{ fontSize: 18 }} />
          <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={1}>
            {t('admin.adminPanel', 'Admin Panel')}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {t('admin.adminModeActive', 'Admin mode active')}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, p: 2 }}>
        <KPICard title={t('admin.totalUsers', 'Users')} value={totalUsers} color="primary" />
        <KPICard title={t('admin.activeUsers', 'Active')} value={activeToday} color="success" />
        <KPICard title={t('admin.pendingUsers', 'Pending')} value={pendingUsers} color="warning" />
      </Box>

      <Box sx={{ px: 2 }}>
        <SearchField
          placeholder={t('admin.searchUsers', 'Search users...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Box sx={{ mt: 1.5 }}>
          <FilterChips
            items={roleChips.map(c => ({ label: c.label, value: c.key }))}
            value={roleFilter}
            onChange={setRoleFilter}
          />
        </Box>
      </Box>

      {error && (
        <Box sx={{ px: 2, mt: 2 }}>
          <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
        </Box>
      )}

      <Box sx={{ px: 2, mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {filtered.length === 0 && (
          <EmptyState variant="no-results" title={t('admin.noUsersFound', 'No users found')} />
        )}
        {filtered.map((user) => (
          <Card key={user.id} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar name={user.fullName || user.email} size="large" color={user.isSuperAdmin ? 'error' : 'primary'} />
                  {user.isActive && (
                    <Box sx={{
                      position: 'absolute', bottom: 0, insetInlineEnd: 0,
                      width: 14, height: 14, bgcolor: 'success.main',
                      borderRadius: '50%', border: 2, borderColor: 'background.paper',
                    }} />
                  )}
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                    <Typography variant="body2" fontWeight={700}>{user.fullName || '-'}</Typography>
                    {user.isSuperAdmin && (
                      <Chip label={t('admin.superAdminLabel')} size="small"
                        sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: 'error.light', color: 'error.dark' }} />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {user.email}
                  </Typography>
                  <Typography variant="caption" color={user.isActive ? 'success.main' : 'text.disabled'} fontWeight={500} fontSize="0.65rem">
                    {user.isActive ? t('admin.activeNow', 'Active') : t('admin.inactive', 'Inactive')}
                    {' · '}
                    {new Date(user.createdAt).toLocaleDateString(getDateLocale())}
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small" aria-label={t('common.moreOptions')} sx={{ color: 'text.disabled' }}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                  {t('admin.active')}
                </Typography>
                <Switch
                  checked={user.isActive}
                  onChange={(e) => handleToggle(user.id, 'is_active', e.target.checked)}
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                  {t('admin.superAdmin')}
                </Typography>
                <Switch
                  checked={user.isSuperAdmin ?? false}
                  onChange={(e) => handleToggle(user.id, 'is_super_admin', e.target.checked)}
                  size="small"
                />
              </Box>
            </Box>
          </Card>
        ))}
      </Box>
    </Box>
  )
}
