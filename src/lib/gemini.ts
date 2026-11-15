import type { Interaction, Medication } from '../types'
import { LANG_NAME, translate, type Lang } from '../i18n/translations'

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite'
export const MODEL_OPTIONS = [DEFAULT_MODEL]

const BASE_URL = 'https://' + 'generativelanguage' + '.googleapis.com' + '/v1beta/models'
const REQUEST_TIMEOUT_MS = 20000

const endpointFor = (model: string, apiKey: string) =>
  `${BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

export class GeminiError extends Error {}

export interface ImageData {
  mimeType: string
  data: string
}

type InputBlock = { text: string } | { inlineData: { mimeType: string; data: string } }

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  error?: { message?: string }
}

interface CallOptions {
  apiKey: string
  model: string
  language: Lang
  input: InputBlock[]
  json?: boolean
  signal?: AbortSignal
}

const extractText = (data: GenerateContentResponse | null) => {
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  return parts
    .map((part) => part.text ?? '')
    .join('')
    .trim()
}

const callGemini = async ({ apiKey, model, language, input, json, signal }: CallOptions) => {
  let response: Response
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  try {
    response = await fetch(endpointFor(model || DEFAULT_MODEL, apiKey), {
      method: 'POST',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: input }],
        ...(json ? { generationConfig: { responseMimeType: 'application/json' } } : {}),
      }),
    })
  } catch {
    throw new GeminiError(translate(language, timeout.aborted ? 'gemini.timeout' : 'gemini.network'))
  }
  const data: GenerateContentResponse | null = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data?.error?.message
    if (response.status === 400 && /api key/i.test(message ?? '')) throw new GeminiError(translate(language, 'gemini.badKey'))
    if (response.status === 403) throw new GeminiError(translate(language, 'gemini.forbidden'))
    if (response.status === 404) throw new GeminiError(translate(language, 'gemini.notFound'))
    if (response.status === 429) throw new GeminiError(translate(language, 'gemini.rateLimit'))
    throw new GeminiError(message ?? translate(language, 'gemini.failed', { status: response.status }))
  }
  const text = extractText(data)
  if (!text) throw new GeminiError(translate(language, 'gemini.empty'))
  return text
}

const parseJson = <T>(raw: string, language: Lang): T => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const cleaned = (fenced ? fenced[1] : raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '')).trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    throw new GeminiError(translate(language, 'gemini.unreadable'))
  }
}

const languageRule = (language: Lang) =>
  `Language: write every human-readable text value in ${LANG_NAME[language]}. Keep JSON keys, ids and enum values exactly as specified.`

const text = (value: string): InputBlock => ({ text: value })

export interface GeminiConfig {
  apiKey: string
  model: string
  language: Lang
}

export const testGeminiKey = async (config: GeminiConfig) => {
  await callGemini({ ...config, input: [text('Reply with the single word: ok')] })
}

export interface GeminiNoteResult {
  medIds?: string[]
  tookMedIds?: string[]
  symptoms?: string[]
  habits?: string[]
  mood?: 'positive' | 'neutral' | 'negative'
  time?: string | null
  dayOffset?: number
}

export const parseNoteWithGemini = async (config: GeminiConfig, entry: string, meds: Medication[], now: Date) => {
  const catalog = meds.map((m) => ({ id: m.id, name: m.name, strength: m.strength }))
  const prompt = `You extract structured data from a personal health journal entry written in ${LANG_NAME[config.language]} (it may mix languages).
Current local time: ${now.toString()}.
The user's medications (id, name): ${JSON.stringify(catalog)}.

Entry: """${entry}"""

