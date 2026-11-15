import { CalendarClock, RotateCcw } from 'lucide-react'
import type { DoseShift } from '../types'
import { useI18n } from '../i18n'
import { formatClock, formatHours, formatShiftDelta, minutesOf } from '../lib/dates'
import { useData } from '../lib/store'
import { cx } from './ui'

const LARGE_SHIFT_MINUTES = 120

interface ShiftBadgeProps {
  shift: DoseShift
  medName: string
  className?: string
}

export const ShiftBadge = ({ shift, medName, className }: ShiftBadgeProps) => {
  const { t, lang } = useI18n()
  const { restoreShift } = useData()
  const delta = minutesOf(shift.toTime) - minutesOf(shift.fromTime)
  const large = delta >= LARGE_SHIFT_MINUTES

  return (
    <div
      className={cx(
        'animate-pop flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border px-3 py-1.5 text-[11px] leading-snug shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-md',
        large ? 'border-amber-300/30 bg-amber-400/10 text-amber-100' : 'border-sky-300/30 bg-sky-400/10 text-sky-100',
        className,
      )}
    >
      <CalendarClock className={cx('h-3.5 w-3.5 shrink-0', large ? 'text-amber-300' : 'text-sky-300')} />
      <span className="min-w-0 flex-1">
        {t('shift.badge', {
          time: formatClock(shift.toTime, lang),
          delta: formatShiftDelta(delta),
          hours: formatHours(shift.hours, lang),
          name: shift.causeName,
        })}
      </span>
      <button
        type="button"
        onClick={() => restoreShift(shift.doseId)}
        aria-label={t('shift.restoreAria', { name: medName })}
        className="tactile inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/[0.08] px-2 py-0.5 font-semibold text-white"
      >
        <RotateCcw className="h-3 w-3" />
        {t('shift.restore')}
      </button>
    </div>
  )
}
