import { Box, Typography, Container, SxProps, Theme, useMediaQuery, useTheme } from '@mui/material'
import { alpha } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Button } from './ui/Button'

interface CTASectionProps {
  title?: string
  subtitle?: string
  description?: string
  primaryButtonText?: string
  secondaryButtonText?: string
  onPrimaryClick?: () => void
  onSecondaryClick?: () => void
  variant?: 'primary' | 'secondary' | 'dark'
  sx?: SxProps<Theme>
  fullWidth?: boolean
  backgroundImage?: string
  align?: 'left' | 'center' | 'right'
}

function getContainerStyles(
  theme: Theme,
  variant: 'primary' | 'secondary' | 'dark',
  backgroundImage?: string
): SxProps<Theme> {
  const baseStyles: SxProps<Theme> = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 4,
    py: { xs: 4, sm: 6, md: 8 },
    px: { xs: 2, sm: 3, md: 4 },
  }

  if (variant === 'primary') {
    return {
      ...baseStyles,
      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      color: '#fff',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: alpha('#fff', 0.05),
        transform: 'translate(100px, -50px)',
      },
    }
  }

  if (variant === 'secondary') {
    return {
      ...baseStyles,
      background: alpha(theme.palette.primary.main, 0.05),
      border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      color: theme.palette.text.primary,
    }
  }

  return {
    ...baseStyles,
    background: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[800],
    color: '#fff',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: backgroundImage ? `url(${backgroundImage})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      opacity: 0.1,
      borderRadius: 4,
    },
  }
}

export function CTASection({
  title = 'Ready to streamline your construction projects?',
  subtitle = 'Get Started Today',
  description = 'Join hundreds of construction managers who trust BuilderOps to deliver projects on time and within budget.',
  primaryButtonText = 'Get Started Free',
  secondaryButtonText = 'Learn More',
  onPrimaryClick,
  onSecondaryClick,
  variant = 'primary',
  sx,
  fullWidth = false,
  backgroundImage,
  align = 'center',
}: CTASectionProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const alignmentStyles = {
    left: { alignItems: 'flex-start', textAlign: 'left' as const },
    center: { alignItems: 'center', textAlign: 'center' as const },
    right: { alignItems: 'flex-end', textAlign: 'right' as const },
  }

  const containerStyles = getContainerStyles(theme, variant, backgroundImage)

  const containerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        ...alignmentStyles[align],
        gap: 2,
        position: 'relative',
        zIndex: 1,
      }}
    >
      {subtitle && (
        <Typography
          variant="overline"
          sx={{
            fontWeight: 700,
            letterSpacing: 1.5,
            opacity: 0.8,
          }}
        >
          {subtitle}
        </Typography>
      )}

      {title && (
        <Typography
          variant={isMobile ? 'h4' : 'h3'}
          sx={{
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: '600px',
          }}
        >
          {title}
        </Typography>
      )}

      {description && (
        <Typography
          variant="body1"
          sx={{
            opacity: 0.9,
            maxWidth: '500px',
            lineHeight: 1.6,
          }}
        >
          {description}
        </Typography>
      )}

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
          mt: 2,
        }}
      >
        <Button
          variant={variant === 'secondary' ? 'primary' : 'secondary'}
          size={isMobile ? 'medium' : 'large'}
          onClick={onPrimaryClick}
          endIcon={!isMobile && <ArrowForwardIcon />}
          sx={{
            minWidth: isMobile ? 'auto' : 180,
            fontWeight: 600,
          }}
        >
          {primaryButtonText}
        </Button>

        {secondaryButtonText && (
          <Button
            variant="tertiary"
            size={isMobile ? 'medium' : 'large'}
            onClick={onSecondaryClick}
            sx={{
              minWidth: isMobile ? 'auto' : 150,
              fontWeight: 600,
              color: variant === 'primary' ? 'inherit' : 'text.primary',
              '&:hover': {
                bgcolor: variant === 'primary' ? alpha('#fff', 0.15) : alpha('#000', 0.05),
              },
            }}
          >
            {secondaryButtonText}
          </Button>
        )}
      </Box>
    </Box>
  )

  if (fullWidth) {
    return (
      <Box sx={[containerStyles as object, ...(Array.isArray(sx) ? sx : [sx])]}>
        <Container maxWidth="lg">
          {containerContent}
        </Container>
      </Box>
    )
  }

  return (
    <Container maxWidth="lg" sx={sx}>
      <Box sx={containerStyles}>
        {containerContent}
      </Box>
    </Container>
  )
}

interface CTASectionGridProps {
  items: Array<{
    id: string
    icon: React.ReactNode
    title: string
    description: string
    onClick?: () => void
  }>
  sx?: SxProps<Theme>
}

export function CTASectionGrid({ items, sx }: CTASectionGridProps) {
  return (
    <Box sx={sx}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
        {items.map((item) => (
          <Box
            key={item.id}
            onClick={item.onClick}
            role={item.onClick ? 'button' : undefined}
            tabIndex={item.onClick ? 0 : undefined}
            onKeyDown={item.onClick ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                item.onClick?.()
              }
            } : undefined}
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              cursor: item.onClick ? 'pointer' : 'default',
              transition: 'box-shadow 200ms ease-out, border-color 200ms ease-out',
              '&:hover': item.onClick ? {
                boxShadow: (theme) => theme.shadows[4],
                borderColor: 'primary.main',
              } : {},
            }}
          >
            <Box sx={{ mb: 2, fontSize: 28 }}>
              {item.icon}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {item.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {item.description}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