Return JSON only with this exact shape:
{
  "medIds": string[],       // ids from the list that the entry mentions or refers to
  "tookMedIds": string[],   // subset of medIds that the user says they actually took
  "symptoms": string[],     // short lowercase symptom tags, e.g. "headache", "nausea"
  "habits": string[],       // short lowercase lifestyle tags, e.g. "caffeine", "alcohol", "exercise", "good sleep", "poor sleep", "skipped meal", "stress"
  "mood": "positive" | "neutral" | "negative",
  "time": string | null,    // 24h "HH:MM" of when the event happened if stated or implied (e.g. "10pm" or "22h" -> "22:00", "this morning" -> "08:00"), else null
  "dayOffset": number       // 0 for today, -1 for yesterday, etc.
}
Write the symptom and habit tags in ${LANG_NAME[config.language]}. Only use ids from the list. Do not invent medications.`
  const raw = await callGemini({ ...config, input: [text(prompt)], json: true })
  return parseJson<GeminiNoteResult>(raw, config.language)
}

export interface ScannedMedication {
  name?: string
  strength?: string
  form?: string
  category?: 'prescription' | 'supplement' | 'otc'
  instructions?: string
  quantity?: number
  timesPerDay?: number
  asNeeded?: boolean
  bedtime?: boolean
  ingredients?: string[]
  activeIngredient?: string
  explanation?: string
}

const SCAN_SCHEMA = `{
  "name": string,                 // brand or product name as printed
  "strength": string,             // e.g. "50 mg", "2000 IU"
  "form": string,                 // one of: Tablet, Capsule, Softgel, Liquid, Gummy, Patch, Inhaler, Other
  "category": "prescription" | "supplement" | "otc",
  "instructions": string,         // directions to take, copied or summarised
  "quantity": number | null,      // number of pills dispensed or in the package
  "timesPerDay": number | null,   // scheduled doses per day, null if unclear
  "asNeeded": boolean,            // true if taken only as needed / PRN
  "bedtime": boolean,             // true if directions say bedtime / at night
  "ingredients": string[],        // active ingredients if visible
  "activeIngredient": string,     // active ingredient (Principio Ativo) if identifiable, e.g. "Cloridrato de sertralina"
  "explanation": string           // 1-2 short sentences explaining what this medication is for and how to take it
}`

export const scanMedicationWithGemini = async (config: GeminiConfig, source: { text?: string; image?: ImageData }) => {
  const intro = `Extract medication details from the ${source.image ? 'photo of a pill bottle, blister pack or prescription label' : 'prescription text'}.
If a field is not present, use null (or an empty string / array). Return JSON only with this shape:
${SCAN_SCHEMA}
${languageRule(config.language)} The "instructions", "activeIngredient" and "explanation" values must follow that language.`
  const input: InputBlock[] = [text(source.text ? `${intro}\n\nText:\n"""${source.text}"""` : intro)]
  if (source.image) input.push({ inlineData: { mimeType: source.image.mimeType, data: source.image.data } })
  const raw = await callGemini({ ...config, input, json: true })
  return parseJson<ScannedMedication>(raw, config.language)
}

export const summarizeInteractionsWithGemini = async (config: GeminiConfig, meds: Medication[], interactions: Interaction[]) => {
  const flagged = interactions
    .filter((i) => i.known && i.severity !== 'safe')
    .map((i) => ({ pair: `${i.aLabel} + ${i.bLabel}`, severity: i.severity, note: i.explanation }))
  const prompt = `You are a calm, clear health explainer. In under 140 words and plain language, summarise these medication and supplement interaction flags for a patient. Start with the most important point, use short sentences, avoid jargon, and finish with one practical tip. Do not diagnose and do not tell them to stop any medication; recommend confirming with their pharmacist or doctor where relevant.
${languageRule(config.language)}

Active items: ${meds.map((m) => `${m.name} ${m.strength}`).join(', ')}
Flags: ${flagged.length ? JSON.stringify(flagged) : 'none'}`
  return callGemini({ ...config, input: [text(prompt)] })
}

export const summarizeBriefingWithGemini = async (config: GeminiConfig, context: string) => {
  const prompt = `Write a concise, neutral clinical-style paragraph (max 120 words) summarising the patient data below for a doctor's appointment. Mention adherence, any low-stock items, notable symptom patterns and flagged interactions. Do not diagnose. Use plain text only.
