import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { uid } from './id'
import { cx } from '../components/ui'

interface ToastItem {
  id: string
  message: string
}

interface ToastApi {
  toast: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)
const TOAST_MS = 2800

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((message: string) => {
    const id = uid('toast')
    setItems((prev) => [...prev.slice(-3), { id, message }])
    window.setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), TOAST_MS)
  }, [])

  const api = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-8">
        {items.map((item) => (
          <div
            key={item.id}
            className={cx(
              'glass animate-rise pointer-events-auto flex max-w-sm items-center gap-2.5 !rounded-full border-white/20 !bg-slate-900/75 px-4 py-2.5 text-sm text-white shadow-glass-lift',
            )}
            role="status"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
            <span className="min-w-0 leading-snug">{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
