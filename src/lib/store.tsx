import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { AppData, Dose, DoseLog, Medication, ModalId, Note, ParsedNote, Settings, ViewId } from '../types'
import { DEFAULT_MODEL, MODEL_OPTIONS } from './gemini'
import { dateKey, minutesOf } from './dates'
import { rescheduleAfterTake } from './rescheduler'
import { doseId, dosesForDate } from './schedule'
import { uid } from './id'

const DATA_KEY = 'clarity:data:v1'
const SETTINGS_KEY = 'clarity:settings:v1'

const EMPTY_DATA: AppData = { meds: [], logs: [], notes: [] }

type Action =
  | { type: 'take'; medId: string; date: string; time: string; takenAt: string }
  | { type: 'undo'; doseId: string }
  | { type: 'restoreShift'; doseId: string }
  | { type: 'prn'; medId: string; takenAt: string }
  | { type: 'addMed'; med: Medication }
  | { type: 'removeMed'; id: string }
  | { type: 'refill'; id: string; quantity: number }
  | { type: 'updateMed'; id: string; patch: Partial<Medication> }
  | { type: 'addNote'; note: Note }
  | { type: 'removeNote'; id: string }
  | { type: 'logNoteDose'; noteId: string }
  | { type: 'replace'; data: AppData }

const adjustStock = (meds: Medication[], medId: string, delta: number) =>
  meds.map((m) => (m.id === medId ? { ...m, stock: Math.max(0, m.stock + delta) } : m))

const reducer = (state: AppData, action: Action): AppData => {
  switch (action.type) {
    case 'take': {
      const id = doseId(action.medId, action.date, action.time)
      if (state.logs.some((l) => l.id === id)) return state
      const med = state.meds.find((m) => m.id === action.medId)
      if (!med) return state
      const dueTime = (state.shifts ?? []).find((s) => s.doseId === id)?.toTime ?? action.time
      const log: DoseLog = { id, medId: action.medId, date: action.date, time: action.time, dueTime, takenAt: action.takenAt }
      const next = { ...state, logs: [...state.logs, log], meds: adjustStock(state.meds, med.id, -med.pillsPerDose) }
      const shifts = rescheduleAfterTake(next, { medId: action.medId, date: action.date, baseTime: action.time }, new Date(action.takenAt))
      return { ...next, shifts: shifts.filter((s) => s.doseId !== id) }
    }
    case 'undo': {
      const log = state.logs.find((l) => l.id === action.doseId)
      if (!log) return state
      const med = state.meds.find((m) => m.id === log.medId)
      return {
        ...state,
        logs: state.logs.filter((l) => l.id !== action.doseId),
        meds: med ? adjustStock(state.meds, med.id, med.pillsPerDose) : state.meds,
        shifts: (state.shifts ?? []).filter((s) => s.causeDoseId !== action.doseId),
      }
    }
    case 'restoreShift':
      return { ...state, shifts: (state.shifts ?? []).filter((s) => s.doseId !== action.doseId) }
    case 'prn': {
      const med = state.meds.find((m) => m.id === action.medId)
      if (!med) return state
      const prnId = `prn|${med.id}|${action.takenAt}`
      if (state.logs.some((l) => l.id === prnId)) return state
      const log: DoseLog = {
        id: prnId,
        medId: med.id,
        date: dateKey(new Date(action.takenAt)),
        time: 'prn',
        takenAt: action.takenAt,
      }
      return { ...state, logs: [...state.logs, log], meds: adjustStock(state.meds, med.id, -med.pillsPerDose) }
    }
    case 'addMed':
      return { ...state, meds: [...state.meds, action.med] }
    case 'removeMed':
      return {
        meds: state.meds.filter((m) => m.id !== action.id),
        shifts: (state.shifts ?? []).filter((s) => s.medId !== action.id && s.causeMedId !== action.id),
        logs: state.logs.filter((l) => l.medId !== action.id),
        notes: state.notes.map((n) => ({
          ...n,
          medIds: n.medIds.filter((id) => id !== action.id),
          tookMedIds: n.tookMedIds.filter((id) => id !== action.id),
        })),
      }
    case 'refill':
      return { ...state, meds: adjustStock(state.meds, action.id, action.quantity) }
    case 'updateMed':
      return { ...state, meds: state.meds.map((m) => (m.id === action.id ? { ...m, ...action.patch, id: m.id } : m)) }
    case 'addNote':
      return { ...state, notes: [action.note, ...state.notes] }
    case 'removeNote':
      return { ...state, notes: state.notes.filter((n) => n.id !== action.id) }
    case 'logNoteDose': {
      const note = state.notes.find((n) => n.id === action.noteId)
      if (!note || note.doseLogged) return state
      let next = state
      const when = new Date(note.occurredAt)
      const key = dateKey(when)
      const minutes = when.getHours() * 60 + when.getMinutes()
      note.tookMedIds.forEach((medId) => {
        const med = next.meds.find((m) => m.id === medId)
        if (!med) return
        if (med.asNeeded) {
          next = reducer(next, { type: 'prn', medId, takenAt: note.occurredAt })
          return
        }
        const open = dosesForDate(next.meds, next.logs, key, next.shifts)
          .filter((d) => d.medId === medId && !d.log)
          .sort((a, b) => Math.abs(minutesOf(a.time) - minutes) - Math.abs(minutesOf(b.time) - minutes))[0]
        if (open) {
          next = reducer(next, { type: 'take', medId, date: key, time: open.baseTime, takenAt: note.occurredAt })
        }
      })
      return { ...next, notes: next.notes.map((n) => (n.id === note.id ? { ...n, doseLogged: true } : n)) }
    }
    case 'replace':
      return action.data
  }
}

