import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/Button'
import { apiClient } from '../api/client'
import { Box, Typography, Checkbox, FormControlLabel, Chip, Alert, CircularProgress } from '@/mui'

interface MemberPermissionsEditorProps {
  projectId: string
  memberId: string
  memberRole: string
  onSaved?: () => void
}

const ALL_PERMISSIONS = ['create', 'edit', 'delete', 'approve', 'view_all', 'manage_members', 'manage_settings']

const ROLE_DEFAULTS: Record<string, string[]> = {
  project_admin: ALL_PERMISSIONS,
  supervisor: ['create', 'edit', 'approve', 'view_all'],
  consultant: ['view_all', 'approve', 'create'],
  contractor: ['create', 'edit', 'view_all'],
  inspector: ['create', 'edit', 'view_all'],
}

interface PermissionsData {
  role: string
  permissions: string[]
  overrides: Array<{ id: string; permission: string; granted: boolean }>
}

export default function MemberPermissionsEditor({ projectId, memberId, memberRole, onSaved }: MemberPermissionsEditorProps) {
  const { t } = useTranslation()
  const [, setData] = useState<PermissionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permStates, setPermStates] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchPermissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, memberId])

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get<PermissionsData>(
        `/projects/${projectId}/members/${memberId}/permissions`
      )
      setData(response.data)
      const states: Record<string, boolean> = {}
      ALL_PERMISSIONS.forEach((p) => {
        states[p] = response.data.permissions.includes(p)
      })
      setPermStates(states)
    } catch {
      setError(t('permissions.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const overrides = ALL_PERMISSIONS.map((p) => ({
        permission: p,
        granted: permStates[p] ?? false,
      }))
      await apiClient.put(`/projects/${projectId}/members/${memberId}/permissions`, overrides)
      onSaved?.()
    } catch {
      setError(t('permissions.failedToSave'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <CircularProgress size={24} />

  const roleDefaults = ROLE_DEFAULTS[memberRole] || []

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="subtitle2">{t('permissions.roleLabel')}:</Typography>
        <Chip label={t(`roles.${memberRole}`, { defaultValue: memberRole.replace('_', ' ') })} size="small" color="primary" sx={{ textTransform: 'capitalize' }} />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {ALL_PERMISSIONS.map((p) => {
          const isDefault = roleDefaults.includes(p)
          const isOverride = isDefault !== (permStates[p] ?? false)
          return (
            <FormControlLabel
              key={p}
              control={
                <Checkbox
                  checked={permStates[p] ?? false}
                  onChange={(e) => setPermStates((prev) => ({ ...prev, [p]: e.target.checked }))}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    {t(`permissions.${p}`, p.replace('_', ' '))}
                  </Typography>
                  {isOverride && (
                    <Chip label={t('permissions.override')} size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                  )}
                </Box>
              }
            />
          )
        })}
      </Box>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={handleSave} loading={saving}>
          {t('permissions.save')}
        </Button>
      </Box>
    </Box>
  )
}
