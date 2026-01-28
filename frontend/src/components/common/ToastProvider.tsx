import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

type ToastSeverity = 'success' | 'error' | 'warning' | 'info'

interface ToastContextType {
  showToast: (message: string, severity?: ToastSeverity) => void
  showError: (message: string) => void
  showSuccess: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
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

  const showToast = useCallback((msg: string, sev: ToastSeverity = 'info') => {
    setMessage(msg)
    setSeverity(sev)
    setOpen(true)
  }, [])

  const showError = useCallback((msg: string) => {
    showToast(msg, 'error')
  }, [showToast])

  const showSuccess = useCallback((msg: string) => {
    showToast(msg, 'success')
  }, [showToast])

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}
