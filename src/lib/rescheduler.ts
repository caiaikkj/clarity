import type { AppData, DoseShift, Medication } from '../types'
import { adminRuleHours } from '../i18n/adminRules'
import { MINERAL_CLASSES, SPACING_RULES, classesOf } from './knowledge'
import { dateKey, minutesOf } from './dates'
import { doseId, dosesForDate } from './schedule'
import { normalizeText } from './text'

const MINUTES_PER_HOUR = 60
const LAST_MINUTE_OF_DAY = 24 * MINUTES_PER_HOUR - 1
const MIN_SPACING_HOURS = 0.5
const MAX_SPACING_HOURS = 24

export const isValidSpacingHours = (hours: number) => Number.isFinite(hours) && hours >= MIN_SPACING_HOURS && hours <= MAX_SPACING_HOURS

const pad = (n: number) => String(n).padStart(2, '0')

const timeOfMinutes = (minutes: number) => `${pad(Math.floor(minutes / MINUTES_PER_HOUR))}:${pad(minutes % MINUTES_PER_HOUR)}`

const medText = (med: Medication) => normalizeText([med.name, med.activeIngredient ?? '', ...med.ingredients].join(' '))

const matchesTarget = (med: Medication, target?: string) => {
  const wanted = normalizeText(target ?? '').trim()
  if (!wanted) return false
  return medText(med).includes(wanted) || classesOf(med).includes(wanted)
}

const anyOf = (classes: string[], wanted: string[]) => wanted.some((w) => classes.includes(w))

const adminRuleCandidate = (holder: Medication, holderClasses: string[], otherClasses: string[]) => {
  const hours = adminRuleHours(holder.adminRule)
  return hours && anyOf(otherClasses, MINERAL_CLASSES) && !anyOf(holderClasses, MINERAL_CLASSES) ? hours : null
}

const builtInHours = (a: Medication, b: Medication) => {
  const classesA = classesOf(a)
  const classesB = classesOf(b)
  const candidates = SPACING_RULES.filter(
    (rule) => (anyOf(classesA, rule.a) && anyOf(classesB, rule.b)) || (anyOf(classesB, rule.a) && anyOf(classesA, rule.b)),
  ).map((rule) => rule.hours)
  const fromAdminRules = [adminRuleCandidate(a, classesA, classesB), adminRuleCandidate(b, classesB, classesA)]
  fromAdminRules.forEach((hours) => hours && candidates.push(hours))
  return candidates.length ? Math.max(...candidates) : null
}

export const spacingBetween = (a: Medication, b: Medication): number | null => {
  const explicit: number[] = []
  if (a.spacingHours && isValidSpacingHours(a.spacingHours) && matchesTarget(b, a.spacingTarget)) explicit.push(a.spacingHours)
  if (b.spacingHours && isValidSpacingHours(b.spacingHours) && matchesTarget(a, b.spacingTarget)) explicit.push(b.spacingHours)
  if (explicit.length) return Math.max(...explicit)
  return builtInHours(a, b)
}

const ceilMinutes = (date: Date) => date.getHours() * MINUTES_PER_HOUR + date.getMinutes() + (date.getSeconds() > 0 || date.getMilliseconds() > 0 ? 1 : 0)

interface TakenDose {
  medId: string
  date: string
  baseTime: string
}

export const rescheduleAfterTake = (state: AppData, taken: TakenDose, takenAt: Date): DoseShift[] => {
  const anchor = state.meds.find((m) => m.id === taken.medId)
  if (!anchor || dateKey(takenAt) !== taken.date) return state.shifts ?? []

  const causeDoseId = doseId(taken.medId, taken.date, taken.baseTime)
  const takenMinutes = ceilMinutes(takenAt)
  const scheduledMinutes = minutesOf(taken.baseTime)
  const existing = new Map((state.shifts ?? []).map((s) => [s.doseId, s]))
  const medById = new Map(state.meds.map((m) => [m.id, m]))

  dosesForDate(state.meds, state.logs, taken.date, state.shifts ?? []).forEach((dose) => {
    if (dose.log || dose.medId === anchor.id || minutesOf(dose.time) <= scheduledMinutes) return
    const other = medById.get(dose.medId)
    if (!other) return
    const hours = spacingBetween(anchor, other)
    if (!hours) return
    const target = takenMinutes + Math.ceil(hours * MINUTES_PER_HOUR)
    if (minutesOf(dose.time) >= target || target > LAST_MINUTE_OF_DAY) return
    existing.set(dose.id, {
      doseId: dose.id,
      medId: dose.medId,
      date: taken.date,
      fromTime: dose.baseTime,
      toTime: timeOfMinutes(target),
      hours,
      causeDoseId,
      causeMedId: anchor.id,
      causeName: anchor.name,
      causeTakenAt: takenAt.toISOString(),
    })
  })

  return [...existing.values()]
}
