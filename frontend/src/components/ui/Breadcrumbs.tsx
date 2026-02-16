import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NavigateNextIcon, HomeIcon } from '@/icons'
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, Box, styled } from '@/mui'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  showHome?: boolean
}

const StyledBreadcrumbs = styled(MuiBreadcrumbs)(({ theme }) => ({
  '& .MuiBreadcrumbs-separator': {
    color: theme.palette.text.disabled,
  },
  '& .MuiBreadcrumbs-li': {
    display: 'flex',
    alignItems: 'center',
  },
}))

const StyledLink = styled(Link)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'color 150ms ease-out',
  cursor: 'pointer',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -2,
    insetInlineStart: 0,
    width: '100%',
    height: 2,
    backgroundColor: theme.palette.primary.main,
    transform: 'scaleX(0)',
    transformOrigin: 'start',
    transition: 'transform 200ms ease-out',
  },
  '&:hover': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&::after': {
      transform: 'scaleX(1)',
    },
  },
}))

const CurrentItem = styled(Typography)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: theme.palette.text.primary,
  fontSize: '0.875rem',
  fontWeight: 600,
}))

export function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleClick = (href?: string) => {
    if (href) {
      navigate(href)
    }
  }

  const allItems = showHome
    ? [{ label: t('nav.home'), href: '/dashboard', icon: <HomeIcon sx={{ fontSize: 18 }} /> }, ...items]
    : items

  return (
    <StyledBreadcrumbs
      separator={
        <NavigateNextIcon
          className="flip-rtl"
          sx={{
            fontSize: 18,
          }}
        />
      }
    >
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1

        if (isLast) {
          return (
            <CurrentItem key={item.label} aria-current="page">
              {item.icon}
              {item.label}
            </CurrentItem>
          )
        }

        return (
          <StyledLink
            key={`${item.label}-${item.href}`}
            href={item.href || '#'}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault()
              handleClick(item.href)
            }}
          >
            {item.icon}
            {item.label}
          </StyledLink>
        )
      })}
    </StyledBreadcrumbs>
  )
}

interface PageHeaderProps {
  title: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  subtitle?: string
}

export function PageHeader({ title, actions, subtitle }: PageHeaderProps) {
  return (
    <Box sx={{ mb: 3, maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: { xs: 1.5, sm: 2 },
      }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.2,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, flexWrap: 'wrap' }}>
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  )
}
