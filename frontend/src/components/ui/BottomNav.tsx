import { useLocation, useNavigate } from 'react-router-dom'
import { BottomNavigation, BottomNavigationAction, Paper, Box, styled } from '@/mui'

export interface BottomNavItem {
  label: string
  path: string
  icon: React.ReactNode
  badge?: number
}

interface BottomNavProps {
  items: BottomNavItem[]
  showLabels?: boolean
}

const StyledBottomNavigation = styled(BottomNavigation)(({ theme }) => ({
  height: 64,
  borderTop: `1px solid ${theme.palette.divider}`,
  '& .MuiBottomNavigationAction-root': {
    minWidth: 64,
    maxWidth: 120,
    padding: '6px 12px 8px',
    transition: 'background-color 200ms ease-out, color 200ms ease-out',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&.Mui-selected': {
      color: theme.palette.primary.main,
      '& .MuiBottomNavigationAction-label': {
        fontSize: '0.75rem',
        fontWeight: 600,
      },
    },
    '& .MuiBottomNavigationAction-label': {
      fontSize: '0.7rem',
      fontWeight: 500,
      marginTop: 4,
      '&.Mui-selected': {
        fontSize: '0.75rem',
      },
    },
  },
}))

export function BottomNav({ items, showLabels = true }: BottomNavProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const getCurrentValue = () => {
    const currentItem = items.find((item) => {
      if (item.path === '/projects' && location.pathname.startsWith('/projects')) {
        return location.pathname === '/projects'
      }
      return location.pathname.startsWith(item.path)
    })
    return currentItem?.path || items[0]?.path || ''
  }

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    navigate(newValue)
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        display: { xs: 'block', md: 'none' },
      }}
    >
      <StyledBottomNavigation
        value={getCurrentValue()}
        onChange={handleChange}
        showLabels={showLabels}
      >
        {items.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={
              item.badge !== undefined && item.badge > 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>{item.label}</span>
                  <Box
                    component="span"
                    sx={{
                      px: 0.5,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      minWidth: 16,
                      height: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    {item.badge}
                  </Box>
                </Box>
              ) : (
                item.label
              )
            }
            value={item.path}
            icon={item.icon}
          />
        ))}
      </StyledBottomNavigation>
    </Paper>
  )
}
