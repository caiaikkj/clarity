import { useId } from 'react'
import { useI18n } from '../i18n'

interface Props {
  done: number
  total: number
  size?: number
  stroke?: number
}

export const AdherenceRing = ({ done, total, size = 220, stroke = 20 }: Props) => {
  const gradientId = useId()
  const { t } = useI18n()
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total === 0 ? 0 : Math.min(1, done / total)
  const complete = total > 0 && done >= total

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-6 rounded-full bg-gradient-to-br from-sky-400/20 to-indigo-500/20 blur-2xl transition-opacity duration-1000"
        style={{ opacity: 0.3 + progress * 0.7 }}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90 overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.3, 0.64, 1)',
            filter: `drop-shadow(0 0 ${complete ? 14 : 9}px rgba(56,189,248,0.6))`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="num text-5xl font-semibold tracking-tight text-white">
          {done}
          <span className="text-3xl text-slate-400">/{total}</span>
        </p>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
          {complete ? t('ring.allDone') : t('ring.dosesToday')}
        </p>
      </div>
    </div>
  )
}
