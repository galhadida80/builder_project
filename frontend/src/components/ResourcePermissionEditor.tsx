import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/Button'
import { apiClient } from '../api/client'
import { Box, Typography, Checkbox, FormControlLabel, Alert, CircularProgress, Autocomplete, TextField } from '@/mui'
import type { ConstructionArea } from '../types'

interface ResourcePermissionEditorProps {
  projectId: string
  memberId: string
  onSaved?: () => void
}

const RESOURCE_PERMISSIONS = ['create', 'edit', 'delete', 'approve', 'view']

interface ResourcePermission {
  id: string
  resourceType: string
  resourceId: string
  permission: string
}

interface ResourcePermissionsData {
  permissions: ResourcePermission[]
}

export default function ResourcePermissionEditor({ projectId, memberId, onSaved }: ResourcePermissionEditorProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [areas, setAreas] = useState<ConstructionArea[]>([])
  const [selectedAreas, setSelectedAreas] = useState<ConstructionArea[]>([])
  const [permStates, setPermStates] = useState<Record<string, Record<string, boolean>>>({})

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, memberId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [areasResponse, permsResponse] = await Promise.all([
        apiClient.get<ConstructionArea[]>(`/projects/${projectId}/areas`),
        apiClient.get<ResourcePermissionsData>(`/projects/${projectId}/members/${memberId}/resource-permissions`)
      ])

      setAreas(areasResponse.data)

      const areaPerms = permsResponse.data.permissions.filter(p => p.resourceType === 'area')
      const selectedAreaIds = new Set(areaPerms.map(p => p.resourceId))
      const selected = areasResponse.data.filter(a => selectedAreaIds.has(a.id))
      setSelectedAreas(selected)

      const states: Record<string, Record<string, boolean>> = {}
      areaPerms.forEach(perm => {
        if (!states[perm.resourceId]) {
          states[perm.resourceId] = {}
        }
        states[perm.resourceId][perm.permission] = true
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
      const permissions: Array<{ resourceType: string; resourceId: string; permission: string; granted: boolean }> = []

      selectedAreas.forEach(area => {
        RESOURCE_PERMISSIONS.forEach(perm => {
          permissions.push({
            resourceType: 'area',
            resourceId: area.id,
            permission: perm,
            granted: permStates[area.id]?.[perm] ?? false
          })
        })
      })

      await apiClient.put(`/projects/${projectId}/members/${memberId}/resource-permissions`, { permissions })
      onSaved?.()
    } catch {
      setError(t('permissions.failedToSave'))
    } finally {
      setSaving(false)
    }
  }

  const handleAreaChange = (_: unknown, newValue: ConstructionArea[]) => {
    setSelectedAreas(newValue)
    const newStates = { ...permStates }
    newValue.forEach(area => {
      if (!newStates[area.id]) {
        newStates[area.id] = {}
      }
    })
    setPermStates(newStates)
  }

  const handlePermissionChange = (areaId: string, permission: string, checked: boolean) => {
    setPermStates(prev => ({
      ...prev,
      [areaId]: {
        ...prev[areaId],
        [permission]: checked
      }
    }))
  }

  if (loading) return <CircularProgress size={24} />

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        {t('permissions.resourcePermissions')}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Autocomplete
        multiple
        options={areas}
        value={selectedAreas}
        onChange={handleAreaChange}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('permissions.selectAreas')}
            placeholder={t('permissions.selectAreasPlaceholder')}
            size="small"
          />
        )}
        sx={{ mb: 3 }}
      />

      {selectedAreas.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {selectedAreas.map(area => (
            <Box key={area.id} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                {area.name}
                {area.areaCode && ` (${area.areaCode})`}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pl: 1 }}>
                {RESOURCE_PERMISSIONS.map(perm => (
                  <FormControlLabel
                    key={perm}
                    control={
                      <Checkbox
                        checked={permStates[area.id]?.[perm] ?? false}
                        onChange={(e) => handlePermissionChange(area.id, perm, e.target.checked)}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {t(`permissions.${perm}`, perm)}
                      </Typography>
                    }
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={handleSave} loading={saving}>
          {t('permissions.save')}
        </Button>
      </Box>
    </Box>
  )
}
