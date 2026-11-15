import type { AppData } from '../types'
import { isAppData, isNonEmptyAppData, migrateAppData, sanitizeAppData } from './migrate'
import { supabase } from './supabase'

export const CLOUD_TABLE = 'clarity_user_state'
export const SYNC_DEBOUNCE_MS = 1500

export interface CloudStateRow {
  app_data: unknown
  updated_at: string | null
}

export { isAppData, isNonEmptyAppData, migrateAppData, sanitizeAppData }

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
