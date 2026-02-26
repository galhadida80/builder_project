import { useRef, useCallback } from 'react'
import { useToast } from '../components/common/ToastProvider'
import { shake } from '../utils/animations'

export function useFormShake() {
  const formRef = useRef<HTMLElement>(null)
  const { showError } = useToast()

  const triggerShake = useCallback((errorMessage?: string) => {
    if (formRef.current) {
      const el = formRef.current
      el.style.animation = 'none'
      void el.offsetHeight
      el.style.animation = `${shake.name} 500ms cubic-bezier(0.4, 0.0, 0.6, 1)`

      const onEnd = () => {
        el.style.animation = ''
        el.removeEventListener('animationend', onEnd)
      }
      el.addEventListener('animationend', onEnd)
    }

    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50])
    }

    if (errorMessage) {
      showError(errorMessage)
    }
  }, [showError])

  return { formRef, triggerShake }
}
