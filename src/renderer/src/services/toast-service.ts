import { useAppStore } from '@renderer/store/useAppStore'

type ToastType = 'info' | 'success' | 'error'

export function showToast(message: string, type: ToastType = 'info'): void {
  try {
    useAppStore.getState().showToast(message, type)
  } catch {
    // ignore
  }
}
