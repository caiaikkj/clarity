import { useState } from 'react'
import { AlertTriangle, ChevronDown, Clock, NotebookPen, PackagePlus, Pill, Plus, ScanLine, ShieldCheck, ShoppingCart, Tag, Trash2 } from 'lucide-react'
import type { Category, Medication } from '../types'
import { useI18n } from '../i18n'
import { formLabel } from '../i18n/forms'
import { useData, useUi } from '../lib/store'
import { daysOfSupply, frequencyLabel, isLowStock } from '../lib/schedule'
import { formatClock, formatDateTime } from '../lib/dates'
import { brl } from '../lib/format'
import { LabelDetails } from '../components/LabelDetails'
import { MedBadges } from '../components/MedBadges'
import { RefillDrawer } from '../components/RefillDrawer'
import { Chip, EmptyState, GlassCard, PageHeader, cx } from '../components/ui'

const CATEGORY_META: Record<Category, { tone: 'indigo' | 'cyan' | 'slate'; text: string; bg: string }> = {
  prescription: { tone: 'indigo', text: 'text-indigo-200', bg: 'from-indigo-400/30 to-indigo-600/20' },
  supplement: { tone: 'cyan', text: 'text-sky-200', bg: 'from-sky-400/30 to-sky-600/20' },
  otc: { tone: 'slate', text: 'text-violet-200', bg: 'from-violet-400/30 to-violet-600/20' },
}

const LONG_NAME_CHARS = 22
const VERY_LONG_NAME_CHARS = 36

