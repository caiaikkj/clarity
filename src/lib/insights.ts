import type { DoseLog, Medication, Note, TimeBlock } from '../types'
import type { Lang } from '../i18n/translations'
import { addDays, dateKey } from './dates'
import { tagLabel } from './knowledge'
import { blockOf, dosesForDate } from './schedule'

export const PATTERN_DAYS = 30
export const AI_DIGEST_DAYS = 14

const ON_TIME_GRACE_MINUTES = 60
const MIN_WINDOW_DOSES = 3
export const SIGNIFICANT_DELAY_MINUTES = 15
const SYMPTOM_LOOKBACK_MS = 4 * 60 * 60 * 1000
const MIN_RECURRENCES = 2
const MIN_LINK_COUNT = 2
const MAX_PATTERNS = 3
const MAX_DIGEST_NOTES = 30
const TRACKED_HABITS = ['poor_sleep']
const WINDOW_ORDER: TimeBlock[] = ['morning', 'afternoon', 'night']
const MS_PER_MINUTE = 60000

export interface WindowStat {
  window: TimeBlock
  expected: number
  taken: number
  onTime: number
  onTimeRate: number
  averageDelay: number
}

export interface AdherenceWindowInsight {
  windows: WindowStat[]
  strongest: WindowStat | null
  mostDelayed: WindowStat | null
  balanced: boolean
}

export interface SymptomPattern {
  key: string
  label: string
  occurrences: number
  linkedMedId: string | null
  linkedCount: number
}

const scheduledAt = (date: string, time: string) => {
  const [h, m] = time.split(':').map(Number)
  const [y, mo, d] = date.split('-').map(Number)
  return new Date(y, mo - 1, d, h, m, 0, 0)
}

export const windowStats = (meds: Medication[], logs: DoseLog[], now: Date, days = PATTERN_DAYS): WindowStat[] => {
  const totals = new Map<TimeBlock, { expected: number; taken: number; onTime: number; delay: number }>()
  for (let i = 0; i < days; i++) {
    const key = dateKey(addDays(now, -i))
    dosesForDate(meds, logs, key).forEach((dose) => {
      const due = dose.log?.dueTime ?? dose.baseTime
      const dueAt = scheduledAt(key, due)
      if (!dose.log && dueAt.getTime() > now.getTime()) return
      const window = blockOf(due)
      const entry = totals.get(window) ?? { expected: 0, taken: 0, onTime: 0, delay: 0 }
      entry.expected++
      if (dose.log) {
        const delay = Math.max(0, (new Date(dose.log.takenAt).getTime() - dueAt.getTime()) / MS_PER_MINUTE)
        entry.taken++
        entry.delay += delay
        if (delay <= ON_TIME_GRACE_MINUTES) entry.onTime++
      }
      totals.set(window, entry)
    })
  }
  return WINDOW_ORDER.flatMap((window) => {
    const entry = totals.get(window)
    if (!entry) return []
    return [
      {
        window,
        expected: entry.expected,
        taken: entry.taken,
        onTime: entry.onTime,
        onTimeRate: Math.round((entry.onTime / entry.expected) * 100),
        averageDelay: entry.taken === 0 ? 0 : Math.round(entry.delay / entry.taken),
      },
    ]
  })
}

export const adherenceWindowInsight = (meds: Medication[], logs: DoseLog[], now: Date, days = PATTERN_DAYS): AdherenceWindowInsight | null => {
  const windows = windowStats(meds, logs, now, days).filter((w) => w.expected >= MIN_WINDOW_DOSES)
  if (windows.length === 0) return null
  const strongest = windows.reduce((best, w) => (w.onTimeRate > best.onTimeRate || (w.onTimeRate === best.onTimeRate && w.averageDelay < best.averageDelay) ? w : best))
  const delayed = windows.reduce((worst, w) => (w.averageDelay > worst.averageDelay ? w : worst))
  const balanced = windows.length > 1 && windows.every((w) => w.onTimeRate === strongest.onTimeRate)
  const mostDelayed = delayed.window !== strongest.window && delayed.averageDelay >= SIGNIFICANT_DELAY_MINUTES ? delayed : null
  return { windows, strongest, mostDelayed, balanced }
}

