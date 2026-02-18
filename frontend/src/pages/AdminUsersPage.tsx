import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { adminApi } from '../api/admin'
import type { User } from '../types'
import { AdminPanelSettingsIcon } from '@/icons'
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Switch, Chip, CircularProgress, Alert } from '@/mui'

export default function AdminUsersPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <AdminPanelSettingsIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h5" fontWeight={700}>{t('admin.usersTitle')}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('fullName')}</TableCell>
              <TableCell>{t('email')}</TableCell>
              <TableCell align="center">{t('admin.active')}</TableCell>
              <TableCell align="center">{t('admin.superAdmin')}</TableCell>
              <TableCell>{t('admin.joined')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {user.fullName || '-'}
                    {user.isSuperAdmin && (
                      <Chip label={t('admin.superAdminLabel')} size="small" color="error" variant="outlined" />
                    )}
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell align="center">
                  <Switch
                    checked={user.isActive}
                    onChange={(e) => handleToggle(user.id, 'is_active', e.target.checked)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Switch
                    checked={user.isSuperAdmin ?? false}
                    onChange={(e) => handleToggle(user.id, 'is_super_admin', e.target.checked)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString(getDateLocale())}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
