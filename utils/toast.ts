import { toast } from 'vue-sonner'

export const TOAST_CONFIG = {
  success: { background: '#6ee7b7' },
  error: { background: '#fda4af' }
} as const

export const TOAST_DURATION = 3000

export const showSuccessToast = (message: string) => {
  toast.message(message, {
    style: TOAST_CONFIG.success,
    duration: TOAST_DURATION
  })
}

export const showErrorToast = (message: string) => {
  toast.error(message, {
    style: TOAST_CONFIG.error,
    duration: TOAST_DURATION
  })
}

