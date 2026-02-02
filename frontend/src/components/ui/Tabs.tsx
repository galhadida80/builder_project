import { useState } from 'react'
import { Tabs as MuiTabs, Tab as MuiTab, Box } from '@mui/material'
import { styled } from '@mui/material/styles'

interface TabItem {
  label: string
  value: string
  icon?: React.ReactNode
  disabled?: boolean
  badge?: number
}

interface TabsProps {
  items: TabItem[]
  value?: string
  onChange?: (value: string) => void
  variant?: 'standard' | 'fullWidth' | 'scrollable'
  size?: 'small' | 'medium'
}

const StyledTabs = styled(MuiTabs)(({ theme }) => ({
  minHeight: 44,
  '& .MuiTabs-indicator': {
    height: 3,
    borderRadius: '3px 3px 0 0',
    // RTL-safe: MUI Tabs automatically positions indicator based on theme.direction
  },
  '& .MuiTab-root': {
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.875rem',
    minHeight: 44,
    transition: 'all 150ms ease-out',
    '&:hover': {
      color: theme.palette.primary.main,
      backgroundColor: theme.palette.action.hover,
    },
    '&.Mui-selected': {
      fontWeight: 600,
    },
  },
}))

const PillTabs = styled(MuiTabs)(({ theme }) => ({
  minHeight: 40,
  padding: 4,
  backgroundColor: theme.palette.action.hover,
  borderRadius: 10,
  '& .MuiTabs-indicator': {
    display: 'none',
  },
  '& .MuiTab-root': {
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.8rem',
    minHeight: 32,
    borderRadius: 6,
    transition: 'all 150ms ease-out',
    '&.Mui-selected': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[1],
      fontWeight: 600,
    },
  },
}))

export function Tabs({ items, value, onChange, variant = 'standard', size = 'medium' }: TabsProps) {
  const [internalValue, setInternalValue] = useState(items[0]?.value || '')
  const currentValue = value ?? internalValue

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    setInternalValue(newValue)
    onChange?.(newValue)
  }

  return (
    <StyledTabs
      value={currentValue}
      onChange={handleChange}
      variant={variant}
      sx={{
        minHeight: size === 'small' ? 36 : 44,
        '& .MuiTab-root': {
          minHeight: size === 'small' ? 36 : 44,
          py: size === 'small' ? 0.5 : 1,
        },
      }}
    >
      {items.map((item) => (
        <MuiTab
          key={item.value}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <Box
                  component="span"
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    minWidth: 18,
                    textAlign: 'center',
                  }}
                >
                  {item.badge}
                </Box>
              )}
            </Box>
          }
          value={item.value}
          disabled={item.disabled}
        />
      ))}
    </StyledTabs>
  )
}

export function SegmentedTabs({ items, value, onChange }: Omit<TabsProps, 'variant' | 'size'>) {
  const [internalValue, setInternalValue] = useState(items[0]?.value || '')
  const currentValue = value ?? internalValue

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    setInternalValue(newValue)
    onChange?.(newValue)
  }

  return (
    <PillTabs value={currentValue} onChange={handleChange}>
      {items.map((item) => (
        <MuiTab
          key={item.value}
          label={item.label}
          value={item.value}
          disabled={item.disabled}
          icon={item.icon as React.ReactElement}
          iconPosition="start"
        />
      ))}
    </PillTabs>
  )
}

interface TabPanelProps {
  children?: React.ReactNode
  value: string
  activeValue: string
}

export function TabPanel({ children, value, activeValue }: TabPanelProps) {
  if (value !== activeValue) return null
  return <Box sx={{ pt: 2 }}>{children}</Box>
}