const MedCard = ({ med, index, onRefill }: { med: Medication; index: number; onRefill: () => void }) => {
  const { data, removeMed } = useData()
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const meta = CATEGORY_META[med.category]
  const low = isLowStock(med)
  const days = daysOfSupply(med)
  const capacity = Math.max(med.stock, med.refillThreshold * 4, 1)
  const pct = Math.min(100, (med.stock / capacity) * 100)
  const linked = data.notes.filter((n) => n.medIds.includes(med.id)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

  return (
    <GlassCard delay={index * 60} className={cx('flex flex-col gap-4 p-5', low && '!border-amber-300/30')}>
      <div className="flex items-start gap-4">
        <div className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br', meta.bg, meta.text)}>
          <Pill className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            title={med.name}
            className={cx(
              'break-words font-semibold leading-snug tracking-tight text-white',
              med.name.length > VERY_LONG_NAME_CHARS ? 'line-clamp-3' : 'line-clamp-2',
              med.name.length > LONG_NAME_CHARS ? 'text-base' : 'text-lg',
            )}
          >
            {med.name}
          </h3>
          <p className="num text-sm text-slate-300">
            {med.strength || '—'} · {formLabel(med.form, lang)}
          </p>
        </div>
        <Chip tone={meta.tone} className="shrink-0">
          {t(`category.${med.category}`)}
        </Chip>
      </div>

      <MedBadges med={med} />

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <Chip>
          <Clock className="h-3 w-3" />
          {frequencyLabel(med, lang)}
        </Chip>
        {med.times.map((time) => (
          <Chip key={time} className="num">
            {formatClock(time, lang)}
          </Chip>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-end justify-between">
          <p className="num text-2xl font-semibold text-white">
            {med.stock}
            <span className="ml-1.5 text-sm font-normal text-slate-400">{t('card.pillsLeft')}</span>
          </p>
          {days !== null && <p className="num text-xs text-slate-400">{t('card.daysSupply', { n: days })}</p>}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={cx('h-full rounded-full transition-all duration-700 ease-smooth', low ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-sky-400 to-indigo-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
        {low && (
          <div className="badge-urgent mt-3 flex items-center justify-between gap-3 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-3.5 py-2.5">
            <p className="flex items-center gap-2 text-xs font-medium text-amber-100">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
              {med.stock === 0 ? t('card.outOfStock') : t('card.lowStock')}
            </p>
          </div>
        )}
      </div>

      {med.lastPaidPrice !== undefined && (
        <p className="num flex items-center gap-2 text-xs text-slate-400">
          <Tag className="h-3.5 w-3.5 text-sky-300" />
          {t('card.lastPrice')} <span className="font-semibold text-slate-200">{brl.format(med.lastPaidPrice)}</span>
          {med.lastPharmacy && <span className="truncate">· {med.lastPharmacy}</span>}
        </p>
      )}

      {med.pmc !== undefined && (
        <p className="num flex items-center gap-2 text-xs text-slate-400">
          <Tag className="h-3.5 w-3.5 text-emerald-300" />
          {t('card.pmc')} <span className="font-semibold text-slate-200">{brl.format(med.pmc)}</span>
        </p>
      )}

      {med.instructions && <p className="text-sm leading-relaxed text-slate-300">{med.instructions}</p>}

      {(linked.length > 0 || med.notes) && (
        <div className="glass-soft space-y-2 p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            <NotebookPen className="h-3.5 w-3.5" />
            {t('card.linkedNotes')} {linked.length > 0 && <span className="num">· {linked.length}</span>}
          </p>
          {med.notes && <p className="text-sm text-slate-200">{med.notes}</p>}
          {linked.slice(0, 2).map((n) => (
            <div key={n.id} className="border-l-2 border-sky-300/40 pl-3">
              <p className="line-clamp-2 text-sm text-slate-300">{n.text}</p>
              <p className="num text-[11px] text-slate-500">{formatDateTime(n.occurredAt, lang)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
        <button type="button" onClick={() => setOpen(!open)} className="btn btn-ghost !px-3 !py-1.5 text-xs text-slate-300" aria-expanded={open}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('card.labelDetails')}
          <ChevronDown className={cx('h-3.5 w-3.5 transition-transform duration-200 ease-spring', open && 'rotate-180')} />
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRefill}
            className={cx(
              'btn !px-3.5 !py-1.5 text-xs',
              low && 'animate-haptic !border-amber-300/50 !bg-amber-400/20 text-amber-50 shadow-[0_0_24px_-6px_rgba(251,191,36,0.6)]',
            )}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {t('card.refill')}
          </button>
          {confirmDelete ? (
            <>
              <button type="button" className="btn !border-rose-300/40 !bg-rose-500/25 !px-3 !py-1 text-xs" onClick={() => removeMed(med.id)}>
                {t('common.remove')}
              </button>
              <button type="button" className="btn btn-ghost !px-3 !py-1 text-xs" onClick={() => setConfirmDelete(false)}>
                {t('common.keep')}
              </button>
            </>
          ) : (
            <button type="button" aria-label={t('card.removeAria', { name: med.name })} className="btn btn-ghost h-8 w-8 !p-0 text-slate-500 hover:text-rose-300" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="animate-fade">
          <LabelDetails fda={med.fda} ingredients={med.ingredients} medId={med.id} medName={med.name} />
        </div>
      )}
    </GlassCard>
  )
}

export const CabinetView = () => {
  const { data } = useData()
  const { openModal } = useUi()
  const { t } = useI18n()
  const [drawerMedId, setDrawerMedId] = useState<string | null>(null)
  const low = data.meds.filter(isLowStock)
  const sorted = [...data.meds].sort((a, b) => Number(isLowStock(b)) - Number(isLowStock(a)))

  return (
    <>
      <PageHeader
        title={t('cabinet.title')}
        subtitle={`${t('cabinet.subtitle', { count: data.meds.length })}${low.length ? ` · ${t('cabinet.needRefill', { n: low.length })}` : ''}`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => openModal('add')}>
            <ScanLine className="h-4 w-4" />
            <span className="hidden sm:inline">{t('cabinet.scanOrAdd')}</span>
            <Plus className="h-4 w-4 sm:hidden" />
          </button>
        }
      />
      {data.meds.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={<PackagePlus className="h-6 w-6" />}
            title={t('cabinet.emptyTitle')}
            body={t('cabinet.emptyBody')}
            action={
              <button type="button" className="btn btn-primary" onClick={() => openModal('add')}>
                <Plus className="h-4 w-4" />
                {t('cabinet.emptyAction')}
              </button>
            }
          />
        </GlassCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
          {sorted.map((m, i) => (
            <MedCard key={m.id} med={m} index={i} onRefill={() => setDrawerMedId(m.id)} />
          ))}
        </div>
      )}

      {drawerMedId && <RefillDrawer medId={drawerMedId} onClose={() => setDrawerMedId(null)} />}
    </>
  )
}
