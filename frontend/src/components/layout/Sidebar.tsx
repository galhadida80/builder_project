import { memo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DashboardIcon, FolderIcon, BuildIcon, InventoryIcon, EventIcon, CheckCircleIcon, AccountTreeIcon, ContactsIcon, HistoryIcon, SettingsIcon, AssignmentIcon, ConstructionIcon, EmailIcon, ArchitectureIcon, ChecklistIcon, ReportProblemIcon, TaskAltIcon, AccountBalanceIcon, BusinessIcon, HelpOutlineIcon, ShowChartIcon, ExpandMoreIcon, ExpandLessIcon } from '@/icons'
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Typography, Collapse } from '@/mui'
import HelpDrawer from '../help/HelpDrawer'

const DRAWER_WIDTH = 260

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  tourId?: string
}

const mainNavItems: NavItem[] = [
  { label: 'nav.dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'nav.projects', path: '/projects', icon: <FolderIcon />, tourId: 'projects' },
  { label: 'nav.organizations', path: '/organizations', icon: <BusinessIcon /> },
]

interface NavGroup {
  label: string
  items: NavItem[]
}

const projectNavGroups: NavGroup[] = [
  {
    label: 'nav.groups.planning',
    items: [
      { label: 'nav.tasksAndApprovals', path: '/tasks', icon: <TaskAltIcon /> },
      { label: 'nav.budget', path: '/budget', icon: <AccountBalanceIcon /> },
      { label: 'nav.kpis', path: '/kpis', icon: <ShowChartIcon /> },
    ],
  },
  {
    label: 'nav.groups.field',
    items: [
      { label: 'nav.areas', path: '/areas', icon: <AccountTreeIcon /> },
      { label: 'nav.inspections', path: '/inspections', icon: <AssignmentIcon /> },
      { label: 'nav.defects', path: '/defects', icon: <ReportProblemIcon /> },
      { label: 'nav.checklists', path: '/checklists', icon: <ChecklistIcon /> },
    ],
  },
  {
    label: 'nav.groups.procurement',
    items: [
      { label: 'nav.equipment', path: '/equipment', icon: <BuildIcon />, tourId: 'equipment' },
      { label: 'nav.materials', path: '/materials', icon: <InventoryIcon />, tourId: 'materials' },
      { label: 'nav.rfis', path: '/rfis', icon: <EmailIcon /> },
    ],
  },
  {
    label: 'nav.groups.people',
    items: [
      { label: 'nav.contacts', path: '/contacts', icon: <ContactsIcon /> },
      { label: 'nav.meetings', path: '/meetings', icon: <EventIcon /> },
    ],
  },
  {
    label: 'nav.groups.documents',
    items: [
      { label: 'nav.blueprints', path: '/blueprints', icon: <ArchitectureIcon /> },
    ],
  },
]

const systemNavItems: NavItem[] = [
  { label: 'nav.auditLog', path: '/audit-log', icon: <HistoryIcon /> },
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
  const [helpOpen, setHelpOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

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
        data-tour="sidebar"
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
            outlineOffset: 2,
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
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }} data-tour={item.tourId}>
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
                  outlineOffset: 2,
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
          <Box sx={{ px: 1.5, py: 0 }}>
            {projectNavGroups.map((group) => {
              const isGroupActive = group.items.some(item => {
                const fullPath = `/projects/${projectId}${item.path}`
                return location.pathname.startsWith(fullPath)
              })
              const isExpanded = expandedGroups[group.label] ?? true

              return (
                <Box key={group.label} sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => setExpandedGroups(prev => ({ ...prev, [group.label]: !isExpanded }))}
                    sx={{
                      py: 0.5,
                      px: 2,
                      borderRadius: 1,
                      '&:focus-visible': {
                        outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        flex: 1,
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: isGroupActive ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      {t(group.label)}
                    </Typography>
                    {isExpanded
                      ? <ExpandLessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      : <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    }
                  </ListItemButton>
                  <Collapse in={isExpanded}>
                    <List sx={{ py: 0 }}>
                      {group.items.map((item) => {
                        const fullPath = `/projects/${projectId}${item.path}`
                        return (
                          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }} data-tour={item.tourId}>
                            <ListItemButton
                              selected={location.pathname.startsWith(fullPath)}
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
                                  outlineOffset: 2,
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
                  </Collapse>
                </Box>
              )
            })}
          </Box>
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
                  outlineOffset: 2,
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
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => setHelpOpen(true)}
            sx={{
              borderRadius: 2,
              py: 1,
              transition: 'all 200ms ease-out',
              '&:hover': { bgcolor: 'action.hover' },
              '&:focus-visible': {
                outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
              <HelpOutlineIcon />
            </ListItemIcon>
            <ListItemText
              primary={t('help.title')}
              primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
            />
          </ListItemButton>
        </ListItem>
      </List>

      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />

      <Box sx={{ p: 2, pt: 0 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
            fontSize: '0.65rem',
          }}
        >
          {import.meta.env.VITE_APP_VERSION || 'v1.0.0'}
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
          borderInlineEnd: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  )
})
