export type Category = 'prescription' | 'supplement' | 'otc'
export type Severity = 'safe' | 'monitor' | 'caution'
export type ViewId = 'today' | 'cabinet' | 'brain' | 'briefing'
export type ModalId = 'add' | 'settings' | 'guide' | null

export interface FdaInfo {
  source: 'openFDA' | 'gemini' | 'none'
  brandName?: string
  genericName?: string
  manufacturer?: string
  ingredients: string[]
  purpose?: string
  prescriptionOnly?: boolean
  warnings?: string
  interactions?: string
  inn?: string[]
  summaryPt?: string
  warningsPt?: string
  interactionsPt?: string
  localizedLang?: 'pt-BR' | 'en-US'
}

export interface LeafletSummary {
  indications: string[]
  administration: string[]
  sideEffects: string[]
  contraindications: string[]
  generatedAt: string
}

export type LeafletCache = Partial<Record<'pt-BR' | 'en-US', LeafletSummary>>

export interface Medication {
  id: string
  name: string
  strength: string
  form: string
  category: Category
  asNeeded: boolean
  times: string[]
  pillsPerDose: number
  stock: number
  refillThreshold: number
  instructions: string
  notes: string
  ingredients: string[]
  startDate: string
  fda?: FdaInfo
  activeIngredient?: string
  adminRule?: string
  lastPaidPrice?: number
  pmc?: number
  lastPharmacy?: string
  lastPaidAt?: string
  spacingHours?: number
  spacingTarget?: string
  leafletSummary?: LeafletCache
}

export interface SpacingInfo {
  requiredHours: number
  gapMinutes: number | null
  conflict: boolean
}

export interface DoseLog {
  id: string
  medId: string
  date: string
  time: string
  dueTime?: string
  takenAt: string
}

export interface Note {
  id: string
  text: string
  createdAt: string
  occurredAt: string
  medIds: string[]
  tookMedIds: string[]
  symptoms: string[]
  habits: string[]
  mood?: 'positive' | 'neutral' | 'negative'
  source: 'gemini' | 'local'
  doseLogged?: boolean
}

export interface DoseShift {
  doseId: string
  medId: string
  date: string
  fromTime: string
  toTime: string
  hours: number
  causeDoseId: string
  causeMedId: string
  causeName: string
  causeTakenAt: string
}

export interface AppData {
  meds: Medication[]
  logs: DoseLog[]
  notes: Note[]
  shifts?: DoseShift[]
}

export interface Settings {
  geminiKey: string
  model: string
}

export interface Dose {
  id: string
  medId: string
  date: string
  time: string
  baseTime: string
  log?: DoseLog
  shift?: DoseShift
}

export type TimeBlock = 'morning' | 'afternoon' | 'night'

export interface Interaction {
  id: string
  aId: string
  bId: string
  aLabel: string
  bLabel: string
  severity: Severity
  title: string
  explanation: string
  advice: string
  known: boolean
  spacing?: SpacingInfo
}

export interface ParsedNote {
  medIds: string[]
  tookMedIds: string[]
  symptoms: string[]
  habits: string[]
  mood?: 'positive' | 'neutral' | 'negative'
  occurredAt: string
  source: 'gemini' | 'local'
}
