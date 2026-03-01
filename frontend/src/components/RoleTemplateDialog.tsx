import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/Button'
import { rolesApi, OrganizationRole } from '../api/roles'
import { useToast } from './common/ToastProvider'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
  Radio,
} from '@/mui'

interface RoleTemplateDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (template: OrganizationRole) => void
  organizationId: string
}

export default function RoleTemplateDialog({ open, onClose, onSelect, organizationId }: RoleTemplateDialogProps) {
  const { t } = useTranslation()
  const { showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<OrganizationRole[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<OrganizationRole | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && organizationId) {
      loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, organizationId])

  const loadTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      const allRoles = await rolesApi.listOrganizationRoles(organizationId)
      // Filter to show only system roles (templates)
      const systemRoles = allRoles.filter((role) => role.isSystemRole)
      setTemplates(systemRoles)
    } catch {
      setError(t('roleManagement.failedToLoadTemplates'))
      showError(t('roleManagement.failedToLoadTemplates'))
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate)
      handleClose()
    }
  }

  const handleClose = () => {
    setSelectedTemplate(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('roleManagement.selectTemplate')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : templates.length === 0 ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            {t('roleManagement.noTemplates')}
          </Alert>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('roleManagement.templateDescription')}
            </Typography>
            <List sx={{ p: 0 }}>
              {templates.map((template) => (
                <ListItem key={template.id} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    selected={selectedTemplate?.id === template.id}
                    onClick={() => setSelectedTemplate(template)}
                    sx={{
                      border: 1,
                      borderColor: selectedTemplate?.id === template.id ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      '&:hover': {
                        borderColor: 'primary.light',
                      },
                    }}
                  >
                    <Radio
                      checked={selectedTemplate?.id === template.id}
                      sx={{ mr: 1 }}
                      tabIndex={-1}
                    />
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">{template.name}</Typography>
                          <Chip
                            label={t('roleManagement.systemRole')}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          {template.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {template.description}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {(template.permissions || []).map((p) => (
                              <Chip
                                key={p}
                                label={t(`permissions.${p}`, p)}
                                size="small"
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                            ))}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="secondary" onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          variant="primary"
          onClick={handleSelect}
          disabled={!selectedTemplate || loading}
        >
          {t('roleManagement.useTemplate')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
