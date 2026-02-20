import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { adminApi } from '../api/admin'
import type { User } from '../types'
import { SearchField } from '../components/ui/TextField'
import { AdminPanelSettingsIcon, SecurityIcon, MoreVertIcon, PersonIcon } from '@/icons'
import { Box, Typography, Switch, Chip, Skeleton, Alert, Avatar, IconButton } from '@/mui'

export default function AdminUsersPage() {
  const { t } = useTranslation()
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
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 20,
        bgcolor: 'background.default', px: { xs: 2, sm: 3 }, py: 1.5,
        borderBottom: 1, borderColor: 'divider',
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <AdminPanelSettingsIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" fontWeight={700} letterSpacing='-0.02em'>
          {t('admin.usersTitle')}
        </Typography>
      </Box>

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
        <Box sx={{
          bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3,
          p: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <Typography variant="h5" fontWeight={700} color="primary.main">{totalUsers}</Typography>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontSize="0.6rem">
            {t('admin.totalUsers', 'Users')}
          </Typography>
        </Box>
        <Box sx={{
          bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3,
          p: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <Typography variant="h5" fontWeight={700}>{activeToday}</Typography>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontSize="0.6rem">
            {t('admin.activeUsers', 'Active')}
          </Typography>
        </Box>
        <Box sx={{
          bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3,
          p: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
        }}>
          <Typography variant="h5" fontWeight={700}>{pendingUsers}</Typography>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontSize="0.6rem">
            {t('admin.pendingUsers', 'Pending')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2 }}>
        <SearchField
          placeholder={t('admin.searchUsers', 'Search users...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto', pb: 0.5 }}>
          {roleChips.map(chip => (
            <Chip
              key={chip.key}
              label={chip.label}
              size="small"
              onClick={() => setRoleFilter(chip.key)}
              sx={{
                fontWeight: 600, fontSize: '0.7rem',
                bgcolor: roleFilter === chip.key ? 'primary.main' : 'action.hover',
                color: roleFilter === chip.key ? 'primary.contrastText' : 'text.primary',
                '&:hover': { bgcolor: roleFilter === chip.key ? 'primary.dark' : 'action.selected' },
              }}
            />
          ))}
        </Box>
      </Box>

      {error && (
        <Box sx={{ px: 2, mt: 2 }}>
          <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
        </Box>
      )}

      <Box sx={{ px: 2, mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {filtered.map((user) => {
          const initials = (user.fullName || user.email).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          return (
            <Box
              key={user.id}
              sx={{
                bgcolor: 'background.paper', borderRadius: 3, p: 2,
                border: 1, borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar sx={{ width: 48, height: 48, bgcolor: user.isSuperAdmin ? 'error.main' : 'primary.main', fontSize: '0.9rem' }}>
                      {initials || <PersonIcon />}
                    </Avatar>
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
                <IconButton size="small" sx={{ color: 'text.disabled' }}>
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
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
