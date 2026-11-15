import { useEffect, type HTMLAttributes, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Eye, Loader2, Timer, X } from 'lucide-react'
import type { Severity } from '../types'
import { useI18n } from '../i18n'

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

const STAGGER_FACTOR = 0.5
const STAGGER_CAP_MS = 240

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  delay?: number
}

export const GlassCard = ({ interactive, delay = 0, className, style, children, ...rest }: CardProps) => (
  <div
    className={cx('glass animate-rise', interactive && 'glass-interactive', className)}
    style={{ animationDelay: `${Math.min(delay, STAGGER_CAP_MS) * STAGGER_FACTOR}ms`, ...style }}
    {...rest}
  >
    {children}
  </div>
)

export const AnimatedCheck = ({ className, animate = true, strokeWidth = 3 }: { className?: string; animate?: boolean; strokeWidth?: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cx(animate && 'animate-check-pop', className)}
    aria-hidden
  >
    <path d="M20 6 9 17l-5-5" pathLength={1} strokeDasharray={1} className={animate ? 'animate-check-draw' : undefined} />
  </svg>
)

export const Spinner = ({ className }: { className?: string }) => (
  <Loader2 className={cx('h-4 w-4 animate-spin', className)} aria-hidden />
)

const SEVERITY_STYLES: Record<Severity, string> = {
  safe: 'border-emerald-300/30 bg-emerald-400/15 text-emerald-200',
  monitor: 'border-amber-300/30 bg-amber-400/15 text-amber-200',
  caution: 'border-rose-300/35 bg-rose-400/15 text-rose-200',
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  safe: '#34d399',
  monitor: '#fbbf24',
  caution: '#fb7185',
}

const SeverityIcon = ({ severity }: { severity: Severity }) => {
  const cls = 'h-3.5 w-3.5'
  if (severity === 'safe') return <CheckCircle2 className={cls} />
  if (severity === 'monitor') return <Eye className={cls} />
  return <AlertTriangle className={cls} />
}

export const SeverityBadge = ({ severity }: { severity: Severity }) => {
  const { t } = useI18n()
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        SEVERITY_STYLES[severity],
      )}
    >
      <SeverityIcon severity={severity} />
      {t(`severity.${severity}`)}
    </span>
  )
}

type ChipTone = 'cyan' | 'indigo' | 'rose' | 'emerald' | 'amber' | 'slate'

const CHIP_TONES: Record<ChipTone, string> = {
  cyan: 'border-sky-300/25 bg-sky-400/10 text-sky-200',
  indigo: 'border-indigo-300/25 bg-indigo-400/10 text-indigo-200',
  rose: 'border-rose-300/25 bg-rose-400/10 text-rose-200',
  emerald: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200',
  amber: 'border-amber-300/25 bg-amber-400/10 text-amber-200',
  slate: 'border-white/10 bg-white/[0.06] text-slate-300',
}

export const Chip = ({ tone = 'slate', children, className }: { tone?: ChipTone; children: ReactNode; className?: string }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
      CHIP_TONES[tone],
      className,
    )}
  >
    {children}
  </span>
)

export const IconButton = ({
  label,
  onClick,
  children,
  className,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  className?: string
}) => (
  <button type="button" aria-label={label} title={label} onClick={onClick} className={cx('btn btn-ghost h-9 w-9 !p-0', className)}>
    {children}
  </button>
)

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  heavyBlur?: boolean
}

export const Modal = ({ title, subtitle, onClose, children, footer, wide, heavyBlur }: ModalProps) => {
  const { t } = useI18n()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className={cx(
        'fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 animate-fade sm:items-center sm:p-6',
        heavyBlur ? 'backdrop-blur-2xl' : 'backdrop-blur-md',
      )}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cx(
          'glass flex max-h-[92dvh] w-full animate-pop flex-col !rounded-b-none sm:!rounded-b-[28px]',
          heavyBlur ? '!bg-slate-900/45' : '!bg-slate-900/60',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-6 pb-4 pt-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
          </div>
          <IconButton label={t('common.close')} onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="safe-bottom flex items-center justify-end gap-2 border-t border-white/10 px-6 pt-4">{footer}</footer>}
      </div>
    </div>
  )
}

export const SpacingBadge = () => {
  const { t } = useI18n()
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/30 bg-sky-400/15 px-2.5 py-1 text-xs font-semibold text-sky-200">
      <Timer className="h-3.5 w-3.5" />
      {t('badge.spacing')}
    </span>
  )
}

interface DrawerProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

export const Drawer = ({ title, subtitle, onClose, children }: DrawerProps) => {
  const { t } = useI18n()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 backdrop-blur-md animate-fade sm:items-stretch sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <aside className="glass flex max-h-[92dvh] w-full animate-drawer flex-col !rounded-b-none !bg-slate-900/60 sm:max-h-none sm:max-w-md sm:!rounded-b-[28px]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-white">{title}</h2>
            {subtitle && <p className="num mt-0.5 truncate text-sm text-slate-400">{subtitle}</p>}
          </div>
          <IconButton label={t('common.close')} onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>
        <div className="safe-bottom flex-1 space-y-6 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  )
}

export const EmptyState = ({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-sky-300">{icon}</div>
    <h3 className="text-base font-semibold text-white">{title}</h3>
    <p className="max-w-sm text-sm text-slate-400">{body}</p>
    {action}
  </div>
)

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
)
