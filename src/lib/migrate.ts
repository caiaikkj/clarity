import type { AppData, DoseLog, DoseShift, Medication, Note } from '../types'
import { dateKey } from './dates'

export const EMPTY_DATA: AppData = { meds: [], logs: [], notes: [] }

const isLegacy = (value: unknown): value is AppData => {
  if (!value || typeof value !== 'object') return false
  const data = value as AppData
  return Array.isArray(data.meds) && Array.isArray(data.logs) && Array.isArray(data.notes) && !('profiles' in data)
}

const isProfilesPayload = (
  value: unknown,
): value is {
  profiles: { id: string; meds: Medication[]; logs: DoseLog[]; notes: Note[]; shifts?: DoseShift[] }[]
  activeProfileId?: string
} => {
  if (!value || typeof value !== 'object') return false
  const data = value as { profiles?: unknown }
  return Array.isArray(data.profiles) && data.profiles.length > 0
}

export const sanitizeAppData = (data: AppData): AppData => {
  const today = dateKey(new Date())
  return {
    meds: Array.isArray(data.meds) ? data.meds : [],
    logs: Array.isArray(data.logs) ? data.logs : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    shifts: (Array.isArray(data.shifts) ? data.shifts : []).filter((s) => s.date === today),
  }
}

export const isAppData = (value: unknown): value is AppData => isLegacy(value)

export const isNonEmptyAppData = (data: AppData) => data.meds.length > 0 || data.logs.length > 0 || data.notes.length > 0

export const migrateAppData = (raw: unknown): AppData => {
  if (isLegacy(raw)) return sanitizeAppData(raw)
  if (isProfilesPayload(raw)) {
    const active = raw.profiles.find((p) => p.id === raw.activeProfileId) ?? raw.profiles[0]
    return sanitizeAppData({
      meds: active.meds ?? [],
      logs: active.logs ?? [],
      notes: active.notes ?? [],
      shifts: active.shifts,
    })
  }
  return EMPTY_DATA
}

export const dataFingerprint = (data: AppData) => JSON.stringify({ meds: data.meds, logs: data.logs, notes: data.notes })
