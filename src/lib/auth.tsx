import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { AppData } from '../types'
import { useI18n } from '../i18n'
import { translate } from '../i18n/translations'
import {
  SYNC_DEBOUNCE_MS,
  authRedirectTo,
  fetchCloudState,
  isNonEmptyAppData,
  migrateAppData,
  upsertCloudState,
} from './cloudSync'
import { dataFingerprint } from './migrate'
import { useData } from './store'
import { supabase } from './supabase'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'conflict'

export interface CloudConflict {
  cloud: AppData
  updatedAt: string | null
}

interface AuthApi {
  user: User | null
  ready: boolean
  syncStatus: SyncStatus
  lastSyncedAt: string | null
  conflict: CloudConflict | null
  error: string | null
  magicSent: boolean
  signupSent: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  sendMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
  useCloud: () => Promise<void>
  keepLocal: () => Promise<void>
  clearError: () => void
  clearMagicSent: () => void
  clearSignupSent: () => void
}

const AuthContext = createContext<AuthApi | null>(null)

const authMessage = (error: unknown, lang: 'pt-BR' | 'en-US') => {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return translate(lang, 'cloud.errorGeneric')
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data, replaceData } = useData()
  const { lang } = useI18n()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [bootstrapped, setBootstrapped] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [conflict, setConflict] = useState<CloudConflict | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)
  const [signupSent, setSignupSent] = useState(false)

  const dataRef = useRef(data)
  const userRef = useRef(user)
  const conflictRef = useRef(conflict)
  const skipPushUntil = useRef(0)
  const pushTimer = useRef<number>()
  const syncingRef = useRef(false)
  dataRef.current = data
  userRef.current = user
  conflictRef.current = conflict

  const clearError = useCallback(() => setError(null), [])
  const clearMagicSent = useCallback(() => setMagicSent(false), [])
  const clearSignupSent = useCallback(() => setSignupSent(false), [])

  const pushState = useCallback(async (userId: string, next: AppData) => {
    if (conflictRef.current || syncingRef.current) return
    syncingRef.current = true
    setSyncStatus('syncing')
    setError(null)
    try {
      const updatedAt = await upsertCloudState(userId, next)
      setLastSyncedAt(updatedAt)
      setSyncStatus('synced')
    } catch (err) {
      setSyncStatus('error')
      setError(authMessage(err, lang))
    } finally {
      syncingRef.current = false
    }
  }, [lang])

  const reconcile = useCallback(
    async (nextUser: User) => {
      window.clearTimeout(pushTimer.current)
      setBootstrapped(false)
      setSyncStatus('syncing')
      setError(null)
      setConflict(null)
      try {
        const row = await fetchCloudState(nextUser.id)
        const cloud = row?.app_data == null ? null : migrateAppData(row.app_data)
        const local = migrateAppData(dataRef.current)
        const cloudHas = cloud !== null && isNonEmptyAppData(cloud)
        const localHas = isNonEmptyAppData(local)

        if (cloudHas && localHas && dataFingerprint(cloud) !== dataFingerprint(local)) {
          setConflict({ cloud, updatedAt: row?.updated_at ?? null })
          setSyncStatus('conflict')
          return
        }

        if (cloudHas && !localHas) {
          skipPushUntil.current = Date.now() + SYNC_DEBOUNCE_MS + 500
          replaceData(cloud)
          setLastSyncedAt(row?.updated_at ?? new Date().toISOString())
          setSyncStatus('synced')
          return
        }

        if (!cloudHas || (cloud && dataFingerprint(cloud) !== dataFingerprint(local))) {
          const updatedAt = await upsertCloudState(nextUser.id, local)
          setLastSyncedAt(updatedAt)
          setSyncStatus('synced')
          return
        }

        setLastSyncedAt(row?.updated_at ?? null)
        setSyncStatus('synced')
      } catch (err) {
        setSyncStatus('error')
        setError(authMessage(err, lang))
      } finally {
        setBootstrapped(true)
      }
    },
    [lang, replaceData],
  )

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const next = session?.user ?? null
      setUser(next)
      setReady(true)
      if (event === 'SIGNED_OUT') {
        setBootstrapped(false)
        setConflict(null)
        setSyncStatus('idle')
        setLastSyncedAt(null)
        setError(null)
        setMagicSent(false)
        setSignupSent(false)
        return
      }
      if (next && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
        setSignupSent(false)
        setMagicSent(false)
        void reconcile(next)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [reconcile])

  useEffect(() => {
    if (!user || !ready || !bootstrapped || conflict) return
    if (Date.now() < skipPushUntil.current) return
    window.clearTimeout(pushTimer.current)
    pushTimer.current = window.setTimeout(() => {
      const current = userRef.current
      if (!current || conflictRef.current) return
      void pushState(current.id, dataRef.current)
    }, SYNC_DEBOUNCE_MS)
    return () => window.clearTimeout(pushTimer.current)
  }, [data, user, ready, bootstrapped, conflict, pushState])

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null)
      setMagicSent(false)
      setSignupSent(false)
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) throw new Error(authMessage(authError, lang))
    },
    [lang],
  )

  const signUp = useCallback(
    async (email: string, password: string) => {
      setError(null)
      setMagicSent(false)
      setSignupSent(false)
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: authRedirectTo() },
      })
      if (authError) throw new Error(authMessage(authError, lang))
      if (!data.session) setSignupSent(true)
    },
    [lang],
  )

  const sendMagicLink = useCallback(
    async (email: string) => {
      setError(null)
      setSignupSent(false)
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: authRedirectTo() },
      })
      if (authError) throw new Error(authMessage(authError, lang))
      setMagicSent(true)
    },
    [lang],
  )

  const signOut = useCallback(async () => {
    window.clearTimeout(pushTimer.current)
    setError(null)
    const { error: authError } = await supabase.auth.signOut()
    if (authError) throw new Error(authMessage(authError, lang))
  }, [lang])

  const syncNow = useCallback(async () => {
    const current = userRef.current
    if (!current) return
    window.clearTimeout(pushTimer.current)
    if (conflictRef.current) {
      setSyncStatus('conflict')
      return
    }
    await pushState(current.id, dataRef.current)
  }, [pushState])

  const useCloud = useCallback(async () => {
    if (!conflict) return
    skipPushUntil.current = Date.now() + SYNC_DEBOUNCE_MS + 500
    replaceData(conflict.cloud)
    setLastSyncedAt(conflict.updatedAt ?? new Date().toISOString())
    setConflict(null)
    setSyncStatus('synced')
  }, [conflict, replaceData])

  const keepLocal = useCallback(async () => {
    const current = userRef.current
    if (!current || !conflict) return
    setConflict(null)
    await pushState(current.id, dataRef.current)
  }, [conflict, pushState])

  const api = useMemo<AuthApi>(
    () => ({
      user,
      ready,
      syncStatus,
      lastSyncedAt,
      conflict,
      error,
      magicSent,
      signupSent,
      signIn,
      signUp,
      sendMagicLink,
      signOut,
      syncNow,
      useCloud,
      keepLocal,
      clearError,
      clearMagicSent,
      clearSignupSent,
    }),
    [
      user,
      ready,
      syncStatus,
      lastSyncedAt,
      conflict,
      error,
      magicSent,
      signupSent,
      signIn,
      signUp,
      sendMagicLink,
      signOut,
      syncNow,
      useCloud,
      keepLocal,
      clearError,
      clearMagicSent,
      clearSignupSent,
    ],
  )

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