const loadData = (): AppData => {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppData
      if (Array.isArray(parsed.meds) && Array.isArray(parsed.logs) && Array.isArray(parsed.notes)) {
        const today = dateKey(new Date())
        return { ...parsed, shifts: (Array.isArray(parsed.shifts) ? parsed.shifts : []).filter((s) => s.date === today) }
      }
    }
  } catch {
    localStorage.removeItem(DATA_KEY)
  }
  return EMPTY_DATA
}

const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>
      return { geminiKey: parsed.geminiKey ?? '', model: parsed.model && MODEL_OPTIONS.includes(parsed.model) ? parsed.model : DEFAULT_MODEL }
    }
  } catch {
    localStorage.removeItem(SETTINGS_KEY)
  }
  return { geminiKey: '', model: DEFAULT_MODEL }
}

interface DataApi {
  data: AppData
  settings: Settings
  setSettings: (next: Settings) => void
  take: (dose: Pick<Dose, 'medId' | 'date' | 'baseTime'>) => void
  undo: (id: string) => void
  restoreShift: (doseId: string) => void
  logAsNeeded: (medId: string) => void
  addMed: (med: Omit<Medication, 'id' | 'startDate'>) => void
  removeMed: (id: string) => void
  refill: (id: string, quantity: number) => void
  updateMed: (id: string, patch: Partial<Medication>) => void
  addNote: (text: string, parsed: ParsedNote) => void
  removeNote: (id: string) => void
  logNoteDose: (id: string) => void
  clearAll: () => void
  replaceData: (data: AppData) => void
}

interface UiApi {
  view: ViewId
  setView: (v: ViewId) => void
  modal: ModalId
  openModal: (m: ModalId) => void
}

const DataContext = createContext<DataApi | null>(null)
const UiContext = createContext<UiApi | null>(null)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [data, dispatch] = useReducer(reducer, undefined, loadData)
  const [settings, setSettingsState] = useState<Settings>(loadSettings)
  const [view, setView] = useState<ViewId>('today')
  const [modal, openModal] = useState<ModalId>(null)

  useEffect(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const setSettings = useCallback((next: Settings) => setSettingsState(next), [])

  const api = useMemo<DataApi>(
    () => ({
      data,
      settings,
      setSettings,
      take: (dose) => dispatch({ type: 'take', medId: dose.medId, date: dose.date, time: dose.baseTime, takenAt: new Date().toISOString() }),
      undo: (id) => dispatch({ type: 'undo', doseId: id }),
      restoreShift: (id) => dispatch({ type: 'restoreShift', doseId: id }),
      logAsNeeded: (medId) => dispatch({ type: 'prn', medId, takenAt: new Date().toISOString() }),
      addMed: (med) =>
        dispatch({ type: 'addMed', med: { ...med, id: uid('med'), startDate: dateKey(new Date()) } }),
      removeMed: (id) => dispatch({ type: 'removeMed', id }),
      refill: (id, quantity) => dispatch({ type: 'refill', id, quantity }),
      updateMed: (id, patch) => dispatch({ type: 'updateMed', id, patch }),
      addNote: (text, parsed) =>
        dispatch({
          type: 'addNote',
          note: {
            id: uid('note'),
            text,
            createdAt: new Date().toISOString(),
            occurredAt: parsed.occurredAt,
            medIds: parsed.medIds,
            tookMedIds: parsed.tookMedIds,
            symptoms: parsed.symptoms,
            habits: parsed.habits,
            mood: parsed.mood,
            source: parsed.source,
          },
        }),
      removeNote: (id) => dispatch({ type: 'removeNote', id }),
      logNoteDose: (id) => dispatch({ type: 'logNoteDose', noteId: id }),
      clearAll: () => dispatch({ type: 'replace', data: EMPTY_DATA }),
      replaceData: (next) => dispatch({ type: 'replace', data: next }),
    }),
    [data, settings, setSettings],
  )

  const ui = useMemo<UiApi>(() => ({ view, setView, modal, openModal }), [view, modal])

  return (
    <DataContext.Provider value={api}>
      <UiContext.Provider value={ui}>{children}</UiContext.Provider>
    </DataContext.Provider>
  )
}

export const useData = () => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within AppProvider')
  return ctx
}

export const useUi = () => {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used within AppProvider')
  return ctx
}

export const useNow = (intervalMs = 15_000) => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}