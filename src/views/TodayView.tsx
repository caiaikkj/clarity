import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Clock, Flame, NotebookPen, Pill, Plus, Undo2 } from 'lucide-react'
import type { Dose, Medication, TimeBlock } from '../types'
import { useI18n } from '../i18n'
import { useData, useNow, useUi } from '../lib/store'
import { useToast } from '../lib/toast'
import { dateKey, formatClock, formatCountdown, formatLongDate, greeting, minutesOf, toTimeString } from '../lib/dates'
import { adherence, blockOf, daysOfSupply, dosesForDate, isLowStock, nextDose, streak } from '../lib/schedule'
import { AdherenceRing } from '../components/AdherenceRing'
import { BrainDumpBar } from '../components/BrainDumpBar'
import { MedBadges } from '../components/MedBadges'
import { NoteCard } from '../components/NoteCard'
import { NotesHistoryModal } from '../components/NotesHistoryModal'
import { CourseBadge } from '../components/CourseBadge'
import { ShiftBadge } from '../components/ShiftBadge'
import { AnimatedCheck, Chip, EmptyState, GlassCard, PageHeader, cx } from '../components/ui'

const BLOCKS: TimeBlock[] = ['morning', 'afternoon', 'night']

const DoseCard = ({ dose, med, now }: { dose: Dose; med: Medication; now: Date }) => {
  const { take, undo, adjustTaken, data } = useData()
  const { toast } = useToast()
  const { t, lang } = useI18n()
  const [pulse, setPulse] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editTime, setEditTime] = useState(false)
  const [timeValue, setTimeValue] = useState('')
  const timer = useRef<number>()
  const taken = Boolean(dose.log)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const overdue = !taken && nowMinutes - minutesOf(dose.time) > 30

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const handleTake = () => {
    take(dose)
    navigator.vibrate?.(14)
    setPulse(true)
    toast(t('toast.doseTaken', { name: med.name }))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPulse(false), 950)
  }

  const openMenu = () => {
    if (!dose.log) return
    setMenuOpen(true)
    setEditTime(false)
    setTimeValue(toTimeString(new Date(dose.log.takenAt)))
  }

  const saveTime = () => {
    if (!dose.log || !timeValue) return
    const base = new Date(dose.log.takenAt)
    const [h, m] = timeValue.split(':').map(Number)
    base.setHours(h, m, 0, 0)
    adjustTaken(dose.id, base.toISOString())
    toast(t('toast.doseTimeUpdated'))
    setEditTime(false)
    setMenuOpen(false)
  }

  return (
    <div
      className={cx(
        'glass-soft flex items-center gap-4 p-4 transition-all duration-200 ease-smooth',
        taken && 'border-sky-300/25 bg-sky-400/[0.08]',
        pulse && 'haptic-glow',
      )}
    >
      <button
        type="button"
        disabled={!taken}
        onClick={openMenu}
        aria-label={taken ? t('today.adjustDose', { name: med.name }) : undefined}
        className={cx(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 ease-spring',
          taken
            ? 'scale-105 border-sky-300/40 bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-glow'
            : 'border-white/10 bg-white/[0.06] text-slate-300',
        )}
      >
        {taken ? <AnimatedCheck className="h-6 w-6" animate={pulse} /> : <Pill className="h-5 w-5" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cx('line-clamp-2 break-words text-[15px] font-semibold leading-snug transition-colors', taken ? 'text-slate-300' : 'text-white')}>
          {med.name} <span className="num font-normal text-slate-400">{med.strength}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span className="num flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatClock(dose.time, lang)}
          </span>
          <span className="num">{t('today.left', { n: med.stock })}</span>
          {overdue && (
            <Chip tone="amber" className="badge-urgent">
              <AlertTriangle className="h-3 w-3" />
              {t('today.overdue')}
            </Chip>
          )}
          {taken && dose.log && (
            <button type="button" onClick={openMenu} className="num text-sky-300 underline-offset-2 hover:underline">
              {t('today.takenAt', { time: formatClock(toTimeString(new Date(dose.log.takenAt)), lang) })}
            </button>
          )}
        </div>
        {dose.shift && !taken && <ShiftBadge shift={dose.shift} medName={med.name} className="mt-2" />}
        <CourseBadge med={med} logs={data.logs} className="mt-2" />
        <MedBadges med={med} className="mt-2" />

        {menuOpen && taken && (
          <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-black/25 p-3">
            {editTime ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="field !w-auto !py-2 text-base"
                />
                <button type="button" className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={saveTime}>
                  {t('common.save')}
                </button>
                <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setEditTime(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn !px-3 !py-1.5 text-xs"
                  onClick={() => {
                    undo(dose.id)
                    toast(t('toast.doseUndone', { name: med.name }))
                    setMenuOpen(false)
                  }}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  {t('today.undoDose')}
                </button>
                <button type="button" className="btn !px-3 !py-1.5 text-xs" onClick={() => setEditTime(true)}>
                  <Clock className="h-3.5 w-3.5" />
                  {t('today.editTime')}
                </button>
                <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setMenuOpen(false)}>
                  {t('common.close')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {taken ? (
        <button
          type="button"
          onClick={() => {
            undo(dose.id)
            toast(t('toast.doseUndone', { name: med.name }))
            setMenuOpen(false)
          }}
          aria-label={t('today.undo', { name: med.name })}
          className="btn btn-ghost h-9 gap-1.5 !px-3 text-slate-400"
        >
          <Undo2 className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">{t('today.undoDose')}</span>
        </button>
      ) : (
        <button type="button" onClick={handleTake} className="btn btn-primary shrink-0">
          {t('today.markTaken')}
        </button>
      )}
    </div>
  )
}

const AsNeededRow = ({ med }: { med: Medication }) => {
  const { logAsNeeded } = useData()
  const { toast } = useToast()
  const { t } = useI18n()
  const [pulse, setPulse] = useState(false)
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const handle = () => {
    logAsNeeded(med.id)
    navigator.vibrate?.(14)
    setPulse(true)
    toast(t('toast.doseTaken', { name: med.name }))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPulse(false), 950)
  }

  return (
    <div className={cx('glass-soft flex items-center gap-4 p-4', pulse && 'haptic-glow')}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-violet-300">
        <Pill className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-white">
          {med.name} <span className="num font-normal text-slate-400">{med.strength}</span>
        </p>
        <p className="num mt-1 text-xs text-slate-400">{t('today.asNeededLeft', { n: med.stock })}</p>
        <MedBadges med={med} className="mt-2" />
      </div>
      <button type="button" onClick={handle} disabled={med.stock === 0} className="btn shrink-0">
        {t('today.logDose')}
      </button>
    </div>
  )
}

export const TodayView = () => {
  const { data } = useData()
  const { openModal, setView } = useUi()
  const { t, lang } = useI18n()
  const now = useNow(15_000)
  const today = dateKey(now)
  const [notesOpen, setNotesOpen] = useState(false)

  const doses = dosesForDate(data.meds, data.logs, today, data.shifts)
  const done = doses.filter((d) => d.log).length
  const streakDays = streak(data.meds, data.logs, now)
  const week = adherence(data.meds, data.logs, 7, now, data.shifts)
  const next = nextDose(doses, now)
  const medById = new Map(data.meds.map((m) => [m.id, m]))
  const asNeeded = data.meds.filter((m) => m.asNeeded && !m.paused)
  const lowStock = data.meds.filter((m) => !m.paused && isLowStock(m))
  const allNotes = [...data.notes].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  const notes = allNotes.slice(0, 5)

  return (
    <>
      <PageHeader
        title={`${greeting(now, lang)}.`}
        subtitle={formatLongDate(now, lang)}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => openModal('add')}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('today.addMedication')}</span>
          </button>
        }
      />

      <BrainDumpBar />

      {lowStock.length > 0 && (
        <button
          type="button"
          onClick={() => setView('cabinet')}
          className="glass-soft glass-interactive badge-urgent mt-5 flex w-full items-center gap-3 !border-amber-300/25 !bg-amber-400/[0.08] px-4 py-3 text-left"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" />
          <p className="text-sm text-amber-100">
            <span className="font-semibold">{t('today.refillSoon')}</span>{' '}
            {lowStock
              .map((m) => {
                const days = daysOfSupply(m)
                return `${m.name} (${t('today.left', { n: m.stock })}${days !== null ? `, ${t('supply.daysShort', { n: days })}` : ''})`
              })
              .join(' · ')}
          </p>
        </button>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <GlassCard className="flex flex-col items-center gap-6 p-6" delay={60}>
            <AdherenceRing done={done} total={doses.length} />
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="glass-soft p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  <Flame className="h-3.5 w-3.5 text-orange-300" />
                  {t('today.streak')}
                </p>
                <p className="num mt-1 text-2xl font-semibold text-white">
                  {streakDays}
                  <span className="ml-1 text-sm font-normal text-slate-400">{t('unit.day', { count: streakDays })}</span>
                </p>
              </div>
              <div className="glass-soft p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{t('today.sevenDay')}</p>
                <p className="num mt-1 text-2xl font-semibold text-white">
                  {week.expected === 0 ? '—' : week.pct}
                  {week.expected > 0 && <span className="ml-0.5 text-sm font-normal text-slate-400">%</span>}
                </p>
              </div>
            </div>
            <div className="glass-soft w-full p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{t('today.nextDose')}</p>
              {next ? (
                <div className="mt-1.5 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-white">{medById.get(next.dose.medId)?.name}</p>
                    <p className="num text-xs text-slate-400">{formatClock(next.dose.time, lang)}</p>
                  </div>
                  <p className={cx('num text-2xl font-semibold', next.overdue ? 'text-amber-300' : 'gradient-text')}>
                    {next.overdue
                      ? t('date.late', { time: formatCountdown(next.minutes) })
                      : t('date.in', { time: formatCountdown(next.minutes) })}
                  </p>
                </div>
              ) : (
                <p className="mt-1.5 text-sm text-slate-300">{doses.length === 0 ? t('today.nothingScheduled') : t('today.allDone')}</p>
              )}
            </div>
          </GlassCard>

          <GlassCard className="space-y-3 p-5" delay={120}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <NotebookPen className="h-4 w-4 text-sky-300" />
                {t('today.recentDumps')}
              </h2>
              {allNotes.length > 0 && (
                <button type="button" onClick={() => setNotesOpen(true)} className="btn btn-ghost !rounded-full !px-3 !py-1.5 text-xs text-sky-200">
                  {t('today.viewAllNotes', { count: allNotes.length })}
                </button>
              )}
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-slate-400">{t('today.recentDumpsEmpty')}</p>
            ) : (
              notes.map((n) => <NoteCard key={n.id} note={n} />)
            )}
          </GlassCard>
        </div>

        <div className="min-w-0 space-y-6">
          {data.meds.length === 0 ? (
            <GlassCard>
              <EmptyState
                icon={<Pill className="h-6 w-6" />}
                title={t('today.emptyTitle')}
                body={t('today.emptyBody')}
                action={
                  <button type="button" className="btn btn-primary" onClick={() => openModal('add')}>
                    <Plus className="h-4 w-4" />
                    {t('today.addMedication')}
                  </button>
                }
              />
            </GlassCard>
          ) : (
            BLOCKS.map((block, i) => {
              const items = doses.filter((d) => blockOf(d.time) === block)
              if (items.length === 0) return null
              const complete = items.every((d) => d.log)
              return (
                <GlassCard key={block} className="p-5 sm:p-6" delay={80 + i * 60}>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-white">{t(`block.${block}`)}</h2>
                      <p className="text-xs text-slate-400">{t(`block.${block}.range`)}</p>
                    </div>
                    <span
                      className={cx(
                        'num rounded-full border px-2.5 py-1 text-xs font-medium',
                        complete ? 'border-sky-300/30 bg-sky-400/15 text-sky-200' : 'border-white/10 bg-white/[0.06] text-slate-300',
                      )}
                    >
                      {items.filter((d) => d.log).length}/{items.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {items.map((d) => {
                      const med = medById.get(d.medId)
                      return med ? <DoseCard key={d.id} dose={d} med={med} now={now} /> : null
                    })}
                  </div>
                </GlassCard>
              )
            })
          )}

          {asNeeded.length > 0 && (
            <GlassCard className="p-5 sm:p-6" delay={260}>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-white">{t('today.asNeeded')}</h2>
                <p className="text-xs text-slate-400">{t('today.asNeededHint')}</p>
              </div>
              <div className="space-y-3">
                {asNeeded.map((m) => (
                  <AsNeededRow key={m.id} med={m} />
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {notesOpen && <NotesHistoryModal onClose={() => setNotesOpen(false)} />}
    </>
  )
}
