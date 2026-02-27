import { useState } from 'react'
import { Tabs as MuiTabs, Tab as MuiTab, Box, styled } from '@/mui'

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
  minHeight: 40,
  borderBottom: `1px solid ${theme.palette.divider}`,
  '& .MuiTabs-indicator': {
    height: 2,
    borderRadius: '2px 2px 0 0',
    backgroundColor: theme.palette.primary.main,
  },
  '& .MuiTab-root': {
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.8rem',
    minHeight: 40,
    padding: '8px 16px',
    transition: 'color 150ms',
    '&:hover': {
      color: theme.palette.primary.main,
    },
    '&.Mui-selected': {
      fontWeight: 700,
      color: theme.palette.primary.main,
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
    transition: 'background-color 150ms, box-shadow 150ms',
    '&.Mui-selected': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[1],
      fontWeight: 600,
    },
  },
}))

export function Tabs({ items, value, onChange, variant = 'scrollable', size = 'medium' }: TabsProps) {
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
      scrollButtons="auto"
      sx={{
        minHeight: size === 'small' ? 36 : 40,
        '& .MuiTab-root': {
          minHeight: size === 'small' ? 36 : 40,
          py: size === 'small' ? 0.5 : 1,
        },
      }}
    >
      {items.map((item) => (
        <MuiTab
          key={item.value}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <Box
                  component="span"
                  sx={{
                    px: 0.5,
                    py: 0.125,
                    borderRadius: 1,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    minWidth: 16,
                    textAlign: 'center',
                    lineHeight: 1.4,
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
