import type { Medication, ParsedNote } from '../types'
import { translate } from '../i18n/translations'
import { type GeminiConfig, type GeminiNoteResult, parseNoteWithGemini } from './gemini'
import { HABITS, SYMPTOMS, aliasesOf, detectTags, mentions, normalizeTag } from './knowledge'
import { normalizeText } from './text'

const TOOK_VERB =
  /\b(took|taken|take|had|popped|swallowed|downed|logged|used|tomei|tomou|tomado|tomar|usei|engoli|bebi|ingeri|aplicado|apliquei)\b/
const POSITIVE =
  /\b(great|good|well|better|energi[sz]ed|rested|calm|relaxed|happy|fine|amazing|otimo|otima|bem|melhor|descansad[oa]|calm[oa]|relaxad[oa]|feliz|disposto|disposta|animad[oa]|tranquil[oa])\b/
const NEGATIVE =
  /\b(bad|worse|poor|terrible|awful|pain|headache|nausea|nauseous|queasy|dizzy|tired|anxious|sick|sore|rough|ruim|pior|pessim[oa]|dor|enjoo|enjoad[oa]|tontura|cansad[oa]|ansios[oa]|mal|doente)\b/

const toClock = (h: number, m: number) => (h < 24 && m < 60 ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` : null)

const parseClock = (raw: string): string | null => {
  const text = normalizeText(raw)
  const ampm = text.match(/\b(?:at\s+|around\s+|about\s+|@\s*)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/)
  if (ampm) {
    let h = Number(ampm[1])
    const m = Number(ampm[2] ?? 0)
    const pm = /p/.test(ampm[3])
    if (h === 12) h = pm ? 12 : 0
    else if (pm) h += 12
    const clock = toClock(h, m)
    if (clock) return clock
  }
  const period = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(?:h|horas?)?\s*da\s*(manha|tarde|noite|madrugada)\b/)
  if (period) {
    let h = Number(period[1])
    const m = Number(period[2] ?? 0)
    if ((period[3] === 'tarde' || period[3] === 'noite') && h < 12) h += 12
    if (period[3] === 'noite' && h === 12) h = 0
    const clock = toClock(h, m)
    if (clock) return clock
  }
  const h24 = text.match(/\b(?:at\s+|as\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/)
  if (h24) return `${h24[1].padStart(2, '0')}:${h24[2]}`
  const hSuffix = text.match(/\b([01]?\d|2[0-3])\s*h(?:\s*([0-5]\d))?\b/)
  if (hSuffix) return toClock(Number(hSuffix[1]), Number(hSuffix[2] ?? 0))
  return null
}

const parseDayPart = (raw: string): string | null => {
  const text = normalizeText(raw)
  if (/\b(this )?morning\b|\bbreakfast\b|\bmanha\b|\bcafe da manha\b/.test(text)) return '08:00'
  if (/\blunch\b|\bnoon\b|\balmoco\b|\bmeio[- ]dia\b/.test(text)) return '12:30'
  if (/\bafternoon\b|\btarde\b/.test(text)) return '15:00'
  if (/\bevening\b|\bdinner\b|\bjantar\b|\bjantei\b/.test(text)) return '19:00'
  if (/\btonight\b|\blast night\b|\bat night\b|\bbedtime\b|\bnoite\b|\bantes de dormir\b|\bmadrugada\b/.test(text)) return '22:00'
  return null
}

const parseDayOffset = (raw: string) => {
  const text = normalizeText(raw)
  if (/\banteontem\b/.test(text)) return -2
  if (/\byesterday\b|\blast night\b|\bontem\b|\bnoite passada\b/.test(text)) return -1
  const ago = text.match(/\b(\d+)\s+(?:days?\s+ago|dias\s+atras)\b/)
  if (ago) return -Number(ago[1])
  return 0
}

export const resolveOccurredAt = (time: string | null, dayOffset: number, now: Date) => {
  const when = new Date(now)
  when.setDate(when.getDate() + dayOffset)
  if (!time) return when.toISOString()
  const [h, m] = time.split(':').map(Number)
  when.setHours(h, m, 0, 0)
  if (when.getTime() > now.getTime() && dayOffset === 0) when.setDate(when.getDate() - 1)
  if (when.getTime() > now.getTime()) return now.toISOString()
  return when.toISOString()
}

export const parseNoteLocally = (text: string, meds: Medication[], now = new Date()): ParsedNote => {
  const medIds = meds.filter((m) => mentions(text, aliasesOf(m))).map((m) => m.id)
  const plain = normalizeText(text)
  const tookMedIds = TOOK_VERB.test(plain) ? medIds : []
  const symptoms = detectTags(text, SYMPTOMS)
  const habits = detectTags(text, HABITS)

  let mood: ParsedNote['mood'] = 'neutral'
  if (NEGATIVE.test(plain) || symptoms.length) mood = 'negative'
  if (POSITIVE.test(plain) && !symptoms.length) mood = 'positive'

  const time = parseClock(text) ?? parseDayPart(text)
  return {
    medIds,
    tookMedIds,
    symptoms,
    habits,
    mood,
    occurredAt: resolveOccurredAt(time, parseDayOffset(text), now),
    source: 'local',
  }
}

const fromGemini = (raw: GeminiNoteResult, meds: Medication[], text: string, now: Date): ParsedNote => {
  const valid = new Set(meds.map((m) => m.id))
  const medIds = [...new Set((raw.medIds ?? []).filter((id) => valid.has(id)))]
  const tookMedIds = [...new Set((raw.tookMedIds ?? []).filter((id) => medIds.includes(id)))]
  const symptoms = [...new Set((raw.symptoms ?? []).map((s) => normalizeTag(String(s), SYMPTOMS)).filter(Boolean))]
  const habits = [...new Set((raw.habits ?? []).map((h) => normalizeTag(String(h), HABITS)).filter(Boolean))]
  const time = raw.time && /^\d{1,2}:\d{2}$/.test(raw.time) ? raw.time : parseClock(text)
  const offset = typeof raw.dayOffset === 'number' ? Math.min(0, Math.max(-60, Math.round(raw.dayOffset))) : parseDayOffset(text)
  return {
    medIds,
    tookMedIds,
    symptoms,
    habits,
    mood: raw.mood === 'positive' || raw.mood === 'negative' ? raw.mood : 'neutral',
    occurredAt: resolveOccurredAt(time, offset, now),
    source: 'gemini',
  }
}

export interface AnalyzeResult {
  parsed: ParsedNote
  warning?: string
}

export const analyzeNote = async (
  text: string,
  meds: Medication[],
  gemini: GeminiConfig | null,
  now = new Date(),
): Promise<AnalyzeResult> => {
  if (gemini) {
    try {
      const raw = await parseNoteWithGemini(gemini, text, meds, now)
      return { parsed: fromGemini(raw, meds, text, now) }
    } catch (error) {
      return {
        parsed: parseNoteLocally(text, meds, now),
        warning: `${error instanceof Error ? error.message : translate(gemini.language, 'common.geminiFailed')} ${translate(gemini.language, 'dump.fallback')}`,
      }
    }
  }
  return { parsed: parseNoteLocally(text, meds, now) }
}
