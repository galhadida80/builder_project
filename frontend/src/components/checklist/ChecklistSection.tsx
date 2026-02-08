import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Collapse from '@mui/material/Collapse'
import LinearProgress from '@mui/material/LinearProgress'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { styled } from '@mui/material'
import type { ChecklistSubSection, ChecklistItemTemplate, ChecklistItemResponse } from '../../types'

interface ChecklistSectionProps {
  section: ChecklistSubSection
  responses?: ChecklistItemResponse[]
  defaultExpanded?: boolean
  onItemClick?: (item: ChecklistItemTemplate) => void
}

const SectionContainer = styled(Box)(({ theme }) => ({
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  marginBottom: theme.spacing(2),
  transition: 'all 200ms ease-out',
  '&:hover': {
    boxShadow: theme.shadows[2],
  },
}))

const SectionHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  cursor: 'pointer',
  backgroundColor: theme.palette.background.paper,
  transition: 'background-color 150ms ease-out',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
  },
}))

const ItemRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5, 2),
  borderTop: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  transition: 'background-color 150ms ease-out',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
  },
}))

export function ChecklistSection({
  section,
  responses = [],
  defaultExpanded = false,
  onItemClick,
}: ChecklistSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // Calculate completion progress
  const totalItems = section.items?.length || 0
  const completedItems = section.items?.filter((item) => {
    const response = responses.find((r) => r.itemTemplateId === item.id)
    return response && response.status !== 'pending'
  }).length || 0

  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  const isComplete = completedItems === totalItems && totalItems > 0

  const getItemStatus = (itemId: string): ChecklistItemResponse | undefined => {
    return responses.find((r) => r.itemTemplateId === itemId)
  }

  const isItemComplete = (itemId: string): boolean => {
    const response = getItemStatus(itemId)
    return !!response && response.status !== 'pending'
  }

  const handleToggle = () => {
    setExpanded(!expanded)
  }

  const handleItemClick = (item: ChecklistItemTemplate) => {
    if (onItemClick) {
      onItemClick(item)
    }
  }

  return (
    <SectionContainer>
      <SectionHeader
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={handleToggle}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle() }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: isComplete ? 'success.main' : 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {section.order}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {section.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {completedItems} of {totalItems} items completed
              </Typography>
              {isComplete && (
                <Chip
                  size="small"
                  icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                  label="Complete"
                  color="success"
                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                />
              )}
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ minWidth: 80, textAlign: 'right' }}>
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{
                color: isComplete ? 'success.main' : 'primary.main',
              }}
            >
              {progressPercent}%
            </Typography>
          </Box>
          <IconButton
            size="small"
            sx={{
              transition: 'transform 200ms ease-out',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </SectionHeader>

      {/* Progress bar */}
      <LinearProgress
        variant="determinate"
        value={progressPercent}
        sx={{
          height: 4,
          backgroundColor: 'action.hover',
          '& .MuiLinearProgress-bar': {
            backgroundColor: isComplete ? 'success.main' : 'primary.main',
          },
        }}
      />

      {/* Items list */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ bgcolor: 'background.default' }}>
          {section.items && section.items.length > 0 ? (
            section.items.map((item) => {
              const itemComplete = isItemComplete(item.id)
              const response = getItemStatus(item.id)

              return (
                <ItemRow
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleItemClick(item)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleItemClick(item) }
                  }}
                >
                  <Box>
                    {itemComplete ? (
                      <CheckCircleIcon
                        sx={{
                          fontSize: 24,
                          color: 'success.main',
                        }}
                      />
                    ) : (
                      <RadioButtonUncheckedIcon
                        sx={{
                          fontSize: 24,
                          color: 'text.secondary',
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{
                        color: itemComplete ? 'text.secondary' : 'text.primary',
                        textDecoration: itemComplete ? 'line-through' : 'none',
                      }}
                    >
                      {item.name}
                    </Typography>
                    {item.description && (
                      <Typography variant="caption" color="text.secondary">
                        {item.description}
                      </Typography>
                    )}
                    {response && response.status && (
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          size="small"
                          label={response.status}
                          color={
                            response.status === 'pass'
                              ? 'success'
                              : response.status === 'fail'
                              ? 'error'
                              : response.status === 'na'
                              ? 'default'
                              : 'info'
                          }
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {item.mustImage && (
                      <Chip
                        size="small"
                        label="Photo"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          bgcolor: 'info.light',
                          color: 'info.dark',
                        }}
                      />
                    )}
                    {item.mustNote && (
                      <Chip
                        size="small"
                        label="Note"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          bgcolor: 'warning.light',
                          color: 'warning.dark',
                        }}
                      />
                    )}
                    {item.mustSignature && (
                      <Chip
                        size="small"
                        label="Signature"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          bgcolor: 'secondary.light',
                          color: 'secondary.dark',
                        }}
                      />
                    )}
                  </Box>
                </ItemRow>
              )
            })
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No items in this section
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </SectionContainer>
  )
}
