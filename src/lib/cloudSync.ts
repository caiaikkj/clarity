import type { AppData } from '../types'
import { dateKey } from './dates'
import { supabase } from './supabase'

export const CLOUD_TABLE = 'clarity_user_state'
export const SYNC_DEBOUNCE_MS = 1500

export interface CloudStateRow {
  app_data: unknown
  updated_at: string | null
}

export const isAppData = (value: unknown): value is AppData => {
  if (!value || typeof value !== 'object') return false
  const data = value as AppData
  return Array.isArray(data.meds) && Array.isArray(data.logs) && Array.isArray(data.notes)
}

export const isNonEmptyAppData = (data: AppData) => data.meds.length > 0 || data.logs.length > 0 || data.notes.length > 0

export const sanitizeAppData = (data: AppData): AppData => {
  const today = dateKey(new Date())
  return {
    meds: data.meds,
    logs: data.logs,
    notes: data.notes,
    shifts: (Array.isArray(data.shifts) ? data.shifts : []).filter((s) => s.date === today),
  }
}

export const fetchCloudState = async (userId: string) => {
  const { data, error } = await supabase.from(CLOUD_TABLE).select('app_data, updated_at').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return (data as CloudStateRow | null) ?? null
}

export const upsertCloudState = async (userId: string, appData: AppData) => {
  const updatedAt = new Date().toISOString()
  const { error } = await supabase.from(CLOUD_TABLE).upsert(
    {
      user_id: userId,
      app_data: sanitizeAppData(appData),
      updated_at: updatedAt,
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
  return updatedAt
}

export const authRedirectTo = () => `${window.location.origin}${window.location.pathname}`
