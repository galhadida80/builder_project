'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import HistoryIcon from '@mui/icons-material/History'
import { apiClient } from '@/lib/api/client'

interface AuditEntry {
  id: string
  action: string
  entityType: string
  user?: { fullName: string }
  createdAt: string
  details?: string
}

const ACTION_COLORS: Record<string, 'success' | 'warning' | 'error' | 'primary' | 'default'> = {
  create: 'success',
  update: 'warning',
  delete: 'error',
  approval: 'primary',
}

const PAGE_SIZE = 50

export default function AuditPage() {
  const t = useTranslations()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const loadAuditLogs = useCallback(async (currentOffset: number) => {
    try {
      setLoading(true)
      setError('')
      const response = await apiClient.get(`/audit?limit=${PAGE_SIZE}&offset=${currentOffset}`)
      const data = response.data || []
      setEntries(data)
      setHasMore(data.length >= PAGE_SIZE)
    } catch (err) {
      console.error('Failed to load audit logs:', err)
      setError('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAuditLogs(offset)
  }, [offset, loadAuditLogs])

  const handlePrev = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }

  const handleNext = () => {
    setOffset((prev) => prev + PAGE_SIZE)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  if (loading && entries.length === 0) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={350} height={24} sx={{ mb: 4 }} />
        <Skeleton variant="rounded" height={500} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
          {t('audit.title', { defaultValue: 'Audit Log' })}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('audit.subtitle', { defaultValue: 'Track all system activities and changes' })}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {entries.length === 0 && !loading ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              {t('audit.noEntries', { defaultValue: 'No audit entries yet' })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('audit.noEntriesDescription', { defaultValue: 'Activity will appear here as changes are made' })}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ borderRadius: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{t('audit.action', { defaultValue: 'Action' })}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('audit.entityType', { defaultValue: 'Entity Type' })}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('audit.user', { defaultValue: 'User' })}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('audit.date', { defaultValue: 'Date' })}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Chip
                        label={entry.action}
                        size="small"
                        color={ACTION_COLORS[entry.action] || 'default'}
                        sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {entry.entityType?.replace(/_/g, ' ')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {entry.user?.fullName || t('audit.system', { defaultValue: 'System' })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(entry.createdAt)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              {t('audit.page', { defaultValue: 'Page' })} {currentPage}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small" onClick={handlePrev} disabled={offset === 0}>
                <ChevronLeftIcon />
              </IconButton>
              <IconButton size="small" onClick={handleNext} disabled={!hasMore}>
                <ChevronRightIcon />
              </IconButton>
            </Box>
          </Box>
        </Card>
      )}
    </Box>
  )
}
