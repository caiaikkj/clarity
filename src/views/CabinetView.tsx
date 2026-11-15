import { useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, Clock, NotebookPen, PackagePlus, Pause, Pencil, Pill, Plus, ScanLine, Search, ShoppingCart, Tag, Trash2 } from 'lucide-react'
import type { Category, Medication } from '../types'
import { useI18n, type TKey } from '../i18n'
import { formLabel } from '../i18n/forms'
import { useData, useUi } from '../lib/store'
import { useToast } from '../lib/toast'
import { daysOfSupply, frequencyLabel, isLowStock } from '../lib/schedule'
import { formatClock, formatDateTime } from '../lib/dates'
import { brl } from '../lib/format'
import { AddMedicationModal } from '../components/AddMedicationModal'
import { CourseBadge } from '../components/CourseBadge'
import { LeafletModal } from '../components/LeafletModal'
import { MedBadges } from '../components/MedBadges'
import { NotesHistoryModal } from '../components/NotesHistoryModal'
import { RefillDrawer } from '../components/RefillDrawer'
import { Chip, ConfirmDialog, EmptyState, GlassCard, PageHeader, cx } from '../components/ui'
import { isActiveCabinetMed, isCourseArchived } from '../lib/course'

const CATEGORY_META: Record<Category, { tone: 'indigo' | 'cyan' | 'slate'; text: string; bg: string }> = {
  prescription: { tone: 'indigo', text: 'text-indigo-200', bg: 'from-indigo-400/30 to-indigo-600/20' },
  supplement: { tone: 'cyan', text: 'text-sky-200', bg: 'from-sky-400/30 to-sky-600/20' },
  otc: { tone: 'slate', text: 'text-violet-200', bg: 'from-violet-400/30 to-violet-600/20' },
}

const LONG_NAME_CHARS = 22
const VERY_LONG_NAME_CHARS = 36

type CabinetFilter = 'all' | 'continuous' | 'temporary' | 'low' | 'paused'

const FILTERS: { id: CabinetFilter; label: TKey }[] = [
  { id: 'all', label: 'cabinet.filterAll' },
  { id: 'continuous', label: 'cabinet.filterContinuous' },
  { id: 'temporary', label: 'cabinet.filterTemporary' },
  { id: 'low', label: 'cabinet.filterLow' },
  { id: 'paused', label: 'cabinet.filterPaused' },
]

interface MedCardProps {
  med: Medication
  index: number
  onRefill: () => void
  onOpenLeaflet: () => void
  onEdit: () => void
  onNotes: () => void
  onDelete: () => void
  onQuickRefill: (n: number) => void
}

