import type { Dose, DoseLog, DoseShift, Medication, TimeBlock } from '../types'
import type { Lang } from '../i18n/translations'
import { translate } from '../i18n/translations'
import { isMedScheduledOn } from './course'
import { addDays, dateKey, minutesOf } from './dates'

export const doseId = (medId: string, date: string, time: string) => `${medId}|${date}|${time}`

export const blockOf = (time: string): TimeBlock => {
  const m = minutesOf(time)
  if (m < 12 * 60) return 'morning'
  if (m < 18 * 60) return 'afternoon'
  return 'night'
}

export const dosesForDate = (meds: Medication[], logs: DoseLog[], date: string, shifts: DoseShift[] = []): Dose[] => {
  const byId = new Map(logs.map((l) => [l.id, l]))
  const shiftById = new Map(shifts.filter((s) => s.date === date).map((s) => [s.doseId, s]))
  const doses: Dose[] = []
  meds.forEach((m) => {
    if (m.paused || m.asNeeded || !isMedScheduledOn(m, date)) return
    m.times.forEach((baseTime) => {
      const id = doseId(m.id, date, baseTime)
      const log = byId.get(id)
      const shift = log ? undefined : shiftById.get(id)
      doses.push({ id, medId: m.id, date, time: shift?.toTime ?? baseTime, baseTime, log, shift })
    })
  })
  return doses.sort((a, b) => minutesOf(a.time) - minutesOf(b.time))
}

export const frequencyLabel = (m: Medication, lang: Lang) => {
  if (m.asNeeded) return translate(lang, 'freq.asNeeded')
  const n = m.times.length
  if (n === 1) return translate(lang, 'freq.once')
  if (n === 2) return translate(lang, 'freq.twice')
  return translate(lang, 'freq.times', { n })
}

export const daysOfSupply = (m: Medication) => {
  if (m.asNeeded) return null
  const perDay = m.times.length * m.pillsPerDose
  if (perDay === 0) return null
  return Math.floor(m.stock / perDay)
}

export const isLowStock = (m: Medication) => m.stock <= m.refillThreshold

export interface Adherence {
  taken: number
  expected: number
  pct: number
}

export const adherence = (meds: Medication[], logs: DoseLog[], days: number, now: Date, shifts: DoseShift[] = []): Adherence => {
  let taken = 0
  let expected = 0
  const today = dateKey(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  for (let i = 0; i < days; i++) {
    const key = dateKey(addDays(now, -i))
    dosesForDate(meds, logs, key, shifts).forEach((d) => {
      if (key === today && !d.log && minutesOf(d.time) > nowMinutes) return
      expected++
      if (d.log) taken++
    })
  }
  return { taken, expected, pct: expected === 0 ? 100 : Math.round((taken / expected) * 100) }
}

export const streak = (meds: Medication[], logs: DoseLog[], now: Date) => {
  const scheduled = meds.filter((m) => !m.asNeeded && m.times.length > 0)
  if (scheduled.length === 0) return 0
  const earliest = scheduled.reduce((min, m) => (m.startDate < min ? m.startDate : min), dateKey(now))
  const isComplete = (key: string) => {
    const doses = dosesForDate(meds, logs, key)
    return doses.length > 0 && doses.every((d) => d.log)
  }
  let count = 0
  let cursor = now
  if (isComplete(dateKey(cursor))) count++
  cursor = addDays(cursor, -1)
  while (dateKey(cursor) >= earliest && count < 3650) {
    if (!isComplete(dateKey(cursor))) break
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

export const nextDose = (doses: Dose[], now: Date) => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
  const pending = doses.filter((d) => !d.log)
  const upcoming = pending.find((d) => minutesOf(d.time) >= nowMinutes)
  if (upcoming) return { dose: upcoming, minutes: minutesOf(upcoming.time) - nowMinutes, overdue: false }
  const overdue = pending[pending.length - 1]
  if (overdue) return { dose: overdue, minutes: nowMinutes - minutesOf(overdue.time), overdue: true }
  return null
}

export const defaultTimes = (perDay: number, bedtime = false) => {
  if (bedtime) return ['21:30']
  switch (perDay) {
    case 1:
      return ['08:00']
    case 2:
      return ['08:00', '20:00']
    case 3:
      return ['08:00', '14:00', '21:00']
    default:
      return ['06:00', '12:00', '18:00', '22:00'].slice(0, Math.max(1, perDay))
  }
}