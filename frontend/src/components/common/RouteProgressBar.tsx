import { LinearProgress, styled, Fade } from '@/mui'

interface RouteProgressBarProps {
  /** Whether navigation is currently in progress */
  loading?: boolean
  /** Progress value from 0 to 100 */
  progress?: number
}

const StyledProgressContainer = styled('div')(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 9999,
  height: 3,
}))

const StyledLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 3,
  backgroundColor: 'transparent',
  '& .MuiLinearProgress-bar': {
    backgroundColor: theme.palette.primary.main,
  },
}))

/**
 * RouteProgressBar component
 *
 * Displays a fixed progress bar at the top of the viewport during route transitions.
 * Provides visual feedback to users when navigating between pages.
 *
 * @example
 * ```tsx
 * const { isLoading, progress } = useRouteProgress()
 *
 * return <RouteProgressBar loading={isLoading} progress={progress} />
 * ```
 */
export function RouteProgressBar({ loading = false, progress = 0 }: RouteProgressBarProps) {
  // Normalize progress value to ensure 0-100 range
  const normalizedProgress = Math.min(100, Math.max(0, progress))

  return (
    <Fade in={loading} timeout={{ enter: 0, exit: 200 }} unmountOnExit>
      <StyledProgressContainer>
        <StyledLinearProgress variant="determinate" value={normalizedProgress} color="primary" />
      </StyledProgressContainer>
    </Fade>
  )
}
