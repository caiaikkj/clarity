import type { DoseLog, Medication } from '../types'
import { addDays, dateKey } from './dates'
import { dosesForDate } from './schedule'

export const isTemporaryCourse = (med: Medication) => Boolean(med.temporary && med.courseDays && med.courseDays > 0 && !med.asNeeded)

export const isCourseArchived = (med: Medication) => Boolean(med.courseArchivedAt)

export const isActiveCabinetMed = (med: Medication) => !isCourseArchived(med)

export const courseEndDate = (med: Medication) => {
  if (!isTemporaryCourse(med) || !med.courseDays) return null
  return dateKey(addDays(new Date(`${med.startDate}T12:00:00`), med.courseDays - 1))
}

export const courseDayNumber = (med: Medication, now = new Date()) => {
  if (!isTemporaryCourse(med) || !med.courseDays) return null
  const start = new Date(`${med.startDate}T12:00:00`)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1
  return Math.min(Math.max(diff, 1), med.courseDays)
}

export const courseTotalDoses = (med: Medication) => {
  if (!isTemporaryCourse(med) || !med.courseDays) return 0
  return med.courseDays * med.times.length
}

export const courseTakenDoses = (med: Medication, logs: DoseLog[]) => {
  if (!isTemporaryCourse(med) || !med.courseDays) return 0
  const end = courseEndDate(med)
  if (!end) return 0
  return logs.filter((log) => log.medId === med.id && log.date >= med.startDate && log.date <= end && log.time !== 'prn').length
}

export const courseRemainingDoses = (med: Medication, logs: DoseLog[]) => Math.max(0, courseTotalDoses(med) - courseTakenDoses(med, logs))

export const courseProgress = (med: Medication, logs: DoseLog[]) => {
  const total = courseTotalDoses(med)
  if (total === 0) return 0
  return Math.min(100, Math.round((courseTakenDoses(med, logs) / total) * 100))
}

export const isCourseComplete = (med: Medication, logs: DoseLog[], now = new Date()) => {
  if (!isTemporaryCourse(med) || !med.courseDays) return false
  if (courseTakenDoses(med, logs) >= courseTotalDoses(med)) return true
  const end = courseEndDate(med)
  if (!end) return false
  const today = dateKey(now)
  if (today < end) return false
  for (let i = 0; i < med.courseDays; i++) {
    const key = dateKey(addDays(new Date(`${med.startDate}T12:00:00`), i))
    if (key > today) continue
    const due = dosesForDate([med], logs, key)
    if (due.some((d) => !d.log)) return false
  }
  return true
}

export const withArchivedCourses = (meds: Medication[], logs: DoseLog[], now = new Date()) =>
  meds.map((med) => {
    if (!isTemporaryCourse(med) || isCourseArchived(med)) return med
    return isCourseComplete(med, logs, now) ? { ...med, courseArchivedAt: now.toISOString() } : med
  })

export const isMedScheduledOn = (med: Medication, date: string) => {
  if (isCourseArchived(med)) return false
  if (med.startDate > date) return false
  if (!isTemporaryCourse(med)) return true
  const end = courseEndDate(med)
  return Boolean(end && date <= end)
}
