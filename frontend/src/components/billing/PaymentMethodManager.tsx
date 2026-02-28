import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../ui/EmptyState'
import { billingApi } from '../../api/billing'
import { useToast } from '../common/ToastProvider'
import { useAuth } from '../../contexts/AuthContext'
import {
  AccountBalanceIcon,
  AddCircleOutlineIcon,
  DeleteIcon,
  CheckCircleIcon,
} from '@/icons'
import {
  Box,
  Typography,
  Skeleton,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  IconButton,
  useTheme,
} from '@/mui'
import type { PaymentMethod } from '../../types'

export function PaymentMethodManager() {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const { user } = useAuth()
  const theme = useTheme()
  const [loading, setLoading] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [removing, setRemoving] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      const methods = await billingApi.getPaymentMethods()
      setPaymentMethods(methods)
    } catch (error) {
      showError(t('billing.paymentMethods.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleAddPaymentMethod = () => {
    setAddDialogOpen(true)
  }

  const handleRemovePaymentMethod = async () => {
    if (!selectedMethod) return

    try {
      setRemoving(true)
      await billingApi.removePaymentMethod(selectedMethod.id)
      showSuccess(t('billing.paymentMethods.removedSuccessfully'))
      setRemoveDialogOpen(false)
      setSelectedMethod(null)
      await loadPaymentMethods()
    } catch (error) {
      showError(t('billing.paymentMethods.failedToRemove'))
    } finally {
      setRemoving(false)
    }
  }

  const openRemoveDialog = (method: PaymentMethod) => {
    setSelectedMethod(method)
    setRemoveDialogOpen(true)
  }

  const closeRemoveDialog = () => {
    setRemoveDialogOpen(false)
    setSelectedMethod(null)
  }

  const closeAddDialog = () => {
    setAddDialogOpen(false)
  }

  const getCardBrandDisplay = (brand?: string) => {
    if (!brand) return t('billing.paymentMethods.card')
    const brandMap: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      diners: 'Diners Club',
      jcb: 'JCB',
      unionpay: 'UnionPay',
    }
    return brandMap[brand.toLowerCase()] || brand
  }

  const getCardIcon = (type?: string) => {
    if (type === 'bank_transfer') {
      return <AccountBalanceIcon sx={{ fontSize: 32, color: 'primary.main' }} />
    }
    return <AccountBalanceIcon sx={{ fontSize: 32, color: 'primary.main' }} />
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={120}
              sx={{ borderRadius: 3 }}
            />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            {t('billing.paymentMethods.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('billing.paymentMethods.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={handleAddPaymentMethod}
          sx={{
            minWidth: { xs: '100%', sm: 'auto' },
          }}
        >
          {t('billing.paymentMethods.addCard')}
        </Button>
      </Box>

      {paymentMethods.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {paymentMethods.map((method) => (
            <Card
              key={method.id}
              sx={{
                borderRadius: 3,
                border: method.isDefault
                  ? `2px solid ${theme.palette.primary.main}`
                  : '1px solid',
                borderColor: method.isDefault
                  ? 'primary.main'
                  : 'divider',
              }}
            >
              <CardContent
                sx={{
                  p: 3,
                  '&:last-child': { pb: 3 },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {getCardIcon(method.type)}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {method.type === 'card'
                            ? getCardBrandDisplay(method.cardBrand)
                            : t('billing.paymentMethods.bankTransfer')}
                        </Typography>
                        {method.isDefault && (
                          <Chip
                            label={t('billing.paymentMethods.default')}
                            size="small"
                            color="primary"
                            icon={<CheckCircleIcon />}
                            sx={{ fontWeight: 500 }}
                          />
                        )}
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          gap: { xs: 0.5, sm: 2 },
                        }}
                      >
                        {method.cardLast4 && (
                          <Typography variant="body2" color="text.secondary">
                            {t('billing.paymentMethods.endingIn', {
                              last4: method.cardLast4,
                            })}
                          </Typography>
                        )}
                        {method.cardExpMonth && method.cardExpYear && (
                          <Typography variant="body2" color="text.secondary">
                            {t('billing.paymentMethods.expires', {
                              month: String(method.cardExpMonth).padStart(2, '0'),
                              year: String(method.cardExpYear).slice(-2),
                            })}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                  <IconButton
                    color="error"
                    onClick={() => openRemoveDialog(method)}
                    disabled={method.isDefault && paymentMethods.length === 1}
                    sx={{
                      '&:hover': {
                        bgcolor: 'error.light',
                        color: 'white',
                      },
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <EmptyState
          title={t('billing.paymentMethods.noMethods')}
          description={t('billing.paymentMethods.noMethodsDescription')}
          icon={<AccountBalanceIcon sx={{ color: 'text.secondary' }} />}
          action={{
            label: t('billing.paymentMethods.addFirstCard'),
            onClick: handleAddPaymentMethod,
          }}
        />
      )}

      {/* Remove Payment Method Dialog */}
      <Dialog open={removeDialogOpen} onClose={closeRemoveDialog}>
        <DialogTitle>
          {t('billing.paymentMethods.removeDialogTitle')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('billing.paymentMethods.removeDialogMessage', {
              card: selectedMethod?.cardLast4
                ? `${getCardBrandDisplay(selectedMethod.cardBrand)} ending in ${selectedMethod.cardLast4}`
                : t('billing.paymentMethods.thisMethod'),
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRemoveDialog} disabled={removing}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleRemovePaymentMethod}
            color="error"
            variant="contained"
            disabled={removing}
          >
            {removing ? t('common.removing') : t('common.remove')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Payment Method Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={closeAddDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('billing.paymentMethods.addCardTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('billing.paymentMethods.addCardDescription')}
            </Typography>
            <Box
              sx={{
                p: 3,
                bgcolor: 'action.hover',
                borderRadius: 2,
                textAlign: 'center',
              }}
            >
              <Typography variant="body1" color="text.secondary">
                {t('billing.paymentMethods.integrationPlaceholder')}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: 'block' }}
              >
                {t('billing.paymentMethods.stripeOrPayPlus')}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAddDialog}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
