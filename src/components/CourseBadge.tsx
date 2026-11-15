import type { DoseLog, Medication } from '../types'
import { useI18n } from '../i18n'
import { courseDayNumber, courseProgress, courseRemainingDoses, isTemporaryCourse } from '../lib/course'
import { cx } from './ui'

export const CourseBadge = ({ med, logs, className }: { med: Medication; logs: DoseLog[]; className?: string }) => {
  const { t } = useI18n()
  if (!isTemporaryCourse(med) || !med.courseDays) return null
  const day = courseDayNumber(med) ?? 1
  const left = courseRemainingDoses(med, logs)
  const pct = courseProgress(med, logs)

  return (
    <div className={cx('space-y-2', className)}>
      <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-400/15 px-2.5 py-1 text-[11px] font-semibold text-violet-100 shadow-[0_0_18px_-6px_rgba(167,139,250,0.7)]">
        {t('course.badge', { day, total: med.courseDays, left })}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-400 to-sky-400 shadow-[0_0_12px_rgba(167,139,250,0.55)] transition-all duration-700 ease-smooth"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
