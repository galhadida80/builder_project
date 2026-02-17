import { memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DashboardIcon, FolderIcon, BuildIcon, InventoryIcon, EventIcon, CheckCircleIcon, AccountTreeIcon, ContactsIcon, HistoryIcon, SettingsIcon, AssignmentIcon, ConstructionIcon, EmailIcon, ViewInArIcon, ChecklistIcon, ReportProblemIcon, TaskAltIcon, AccountBalanceIcon, BusinessIcon } from '@/icons'
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Typography } from '@/mui'

const DRAWER_WIDTH = 260

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const mainNavItems: NavItem[] = [
  { label: 'nav.dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'nav.projects', path: '/projects', icon: <FolderIcon /> },
  { label: 'nav.organizations', path: '/organizations', icon: <BusinessIcon /> },
]

const projectNavItems: NavItem[] = [
  { label: 'nav.equipment', path: '/equipment', icon: <BuildIcon /> },
  { label: 'nav.materials', path: '/materials', icon: <InventoryIcon /> },
  { label: 'nav.meetings', path: '/meetings', icon: <EventIcon /> },
  { label: 'nav.approvals', path: '/approvals', icon: <CheckCircleIcon /> },
  { label: 'nav.areas', path: '/areas', icon: <AccountTreeIcon /> },
  { label: 'nav.contacts', path: '/contacts', icon: <ContactsIcon /> },
  { label: 'nav.inspections', path: '/inspections', icon: <AssignmentIcon /> },
  { label: 'nav.rfis', path: '/rfis', icon: <EmailIcon /> },
  { label: 'nav.checklists', path: '/checklists', icon: <ChecklistIcon /> },
  { label: 'nav.defects', path: '/defects', icon: <ReportProblemIcon /> },
  { label: 'nav.tasks', path: '/tasks', icon: <TaskAltIcon /> },
  { label: 'nav.budget', path: '/budget', icon: <AccountBalanceIcon /> },
  { label: 'nav.bim', path: '/bim', icon: <ViewInArIcon /> },
]

const systemNavItems: NavItem[] = [
  { label: 'nav.auditLog', path: '/audit', icon: <HistoryIcon /> },
  { label: 'nav.settings', path: '/settings', icon: <SettingsIcon /> },
]

interface SidebarProps {
  projectId?: string
  mobileOpen?: boolean
  onMobileClose?: () => void
  isMobile?: boolean
}

export default memo(function Sidebar({ projectId, mobileOpen = false, onMobileClose, isMobile = false }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    if (path === '/projects' && location.pathname.startsWith('/projects')) {
      return location.pathname === '/projects'
    }
    return location.pathname.startsWith(path)
  }

  const handleNavigation = (path: string, requiresProject: boolean) => {
    if (requiresProject && projectId) {
      navigate(`/projects/${projectId}${path}`)
    } else {
      navigate(path)
    }
    onMobileClose?.()
  }

  const drawerContent = (
    <>
      <Box
        role="button"
        tabIndex={0}
        onClick={() => { navigate('/dashboard'); onMobileClose?.() }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate('/dashboard')
            onMobileClose?.()
          }
        }}
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
          '&:focus-visible': {
            outline: (theme) => `2px solid ${theme.palette.primary.main}`,
            outlineOffset: -2,
          },
          borderRadius: 2,
          mx: 0.5,
          mt: 0.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ConstructionIcon sx={{ color: 'white', fontSize: 24 }} />
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.125rem',
              color: 'text.primary',
              lineHeight: 1.2,
            }}
          >
            {t('app.name')}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
          >
            {t('app.subtitle')}
          </Typography>
        </Box>
      </Box>

      <Divider />

      <List sx={{ px: 1.5, py: 1 }}>
        {mainNavItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => handleNavigation(item.path, false)}
              sx={{
                borderRadius: 2,
                py: 1,
                transition: 'all 200ms ease-out',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
                '&:focus-visible': {
                  outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: -2,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={t(item.label)}
                primaryTypographyProps={{
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {projectId && (
        <>
          <Divider sx={{ mx: 2 }} />
          <Typography
            variant="caption"
            sx={{
              px: 3,
              py: 1.5,
              display: 'block',
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {t('nav.currentProject')}
          </Typography>
          <List sx={{ px: 1.5, py: 0 }}>
            {projectNavItems.map((item) => {
              const fullPath = `/projects/${projectId}${item.path}`
              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={location.pathname === fullPath}
                    onClick={() => handleNavigation(item.path, true)}
                    sx={{
                      borderRadius: 2,
                      py: 1,
                      transition: 'background-color 200ms ease-out',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'primary.contrastText',
                        },
                      },
                      '&:focus-visible': {
                        outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: -2,
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={t(item.label)}
                      primaryTypographyProps={{
                        fontWeight: 500,
                        fontSize: '0.875rem',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </>
      )}

      <Box sx={{ flexGrow: 1 }} />

      <Divider sx={{ mx: 2 }} />
      <List sx={{ px: 1.5, py: 1 }}>
        {systemNavItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => handleNavigation(item.path, false)}
              sx={{
                borderRadius: 2,
                py: 1,
                transition: 'all 200ms ease-out',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
                '&:focus-visible': {
                  outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: -2,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={t(item.label)}
                primaryTypographyProps={{
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ p: 2, pt: 0 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
            fontSize: '0.65rem',
          }}
        >
          v1.0.0
        </Typography>
      </Box>
    </>
  )

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          zIndex: 1400,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    )
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: 'none', md: 'block' },
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  )
})
