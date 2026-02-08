import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { slideInUp, fadeOut, duration, easing } from '@/utils/animations'

type ToastSeverity = 'success' | 'error' | 'warning' | 'info'

interface ToastContextType {
  showToast: (message: string, severity?: ToastSeverity) => void
  showError: (message: string) => void
  showSuccess: (message: string) => void
  showInfo: (message: string) => void
  showWarning: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  const { t } = useTranslation()
  if (!context) {
    throw new Error(t('errors.toastProviderError') || 'useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<ToastSeverity>('info')
  const [isExiting, setIsExiting] = useState(false)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string, sev: ToastSeverity = 'info') => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
    }
    setMessage(msg)
    setSeverity(sev)
    setIsExiting(false)
    setOpen(true)
  }, [])

  const showError = useCallback((msg: string) => {
    showToast(msg, 'error')
  }, [showToast])

  const showSuccess = useCallback((msg: string) => {
    showToast(msg, 'success')
  }, [showToast])

  const showInfo = useCallback((msg: string) => {
    showToast(msg, 'info')
  }, [showToast])

  const showWarning = useCallback((msg: string) => {
    showToast(msg, 'warning')
  }, [showToast])

  const handleClose = () => {
    setIsExiting(true)
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current)
    }
    exitTimerRef.current = setTimeout(() => {
      setOpen(false)
      setIsExiting(false)
      exitTimerRef.current = null
    }, duration.normal)
  }

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, showInfo, showWarning }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{
          '& .MuiSnackbarContent-root, & .MuiPaper-root': {
            animation: isExiting
              ? `${fadeOut} ${duration.normal}ms ${easing.accelerate} forwards`
              : `${slideInUp} ${duration.normal}ms ${easing.decelerate} forwards`,
          },
        }}
      >
        <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}
