import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Typography,
  Alert,
  useTheme,
  useMediaQuery,
} from '@/mui'
import type { ChipProps } from '@/mui'
import { DownloadIcon, ReceiptLongIcon } from '@/icons'
import { getDateLocale } from '../../utils/dateLocale'
import { DataTable } from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import { billingApi } from '@/api/billing'
import type { Invoice, InvoiceStatus } from '@/types'

interface InvoiceHistoryProps {
  organizationId?: string
  pageSize?: number
}

export function InvoiceHistory({ pageSize = 10 }: InvoiceHistoryProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await billingApi.getInvoices()
      setInvoices(data)
    } catch (err) {
      setError(t('billing.invoices.loadError') || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const blob = await billingApi.downloadInvoice(invoice.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoice.invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(t('billing.invoices.downloadError') || 'Failed to download invoice')
    }
  }

  const getStatusColor = (status: InvoiceStatus): ChipProps['color'] => {
    switch (status) {
      case 'paid':
        return 'success'
      case 'pending':
        return 'warning'
      case 'failed':
        return 'error'
      case 'refunded':
        return 'default'
      default:
        return 'default'
    }
  }

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat(getDateLocale(), {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    return new Intl.DateTimeFormat(getDateLocale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString))
  }

  const columns: Column<Invoice>[] = [
    {
      id: 'invoiceNumber',
      label: t('billing.invoices.invoiceNumber') || 'Invoice #',
      minWidth: 120,
      sortable: true,
      render: (invoice) => (
        <Typography variant="body2" fontWeight={500}>
          {invoice.invoiceNumber}
        </Typography>
      ),
    },
    {
      id: 'issuedAt',
      label: t('billing.invoices.date') || 'Date',
      minWidth: 120,
      sortable: true,
      hideOnMobile: false,
      render: (invoice) => (
        <Typography variant="body2">{formatDate(invoice.issuedAt)}</Typography>
      ),
    },
    {
      id: 'amount',
      label: t('billing.invoices.amount') || 'Amount',
      minWidth: 120,
      sortable: true,
      align: 'right',
      render: (invoice) => (
        <Typography variant="body2" fontWeight={600}>
          {formatCurrency(invoice.amount, invoice.currency)}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: t('billing.invoices.status') || 'Status',
      minWidth: 100,
      sortable: true,
      hideOnMobile: false,
      render: (invoice) => (
        <Chip
          label={t(`billing.invoices.statuses.${invoice.status}`) || invoice.status}
          color={getStatusColor(invoice.status)}
          size="small"
        />
      ),
    },
    {
      id: 'actions',
      label: t('common.actions') || 'Actions',
      minWidth: 80,
      align: 'center',
      render: (invoice) => (
        <Tooltip title={t('billing.invoices.download') || 'Download PDF'}>
          <IconButton
            size="small"
            onClick={() => handleDownloadInvoice(invoice)}
            aria-label={t('billing.invoices.download') || 'Download PDF'}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ]

  const renderMobileCard = (invoice: Invoice) => (
    <Box sx={{ p: 2, width: '100%' }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('billing.invoices.invoiceNumber') || 'Invoice #'}
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {invoice.invoiceNumber}
            </Typography>
          </Box>
          <Chip
            label={t(`billing.invoices.statuses.${invoice.status}`) || invoice.status}
            color={getStatusColor(invoice.status)}
            size="small"
          />
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('billing.invoices.date') || 'Date'}
            </Typography>
            <Typography variant="body2">{formatDate(invoice.issuedAt)}</Typography>
          </Box>
          <Box sx={{ textAlign: 'end' }}>
            <Typography variant="caption" color="text.secondary">
              {t('billing.invoices.amount') || 'Amount'}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatCurrency(invoice.amount, invoice.currency)}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" justifyContent="flex-end">
          <Tooltip title={t('billing.invoices.download') || 'Download PDF'}>
            <IconButton
              size="small"
              onClick={() => handleDownloadInvoice(invoice)}
              aria-label={t('billing.invoices.download') || 'Download PDF'}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  )

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={invoices}
        loading={loading}
        getRowId={(invoice) => invoice.id}
        renderMobileCard={isMobile ? renderMobileCard : undefined}
        pagination={true}
        pageSize={pageSize}
        emptyTitle={t('billing.invoices.empty.title') || 'No invoices yet'}
        emptyDescription={
          t('billing.invoices.empty.description') ||
          'Your billing history will appear here once you have invoices.'
        }
        emptyIcon={<ReceiptLongIcon sx={{ fontSize: 64, color: 'text.disabled' }} />}
        emptyVariant="no-data"
      />
    </Box>
  )
}
