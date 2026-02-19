import { useTranslation } from 'react-i18next'
import { forwardRef } from 'react'
import { Button } from '../ui/Button'
import { CloseIcon } from '@/icons'
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box, Typography, Fade, Grow, styled } from '@/mui'
import type { TransitionProps } from '@/mui'

interface AnimatedModalProps {
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

// Combined Fade+Grow transition component
const FadeGrowTransition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>
  },
  ref: React.Ref<unknown>
) {
  return (
    <Fade in={props.in} timeout={300}>
      <Grow ref={ref} {...props} timeout={200} />
    </Fade>
  )
})

export function AnimatedModal({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  hideCloseButton = false,
}: AnimatedModalProps) {
  const { t } = useTranslation()
  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      TransitionComponent={FadeGrowTransition}
    >
      {title && (
        <StyledDialogTitle>
          <Typography variant="h6" component="div" fontWeight={600}>
            {title}
          </Typography>
          {!hideCloseButton && (
            <IconButton onClick={onClose} size="small" aria-label={t('common.closeDialog')} sx={{ ml: 2 }}>
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

interface AnimatedConfirmModalProps {
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

export function AnimatedConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: AnimatedConfirmModalProps) {
  return (
    <AnimatedModal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="xs"
      actions={
        <>
          <Button variant="tertiary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Typography color="text.secondary">{message}</Typography>
    </AnimatedModal>
  )
}

interface AnimatedFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  title: string
  children: React.ReactNode
  submitLabel?: string
  cancelLabel?: string
  loading?: boolean
  submitDisabled?: boolean
}

export function AnimatedFormModal({
  open,
  onClose,
  onSubmit,
  title,
  children,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  submitDisabled = false,
}: AnimatedFormModalProps) {
  return (
    <AnimatedModal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      actions={
        <>
          <Button variant="tertiary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onSubmit} loading={loading} disabled={submitDisabled}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {children}
      </Box>
    </AnimatedModal>
  )
}