const precedingLogs = (logs: DoseLog[], at: number) =>
  logs.filter((log) => {
    const takenAt = new Date(log.takenAt).getTime()
    return takenAt <= at && at - takenAt <= SYMPTOM_LOOKBACK_MS
  })

const trackedTags = (note: Note) => [...new Set([...note.symptoms, ...note.habits.filter((h) => TRACKED_HABITS.includes(h))])]

export const symptomPatterns = (logs: DoseLog[], notes: Note[], now: Date, lang: Lang, days = PATTERN_DAYS): SymptomPattern[] => {
  const since = addDays(now, -days).getTime()
  const grouped = new Map<string, { occurrences: number; meds: Map<string, number> }>()
  notes.forEach((note) => {
    const at = new Date(note.occurredAt).getTime()
    if (at < since || at > now.getTime()) return
    const tags = trackedTags(note)
    if (tags.length === 0) return
    const preceding = new Set(precedingLogs(logs, at).map((log) => log.medId))
    tags.forEach((tag) => {
      const entry = grouped.get(tag) ?? { occurrences: 0, meds: new Map<string, number>() }
      entry.occurrences++
      preceding.forEach((medId) => entry.meds.set(medId, (entry.meds.get(medId) ?? 0) + 1))
      grouped.set(tag, entry)
    })
  })
  return [...grouped.entries()]
    .filter(([, entry]) => entry.occurrences >= MIN_RECURRENCES)
    .map(([key, entry]) => {
      const [linkedMedId, linkedCount] = [...entry.meds.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0]
      const linked = linkedCount >= MIN_LINK_COUNT
      return {
        key,
        label: tagLabel(key, lang),
        occurrences: entry.occurrences,
        linkedMedId: linked ? linkedMedId : null,
        linkedCount: linked ? linkedCount : 0,
      }
    })
    .sort((a, b) => b.occurrences - a.occurrences || b.linkedCount - a.linkedCount)
    .slice(0, MAX_PATTERNS)
}

export const buildAiDigest = (meds: Medication[], logs: DoseLog[], notes: Note[], now: Date, lang: Lang) => {
  const since = addDays(now, -AI_DIGEST_DAYS).getTime()
  const medName = new Map(meds.map((m) => [m.id, m.name]))
  const perMed = meds
    .filter((m) => !m.asNeeded && m.times.length > 0)
    .map((m) => {
      const one = [m]
      const stats = windowStats(one, logs, now, AI_DIGEST_DAYS)
      const expected = stats.reduce((sum, w) => sum + w.expected, 0)
      const taken = stats.reduce((sum, w) => sum + w.taken, 0)
      const onTime = stats.reduce((sum, w) => sum + w.onTime, 0)
      return { medication: m.name, scheduledDoses: expected, taken, onTime }
    })
  const windows = windowStats(meds, logs, now, AI_DIGEST_DAYS).map((w) => ({
    window: w.window,
    scheduledDoses: w.expected,
    taken: w.taken,
    onTimePercent: w.onTimeRate,
    averageDelayMinutes: w.averageDelay,
  }))
  const recentNotes = notes
    .filter((n) => {
      const at = new Date(n.occurredAt).getTime()
      return at >= since && at <= now.getTime()
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, MAX_DIGEST_NOTES)
    .map((n) => {
      const at = new Date(n.occurredAt).getTime()
      const precedingMeds = [
        ...new Set(
          precedingLogs(logs, at)
            .map((log) => medName.get(log.medId))
            .filter((name): name is string => Boolean(name)),
        ),
      ]
      return {
        date: n.occurredAt.slice(0, 16),
        symptoms: n.symptoms.map((s) => tagLabel(s, lang)),
        habits: n.habits.map((h) => tagLabel(h, lang)),
        mood: n.mood ?? 'neutral',
        medicationsTakenInPrevious4h: precedingMeds,
      }
    })
    .filter((n) => n.symptoms.length > 0 || n.habits.length > 0)
  return JSON.stringify({ periodDays: AI_DIGEST_DAYS, adherenceByMedication: perMed, adherenceByTimeOfDay: windows, notes: recentNotes })
}
