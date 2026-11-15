import { useId } from 'react'
import { useI18n } from '../i18n'

interface Props {
  done: number
  total: number
  size?: number
  stroke?: number
}

const RING_TRANSITION_MS = 1000
const RING_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'
const FULL_TURN_DEG = 360

export const AdherenceRing = ({ done, total, size = 220, stroke = 20 }: Props) => {
  const gradientId = useId()
  const { t } = useI18n()
  const radius = (size - stroke) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const progress = total === 0 ? 0 : Math.min(1, done / total)
  const complete = total > 0 && done >= total
  const transition = (property: string) => `${property} ${RING_TRANSITION_MS}ms ${RING_EASING}`
  const glowRadius = 6 + progress * 10
  const glowAlpha = 0.35 + progress * 0.4

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        key={done}
        className="absolute inset-6 animate-ring-pulse rounded-full bg-gradient-to-br from-sky-400/20 to-indigo-500/20 blur-2xl"
        style={{ opacity: 0.3 + progress * 0.7 }}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90 overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{
            transition: `${transition('stroke-dashoffset')}, ${transition('filter')}`,
            filter: `drop-shadow(0 0 ${glowRadius}px rgba(56,189,248,${glowAlpha}))`,
          }}
        />
        <g
          style={{
            transformOrigin: `${center}px ${center}px`,
            transform: `rotate(${progress * FULL_TURN_DEG}deg)`,
            opacity: progress > 0 ? 1 : 0,
            transition: `${transition('transform')}, opacity 200ms ${RING_EASING}`,
          }}
        >
          <circle
            cx={center + radius}
            cy={center}
            r={Math.max(2, stroke / 2 - 5)}
            fill="#ffffff"
            style={{
              filter: `drop-shadow(0 0 ${3 + progress * 5}px rgba(125,211,252,0.95)) drop-shadow(0 0 ${glowRadius + 4}px rgba(56,189,248,${glowAlpha}))`,
              transition: transition('filter'),
            }}
          />
        </g>
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
