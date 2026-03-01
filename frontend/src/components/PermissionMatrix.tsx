import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { permissionsApi, type PermissionMatrixResponse, type UserPermissionSummary } from '../api/permissions'
import { EmptyState } from './ui/EmptyState'
import { Button } from './ui/Button'
import {
  Box,
  Paper,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Skeleton,
  Alert,
  Tooltip,
  styled,
  alpha,
  useTheme
} from '@/mui'
import {
  CheckCircleIcon,
  CancelIcon,
  RefreshIcon,
  FileDownloadIcon,
  SecurityIcon,
  PeopleIcon
} from '@/icons'

interface PermissionMatrixProps {
  projectId: string
  onExport?: () => void
}

// All possible permissions
const ALL_PERMISSIONS = ['create', 'edit', 'delete', 'approve', 'view_all', 'manage_members', 'manage_settings']

// Styled components following MUI theme patterns
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 12,
  transition: 'all 200ms ease-out',
}))

const ToolbarBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: alpha(theme.palette.primary.main, 0.03),
  borderRadius: 8,
  gap: theme.spacing(2),
  flexWrap: 'wrap',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}))

const TitleBox = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}))

const ActionsBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    '& > *': {
      flex: 1,
    },
  },
}))

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  maxHeight: 600,
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  '& .MuiTableCell-head': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    fontWeight: 600,
    borderBottom: `2px solid ${theme.palette.divider}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  '& .MuiTableCell-body': {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
  },
  '& .MuiTableRow-root:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
  },
}))

const UserCell = styled(TableCell)(({ theme }) => ({
  position: 'sticky',
  left: 0,
  backgroundColor: theme.palette.background.paper,
  zIndex: 5,
  borderRight: `2px solid ${theme.palette.divider}`,
  minWidth: 200,
  '& .MuiTableRow-root:hover &': {
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
  },
}))

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
}))

const PermissionCell = styled(TableCell)(() => ({
  textAlign: 'center',
  minWidth: 100,
}))

export default function PermissionMatrix({ projectId, onExport }: PermissionMatrixProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [data, setData] = useState<PermissionMatrixResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatrix = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await permissionsApi.getMatrix(projectId)
      setData(response)
    } catch (err) {
      setError(t('permissionMatrix.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [projectId, t])

  useEffect(() => {
    fetchMatrix()
  }, [fetchMatrix])

  const handleRefresh = () => {
    fetchMatrix()
  }

  const handleExport = () => {
    onExport?.()
  }

  const hasPermission = (user: UserPermissionSummary, permission: string): boolean => {
    return user.effectivePermissions.includes(permission)
  }

  // Loading state
  if (loading) {
    return (
      <StyledPaper>
        <LoadingContainer>
          <Skeleton variant="rectangular" height={60} />
          <Skeleton variant="rectangular" height={400} />
        </LoadingContainer>
      </StyledPaper>
    )
  }

  // Error state
  if (error) {
    return (
      <StyledPaper>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="primary" icon={<RefreshIcon />} onClick={handleRefresh}>
          {t('permissionMatrix.refreshMatrix')}
        </Button>
      </StyledPaper>
    )
  }

  // Empty state
  if (!data || data.members.length === 0) {
    return (
      <StyledPaper>
        <EmptyState
          icon={<PeopleIcon sx={{ fontSize: 64, color: 'text.secondary' }} />}
          title={t('permissionMatrix.noUsers')}
          description={t('permissionMatrix.noUsersDesc')}
        />
      </StyledPaper>
    )
  }

  return (
    <StyledPaper>
      <ToolbarBox>
        <TitleBox>
          <SecurityIcon sx={{ color: 'primary.main' }} />
          <Box>
            <Typography variant="h6" component="h2">
              {t('permissionMatrix.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('permissionMatrix.subtitle')}
            </Typography>
          </Box>
        </TitleBox>
        <ActionsBox>
          <Button
            variant="secondary"
            icon={<RefreshIcon />}
            onClick={handleRefresh}
            size="small"
          >
            {t('permissionMatrix.refreshMatrix')}
          </Button>
          {onExport && (
            <Button
              variant="secondary"
              icon={<FileDownloadIcon />}
              onClick={handleExport}
              size="small"
            >
              {t('permissionMatrix.exportMatrix')}
            </Button>
          )}
        </ActionsBox>
      </ToolbarBox>

      <StyledTableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <UserCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  {t('permissionMatrix.user')}
                </Typography>
              </UserCell>
              {ALL_PERMISSIONS.map((permission) => (
                <PermissionCell key={permission}>
                  <Tooltip title={t(`permissions.${permission}`, permission.replace('_', ' '))}>
                    <Typography variant="subtitle2" fontWeight={600} noWrap>
                      {t(`permissions.${permission}`, permission.replace('_', ' '))}
                    </Typography>
                  </Tooltip>
                </PermissionCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.members.map((user) => (
              <TableRow key={user.userId} hover>
                <UserCell>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {user.userName || user.email}
                    </Typography>
                    {user.userName && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {user.email}
                      </Typography>
                    )}
                    {user.role && (
                      <Chip
                        label={t(`roles.${user.role}`, user.role.replace('_', ' '))}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{
                          mt: 0.5,
                          height: 20,
                          fontSize: '0.7rem',
                          textTransform: 'capitalize'
                        }}
                      />
                    )}
                  </Box>
                </UserCell>
                {ALL_PERMISSIONS.map((permission) => {
                  const granted = hasPermission(user, permission)
                  return (
                    <PermissionCell key={`${user.userId}-${permission}`}>
                      <Tooltip
                        title={
                          granted
                            ? t('permissionMatrix.granted')
                            : t('permissionMatrix.notGranted')
                        }
                      >
                        {granted ? (
                          <CheckCircleIcon
                            sx={{
                              color: 'success.main',
                              fontSize: 20
                            }}
                          />
                        ) : (
                          <CancelIcon
                            sx={{
                              color: alpha(theme.palette.text.disabled, 0.3),
                              fontSize: 20
                            }}
                          />
                        )}
                      </Tooltip>
                    </PermissionCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>
    </StyledPaper>
  )
}
