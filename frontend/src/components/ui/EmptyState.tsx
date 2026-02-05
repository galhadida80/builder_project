import { Box, Typography, SxProps, Theme } from '@mui/material'
import { styled } from '@mui/material/styles'
import InboxIcon from '@mui/icons-material/Inbox'
import SearchOffIcon from '@mui/icons-material/SearchOff'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import FolderOffIcon from '@mui/icons-material/FolderOff'
import { Button } from './Button'
import { createFadeIn, duration } from '../../utils/animations'

export type EmptyStateVariant = 'empty' | 'no-results' | 'error' | 'no-data' | 'not-found'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  sx?: SxProps<Theme>
}

const Container = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(6),
  textAlign: 'center',
  ...createFadeIn(true, duration.normal),
}))

const IconContainer = styled(Box)(({ theme }) => ({
  width: 80,
  height: 80,
  borderRadius: '50%',
  backgroundColor: theme.palette.action.hover,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
  '& .MuiSvgIcon-root': {
    fontSize: 40,
    color: theme.palette.text.secondary,
  },
}))

const defaultContent: Record<EmptyStateVariant, { icon: React.ReactNode; title: string; description: string }> = {
  empty: {
    icon: <InboxIcon />,
    title: 'No data yet',
    description: 'Get started by creating your first item.',
  },
  'no-results': {
    icon: <SearchOffIcon />,
    title: 'No results found',
    description: 'Try adjusting your search or filter criteria.',
  },
  'no-data': {
    icon: <InboxIcon />,
    title: 'No data available',
    description: 'There is no data to display at this time.',
  },
  'not-found': {
    icon: <FolderOffIcon />,
    title: 'Not found',
    description: 'The requested item could not be found.',
  },
  error: {
    icon: <ErrorOutlineIcon />,
    title: 'Something went wrong',
    description: 'We encountered an error while loading the data.',
  },
}

export function EmptyState({
  variant = 'empty',
  title,
  description,
  icon,
  action,
  secondaryAction,
  sx,
}: EmptyStateProps) {
  const content = defaultContent[variant]

  return (
    <Container sx={sx}>
      <IconContainer>{icon || content.icon}</IconContainer>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          color: 'text.primary',
          mb: 0.5,
        }}
      >
        {title || content.title}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          maxWidth: 320,
          mb: action ? 3 : 0,
        }}
      >
        {description || content.description}
      </Typography>
      {(action || secondaryAction) && (
        <Box sx={{ display: 'flex', gap: 2 }}>
          {action && (
            <Button variant="primary" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </Box>
      )}
    </Container>
  )
}

interface NoProjectSelectedProps {
  onSelectProject?: () => void
}

export function NoProjectSelected({ onSelectProject }: NoProjectSelectedProps) {
  return (
    <EmptyState
      title="No Project Selected"
      description="Select a project from the dropdown above to view its details and manage resources."
      action={onSelectProject ? { label: 'Select Project', onClick: onSelectProject } : undefined}
    />
  )
}

interface LoadingErrorProps {
  onRetry?: () => void
  message?: string
}

export function LoadingError({ onRetry, message }: LoadingErrorProps) {
  return (
    <EmptyState
      variant="error"
      description={message}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  )
}