const MedCard = ({ med, index, onRefill, onOpenLeaflet, onEdit, onNotes, onDelete, onQuickRefill }: MedCardProps) => {
  const { data } = useData()
  const { t, lang } = useI18n()

  const meta = CATEGORY_META[med.category]
  const low = isLowStock(med)
  const days = daysOfSupply(med)
  const capacity = Math.max(med.stock, med.refillThreshold * 4, 1)
  const pct = Math.min(100, (med.stock / capacity) * 100)
  const linked = data.notes.filter((n) => n.medIds.includes(med.id)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

  return (
    <GlassCard delay={index * 60} className={cx('flex flex-col gap-5 p-5 sm:p-6', low && '!border-amber-300/30', med.paused && 'opacity-80')}>
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
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Chip tone={meta.tone}>{t(`category.${med.category}`)}</Chip>
          {med.paused && (
            <Chip tone="amber">
              <Pause className="h-3 w-3" />
              {t('cabinet.paused')}
            </Chip>
          )}
        </div>
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
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[10, 30].map((n) => (
            <button key={n} type="button" onClick={() => onQuickRefill(n)} className="btn !rounded-full !px-3 !py-1.5 text-xs">
              <PackagePlus className="h-3.5 w-3.5" />
              {t('cabinet.quickAdd', { n })}
            </button>
          ))}
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

      <CourseBadge med={med} logs={data.logs} />

      {med.instructions && <p className="text-sm leading-relaxed text-slate-300">{med.instructions}</p>}

      {(linked.length > 0 || med.notes) && (
        <div className="glass-soft space-y-2 p-3.5">
          <button type="button" onClick={onNotes} className="flex w-full items-center gap-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 hover:text-sky-200">
            <NotebookPen className="h-3.5 w-3.5" />
            {t('card.linkedNotes')} {linked.length > 0 && <span className="num">· {linked.length}</span>}
          </button>
          {med.notes && <p className="text-sm text-slate-200">{med.notes}</p>}
          {linked.slice(0, 2).map((n) => (
            <div key={n.id} className="border-l-2 border-sky-300/40 pl-3">
              <p className="line-clamp-2 text-sm text-slate-300">{n.text}</p>
              <p className="num text-[11px] text-slate-500">{formatDateTime(n.occurredAt, lang)}</p>
            </div>
          ))}
        </div>
      )}

      {linked.length > 0 && (
        <button
          type="button"
          onClick={onNotes}
          className="btn !w-fit !rounded-full !border-sky-300/25 !bg-sky-400/10 !px-3.5 !py-1.5 text-xs text-sky-100"
        >
          <NotebookPen className="h-3.5 w-3.5" />
          {t('cabinet.notesCount', { count: linked.length })}
        </button>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            aria-label={t('cabinet.editAria', { name: med.name })}
            className="btn !rounded-full !border-white/15 !bg-white/[0.08] !px-3.5 !py-1.5 text-xs text-slate-100 backdrop-blur-md"
          >
            <Pencil className="h-3.5 w-3.5 text-sky-300" />
            {t('cabinet.edit')}
          </button>
          <button
            type="button"
            onClick={onOpenLeaflet}
            aria-label={t('leaflet.openAria', { name: med.name })}
            className="btn !rounded-full !border-white/15 !bg-white/[0.08] !px-3.5 !py-1.5 text-xs text-slate-100 backdrop-blur-md"
          >
            <BookOpen className="h-3.5 w-3.5 text-sky-300" />
            {t('leaflet.button')}
          </button>
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
        </div>
        <button type="button" aria-label={t('card.removeAria', { name: med.name })} className="btn btn-ghost h-9 gap-1.5 !px-3 text-slate-400 hover:text-rose-300" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          <span className="text-xs">{t('common.remove')}</span>
        </button>
      </div>
    </GlassCard>
  )
}

const matchesFilter = (med: Medication, filter: CabinetFilter) => {
  if (filter === 'continuous') return !med.temporary && !med.paused
  if (filter === 'temporary') return Boolean(med.temporary)
  if (filter === 'low') return isLowStock(med)
  if (filter === 'paused') return Boolean(med.paused)
  return true
}

export const CabinetView = () => {
  const { data, removeMed, refill } = useData()
  const { openModal } = useUi()
  const { toast } = useToast()
  const { t } = useI18n()
  const [drawerMedId, setDrawerMedId] = useState<string | null>(null)
  const [leafletMedId, setLeafletMedId] = useState<string | null>(null)
  const [editMedId, setEditMedId] = useState<string | null>(null)
  const [notesMedId, setNotesMedId] = useState<string | null | undefined>(undefined)
  const [deleteMedId, setDeleteMedId] = useState<string | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CabinetFilter>('all')

  const active = data.meds.filter(isActiveCabinetMed)
  const archived = data.meds.filter(isCourseArchived)
  const low = active.filter(isLowStock)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...active]
      .filter((m) => matchesFilter(m, filter))
      .filter((m) => {
        if (!q) return true
        return `${m.name} ${m.activeIngredient ?? ''} ${m.strength} ${m.ingredients.join(' ')}`.toLowerCase().includes(q)
      })
      .sort((a, b) => Number(isLowStock(b)) - Number(isLowStock(a)))
  }, [active, filter, query])

  const deleteTarget = deleteMedId ? data.meds.find((m) => m.id === deleteMedId) : null

  return (
    <>
      <PageHeader
        title={t('cabinet.title')}
        subtitle={`${t('cabinet.subtitle', { count: active.length })}${low.length ? ` · ${t('cabinet.needRefill', { n: low.length })}` : ''}`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => openModal('add')}>
            <ScanLine className="h-4 w-4" />
            <span className="hidden sm:inline">{t('cabinet.scanOrAdd')}</span>
            <Plus className="h-4 w-4 sm:hidden" />
          </button>
        }
      />

      {(active.length > 0 || archived.length > 0) && (
        <div className="mb-6 space-y-3">
          <div className="glass-soft flex items-center gap-2 px-3.5 py-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-500"
              placeholder={t('cabinet.search')}
              aria-label={t('cabinet.search')}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cx('btn !rounded-full !px-3.5 !py-1.5 text-xs', filter === id && '!border-sky-300/50 !bg-sky-400/20 text-sky-100')}
              >
                {t(label)}
              </button>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && archived.length === 0 ? (
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
        <div className="space-y-6">
          {filtered.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((m, i) => (
                <MedCard
                  key={m.id}
                  med={m}
                  index={i}
                  onRefill={() => setDrawerMedId(m.id)}
                  onOpenLeaflet={() => setLeafletMedId(m.id)}
                  onEdit={() => setEditMedId(m.id)}
                  onNotes={() => setNotesMedId(m.id)}
                  onDelete={() => setDeleteMedId(m.id)}
                  onQuickRefill={(n) => {
                    refill(m.id, n)
                    toast(t('toast.stockAdded', { n }))
                  }}
                />
              ))}
            </div>
          ) : (
            <GlassCard>
              <EmptyState icon={<Search className="h-6 w-6" />} title={t('cabinet.noMatchTitle')} body={t('cabinet.noMatchBody')} />
            </GlassCard>
          )}

          {archived.length > 0 && (
            <section className="space-y-3">
              <button
                type="button"
                onClick={() => setArchiveOpen(!archiveOpen)}
                aria-expanded={archiveOpen}
                className="btn btn-ghost !rounded-full !px-4 !py-2 text-xs text-slate-300"
              >
                {t('course.archiveTitle')} · {archived.length}
              </button>
              {archiveOpen && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
                  {archived.map((m, i) => (
                    <MedCard
                      key={m.id}
                      med={m}
                      index={i}
                      onRefill={() => setDrawerMedId(m.id)}
                      onOpenLeaflet={() => setLeafletMedId(m.id)}
                      onEdit={() => setEditMedId(m.id)}
                      onNotes={() => setNotesMedId(m.id)}
                      onDelete={() => setDeleteMedId(m.id)}
                      onQuickRefill={(n) => {
                        refill(m.id, n)
                        toast(t('toast.stockAdded', { n }))
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {drawerMedId && <RefillDrawer medId={drawerMedId} onClose={() => setDrawerMedId(null)} />}
      {leafletMedId && <LeafletModal medId={leafletMedId} onClose={() => setLeafletMedId(null)} />}
      {editMedId && <AddMedicationModal medId={editMedId} onClose={() => setEditMedId(null)} />}
      {notesMedId !== undefined && <NotesHistoryModal initialMedId={notesMedId ?? undefined} onClose={() => setNotesMedId(undefined)} />}
      {deleteTarget && (
        <ConfirmDialog
          title={t('cabinet.deleteTitle')}
          body={t('cabinet.deleteBody', { name: deleteTarget.name })}
          confirmLabel={t('common.remove')}
          danger
          onCancel={() => setDeleteMedId(null)}
          onConfirm={() => {
            removeMed(deleteTarget.id)
            toast(t('toast.medRemoved'))
            setDeleteMedId(null)
          }}
        />
      )}
    </>
  )
}
