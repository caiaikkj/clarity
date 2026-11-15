import { FlaskConical, ShieldCheck } from 'lucide-react'
import type { Medication } from '../types'
import { useI18n } from '../i18n'
import { localizeAdminRule } from '../i18n/adminRules'
import { cx } from './ui'

const PILL =
  'inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-slate-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md'

export const MedBadges = ({ med, className }: { med: Pick<Medication, 'activeIngredient' | 'adminRule'>; className?: string }) => {
  const { t, lang } = useI18n()
  if (!med.activeIngredient && !med.adminRule) return null
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
    </div>
  )
}
