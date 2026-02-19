import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { CloseIcon } from '@/icons'
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box, Typography, styled } from '@/mui'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  actions?: React.ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  hideCloseButton?: boolean
}

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    boxShadow: theme.shadows[8],
    overflow: 'hidden',
    maxHeight: 'calc(100% - 64px)',
    display: 'flex',
    flexDirection: 'column',
  },
  '& .MuiBackdrop-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
  },
}))

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
}))

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(3),
  overflowY: 'auto',
  flex: 1,
}))

const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  borderTop: `1px solid ${theme.palette.divider}`,
  gap: theme.spacing(1),
}))

export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  hideCloseButton = false,
}: ModalProps) {
  const { t } = useTranslation()
  return (
    <StyledDialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth={fullWidth}>
      {title && (
        <StyledDialogTitle>
          <Typography variant="h6" component="div" fontWeight={600}>
            {title}
          </Typography>
          {!hideCloseButton && (
            <IconButton onClick={onClose} size="small" aria-label={t('common.closeDialog')} sx={{ marginInlineStart: 2 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </StyledDialogTitle>
      )}
      <StyledDialogContent>{children}</StyledDialogContent>
      {actions && <StyledDialogActions>{actions}</StyledDialogActions>}
    </StyledDialog>
  )
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  const { t } = useTranslation()
  const resolvedConfirmLabel = confirmLabel || t('common.confirm')
  const resolvedCancelLabel = cancelLabel || t('common.cancel')
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="xs"
      actions={
        <>
          <Button variant="tertiary" onClick={onClose} disabled={loading}>
            {resolvedCancelLabel}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {resolvedConfirmLabel}
          </Button>
        </>
      }
    >
      <Typography color="text.secondary">{message}</Typography>
    </Modal>
  )
}

interface FormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  title: string
  children: React.ReactNode
  submitLabel?: string
  cancelLabel?: string
  loading?: boolean
  submitDisabled?: boolean
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export function FormModal({
  open,
  onClose,
  onSubmit,
  title,
  children,
  submitLabel,
  cancelLabel,
  loading = false,
  submitDisabled = false,
  maxWidth = 'sm',
}: FormModalProps) {
  const { t } = useTranslation()
  const resolvedSubmitLabel = submitLabel || t('common.save')
  const resolvedCancelLabel = cancelLabel || t('common.cancel')
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth={maxWidth}
      actions={
        <>
          <Button variant="tertiary" onClick={onClose} disabled={loading}>
            {resolvedCancelLabel}
          </Button>
          <Button variant="primary" onClick={onSubmit} loading={loading} disabled={submitDisabled}>
            {resolvedSubmitLabel}
          </Button>
        </>
      }
    >
      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {children}
      </Box>
    </Modal>
  )
}
