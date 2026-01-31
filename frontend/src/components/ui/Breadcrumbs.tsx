import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import HomeIcon from '@mui/icons-material/Home'

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
  '&:hover': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
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

  const handleClick = (href?: string) => {
    if (href) {
      navigate(href)
    }
  }

  const allItems = showHome
    ? [{ label: 'Home', href: '/dashboard', icon: <HomeIcon sx={{ fontSize: 18 }} /> }, ...items]
    : items

  return (
    <StyledBreadcrumbs separator={<NavigateNextIcon sx={{ fontSize: 18 }} />}>
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1

        if (isLast) {
          return (
            <CurrentItem key={item.label}>
              {item.icon}
              {item.label}
            </CurrentItem>
          )
        }

        return (
          <StyledLink key={item.label} onClick={() => handleClick(item.href)}>
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

export function PageHeader({ title, breadcrumbs, actions, subtitle }: PageHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Breadcrumbs items={breadcrumbs} />
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.2,
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
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>}
      </Box>
    </Box>
  )
}
