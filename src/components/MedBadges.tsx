import { FlaskConical, ShieldCheck, Timer } from 'lucide-react'
import type { Medication } from '../types'
import { useI18n } from '../i18n'
import { localizeAdminRule } from '../i18n/adminRules'
import { formatHours } from '../lib/dates'
import { cx } from './ui'

const PILL =
  'inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-slate-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md'

type BadgeMed = Pick<Medication, 'activeIngredient' | 'adminRule' | 'spacingHours' | 'spacingTarget'>

export const MedBadges = ({ med, className }: { med: BadgeMed; className?: string }) => {
  const { t, lang } = useI18n()
  const hasSpacing = Boolean(med.spacingHours && med.spacingTarget)
  if (!med.activeIngredient && !med.adminRule && !hasSpacing) return null
  return (
    <div className={cx('flex flex-wrap gap-1.5', className)}>
      {med.activeIngredient && (
        <span className={PILL} title={t('badge.activeIngredient')}>
          <FlaskConical className="h-3 w-3 shrink-0 text-indigo-300" />
          <span className="truncate">{med.activeIngredient}</span>
        </span>
      )}
      {med.adminRule && (
        <span className={PILL} title={t('badge.adminRule')}>
          <ShieldCheck className="h-3 w-3 shrink-0 text-sky-300" />
          <span className="truncate">{localizeAdminRule(med.adminRule, lang)}</span>
        </span>
      )}
      {hasSpacing && med.spacingHours && (
        <span className={PILL} title={t('add.spacingHours')}>
          <Timer className="h-3 w-3 shrink-0 text-amber-300" />
          <span className="truncate">{t('badge.spacing.pill', { hours: formatHours(med.spacingHours, lang), target: med.spacingTarget ?? '' })}</span>
        </span>
      )}
    </div>
  )
}