${languageRule(config.language)}

${context}`
  return callGemini({ ...config, input: [text(prompt)] })
}

export interface BrazilBridgeResult {
  recognized?: boolean
  activeIngredientPt?: string
  innEn?: string[]
  brazilianOnly?: boolean
  suggestedAdminRule?: string | null
  strength?: string | null
}

export const normalizeBrazilianMedication = async (config: GeminiConfig, name: string) => {
  const prompt = `You are a Brazilian clinical pharmacist. The user typed a medication name that may be a Brazilian brand (e.g. "Novalgina", "Puran T4", "Torsilax"), a generic in Portuguese, or an English name: "${name}".

Identify the Principio Ativo and its English generic name (INN / US adopted name as used in FDA labels). Return JSON only:
{
  "recognized": boolean,
  "activeIngredientPt": string,        // Principio Ativo in Brazilian Portuguese, e.g. "Dipirona sodica". Join multiple with " + ".
  "innEn": string[],                   // one lowercase English generic name per active ingredient, e.g. ["levothyroxine"]. Use US names (acetaminophen, not paracetamol).
  "brazilianOnly": boolean,            // true if no active ingredient is FDA approved in the US (e.g. dipyrone/metamizole)
  "suggestedAdminRule": string | null, // short administration hint in ${LANG_NAME[config.language]}, e.g. ${config.language === 'pt-BR' ? '"Em jejum", "Com alimentos", "Espaçar 4h de minerais"' : '"On an empty stomach", "With food", "Space 4h from minerals"'}; null if none
  "strength": string | null            // strength if it was part of the typed text
}
If you do not recognise the name, set recognized to false and leave other fields empty.`
  const raw = await callGemini({ ...config, input: [text(prompt)], json: true })
  return parseJson<BrazilBridgeResult>(raw, config.language)
}

export interface LocalizedNotes {
  summary?: string
  warnings?: string
  interactions?: string
}

export interface LabelExcerpt {
  ingredient: string
  purpose?: string
  warnings?: string
  interactions?: string
}

export const localizeLabel = async (config: GeminiConfig, name: string, excerpts: LabelExcerpt[]) => {
  const prompt = `Translate and summarise these FDA drug label excerpts for "${name}" into concise, plain ${LANG_NAME[config.language]} for a patient. Keep only what matters in practice. Do not add facts that are not in the excerpts. Return JSON only:
{
  "summary": string,       // what it is for, max 40 words
  "warnings": string,      // key warnings, max 70 words
  "interactions": string   // key interactions to avoid, max 60 words; empty string if the excerpts have none
}

Excerpts:
${JSON.stringify(excerpts)}`
  const raw = await callGemini({ ...config, input: [text(prompt)], json: true })
  return parseJson<LocalizedNotes>(raw, config.language)
}

export const generateNotes = async (config: GeminiConfig, name: string, activeIngredient: string, innEn: string[]) => {
  const prompt = `You are a Brazilian clinical pharmacist. There is no FDA label for "${name}" (active ingredient: ${activeIngredient || innEn.join(', ') || 'unknown'}), for example because it is only sold in Brazil. Write concise pharmacological and interaction notes in ${LANG_NAME[config.language]} for a patient. Be accurate and conservative; if unsure, say so. Return JSON only:
{
  "summary": string,       // what it is and how it works, max 45 words
  "warnings": string,      // main precautions and adverse effects, max 70 words
  "interactions": string   // main drug and substance interactions (e.g. alcohol, anticoagulants, other NSAIDs), max 60 words
}`
  const raw = await callGemini({ ...config, input: [text(prompt)], json: true })
  return parseJson<LocalizedNotes>(raw, config.language)
}
