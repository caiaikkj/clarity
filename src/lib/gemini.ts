import type { Interaction, Medication } from '../types'
import { LANG_NAME, translate, type Lang } from '../i18n/translations'
import { normalizeLeaflet } from './leaflet'

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
  temperature?: number
  signal?: AbortSignal
}

const extractText = (data: GenerateContentResponse | null) => {
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  return parts
    .map((part) => part.text ?? '')
    .join('')
    .trim()
}

const callGemini = async ({ apiKey, model, language, input, json, temperature, signal }: CallOptions) => {
  let response: Response
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const generationConfig = {
    ...(json ? { responseMimeType: 'application/json' } : {}),
    ...(temperature === undefined ? {} : { temperature }),
  }
  try {
    response = await fetch(endpointFor(model || DEFAULT_MODEL, apiKey), {
      method: 'POST',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: input }],
        ...(Object.keys(generationConfig).length ? { generationConfig } : {}),
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

const unwrapText = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(unwrapText).filter(Boolean).join(' ')
  if (value && typeof value === 'object') return Object.values(value).map(unwrapText).filter(Boolean).join(' ')
  return ''
}

const plainText = (raw: string) => {
  const cleaned = raw
    .replace(/^\s*```(?:json|text|markdown)?/i, '')
    .replace(/```\s*$/, '')
    .trim()
  if (!/^[{[]/.test(cleaned)) return cleaned
  try {
    return unwrapText(JSON.parse(cleaned)).trim() || cleaned
  } catch {
    return cleaned
  }
}

const PLAIN_TEXT_RULE = 'Output format: reply with plain prose only. Do not use JSON, objects, keys, markdown, bullet points or code fences.'

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

export interface BarcodeIdentification extends ScannedMedication {
  recognized?: boolean
}

export const identifyBarcodeWithGemini = async (config: GeminiConfig, code: string) => {
  const prompt = `A user scanned the barcode (EAN/GTIN) "${code}" printed on a medication or supplement package sold in Brazil.
Identify the product only if you are highly confident that this exact code belongs to a known product. Never guess or invent a product from a partial pattern.
Return JSON only with this shape:
{
  "recognized": boolean,
${SCAN_SCHEMA.slice(1)}
If you are not confident, set recognized to false and leave every other field empty (or null).
${languageRule(config.language)} The "activeIngredient" and "explanation" values must follow that language.`
  const raw = await callGemini({ ...config, input: [text(prompt)], json: true })
  return parseJson<BarcodeIdentification>(raw, config.language)
}

const SUMMARY_TEMPERATURE = 0.2

const SEVERITY_MEANING: Record<Interaction['severity'], string> = {
  safe: 'SAFE: no meaningful interaction. Say it is fine to take together.',
  monitor: 'MONITOR: minor or situational. Say to keep an eye on it. Never call it dangerous, serious or risky.',
  caution: 'CAUTION: needs care. Explain the concern calmly and suggest confirming with a pharmacist or doctor.',
}

export const summarizeInteractionsWithGemini = async (config: GeminiConfig, interactions: Interaction[]) => {
  const reviewed = interactions.map((i) => ({
    pair: `${i.aLabel} + ${i.bLabel}`,
    status: i.known ? i.severity.toUpperCase() : 'NOT ASSESSED',
    note: i.explanation,
    advice: i.advice,
  }))
  const prompt = `You are a calm, clear health explainer. In under 120 words and plain language, explain the interaction results below to a patient.

Strict rules:
- Use ONLY the pairs and statuses listed below. Never add combinations, risks or claims from your own knowledge, and never change a status.
- Match your tone to each pair's status exactly:
${Object.values(SEVERITY_MEANING)
  .map((line) => `  ${line}`)
  .join('\n')}
  NOT ASSESSED: say there is no data for it, without implying risk.
- Start with the most important pair that is not SAFE. If every pair is SAFE, say reassuringly that nothing needs attention.
- Mention SAFE pairs briefly as fine to combine.
- Short sentences, no jargon. Do not diagnose and do not tell the patient to stop any medication. Finish with one practical tip drawn from the notes.
${languageRule(config.language)}
${PLAIN_TEXT_RULE}

Results: ${JSON.stringify(reviewed)}`
  return plainText(await callGemini({ ...config, input: [text(prompt)], temperature: SUMMARY_TEMPERATURE }))
}

export const summarizeBriefingWithGemini = async (config: GeminiConfig, context: string) => {
  const prompt = `Write a concise, neutral clinical-style paragraph (max 120 words) summarising the patient data below for a doctor's appointment. Mention adherence, any low-stock items, notable symptom patterns and flagged interactions. Do not diagnose.
${languageRule(config.language)}
${PLAIN_TEXT_RULE}

${context}`
  return plainText(await callGemini({ ...config, input: [text(prompt)] }))
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

export interface LeafletRequest {
  name: string
  strength: string
  form: string
  activeIngredient?: string
  ingredients: string[]
  adminRule?: string
}

export const generateLeaflet = async (config: GeminiConfig, med: LeafletRequest, signal?: AbortSignal) => {
  const product = {
    commercialName: med.name,
    strength: med.strength || null,
    pharmaceuticalForm: med.form,
    activeIngredient: med.activeIngredient || med.ingredients.join(' + ') || null,
    knownAdministrationRule: med.adminRule || null,
  }
  const prompt = `You are a Brazilian clinical pharmacist writing a patient-friendly package insert (bula) summary for this product: ${JSON.stringify(product)}.

Rules:
- Be accurate, conservative and clinically responsible. Use only well-established information about this active ingredient and presentation. If you are unsure about a detail, leave it out or tell the patient to confirm with a pharmacist.
- Never give a personal dose, never diagnose, and never tell the patient to stop or change a treatment on their own.
- For posology, give only general reference guidance from typical package inserts. Always state clearly that individualized dosing, schedule and duration require medical or pharmacist guidance — never invent a specific personal regimen.
- Write short, clear, jargon-free items (max 25 words each), 2 to 5 items per list.
- Return JSON only with this exact shape:
{
  "indications": string[],
  "posology": {
    "generalUsage": string[],           // general administration guidance from the leaflet
    "frequencyGuidelines": string[],    // that dose timing/interval needs clinical assessment; typical reference ranges only if well established
    "safetyNotice": string[]            // safety limits and the need to follow the individual medical/pharmacist prescription strictly
  },
  "administration": string[],           // food/fasting, whether tablets can be split/crushed, drop dilution, spacing from other substances
  "sideEffects": string[],              // common side effects, then warning signs that need medical attention
  "contraindications": string[]         // who should not take it, key precautions, and how to store it
}
${languageRule(config.language)} Every string item must follow that language.`
  const raw = await callGemini({ ...config, input: [text(prompt)], json: true, temperature: SUMMARY_TEMPERATURE, signal })
  const leaflet = normalizeLeaflet(parseJson<unknown>(raw, config.language))
  if (!leaflet) throw new GeminiError(translate(config.language, 'gemini.unreadable'))
  return leaflet
}

const MAX_OBSERVATIONS = 3

export const generateInsightObservations = async (config: GeminiConfig, digest: string, signal?: AbortSignal) => {
  const prompt = `You are a careful clinical pharmacist reviewing a patient's last 14 days of medication adherence and personal notes. The data below is a compact local summary (no free text).

Strict rules:
- Write exactly ${MAX_OBSERVATIONS} concise observations (max 35 words each), each grounded only in the data below. Never invent medications, doses, symptoms or numbers.
- Patterns are correlations, not causes: never claim a medication caused a symptom, never diagnose, and never tell the patient to stop, skip or change a medication or dose.
- Cover, when the data allows: the time of day with the best or worst on-time adherence, a recurring symptom and any medication taken in the previous 4 hours, and one practical, low-risk habit suggestion. If the data is too thin for a point, say so briefly instead of guessing.
- When a pattern could matter clinically, suggest discussing it with a pharmacist or doctor.
- Calm, plain, non-alarming language.
Return JSON only: { "observations": string[] }
${languageRule(config.language)} Every observation must follow that language.

Data: ${digest}`
  const raw = await callGemini({ ...config, input: [text(prompt)], json: true, temperature: SUMMARY_TEMPERATURE, signal })
  const parsed = parseJson<{ observations?: unknown }>(raw, config.language)
  const observations = (Array.isArray(parsed.observations) ? parsed.observations : [])
    .map((item) => unwrapText(item).trim())
    .filter(Boolean)
    .slice(0, MAX_OBSERVATIONS)
  if (observations.length === 0) throw new GeminiError(translate(config.language, 'gemini.unreadable'))
  return observations
}

export interface MixGeminiResult {
  verdict: 'safe' | 'space' | 'avoid'
  hours?: number | null
  title?: string
  explanation?: string
  advice?: string
}

export const checkMixWithGemini = async (
  config: GeminiConfig,
  query: string,
  meds: { name: string; strength: string; activeIngredient?: string }[],
  local: { verdict: string; title: string; explanation: string; known: boolean },
  signal?: AbortSignal,
) => {
  const prompt = `You are a careful clinical pharmacist. A patient asks whether they can take or mix "${query}" with their current regimen.

Current medications: ${JSON.stringify(meds)}
Local rule engine result (may be incomplete): ${JSON.stringify(local)}

Return JSON only:
{
  "verdict": "safe" | "space" | "avoid",
  "hours": number | null,          // if verdict is "space", suggested separation in hours
  "title": string,                 // short label
  "explanation": string,           // max 45 words, plain language
  "advice": string                 // max 25 words practical tip
}

Rules:
- Prefer "space" over "avoid" when timing separation is enough.
- Never tell the patient to stop a prescribed medication on their own.
- If unsure, choose the more cautious verdict and say to confirm with a pharmacist.
- Do not invent medications that are not listed.
${languageRule(config.language)}`
  const raw = await callGemini({ ...config, input: [text(prompt)], json: true, temperature: SUMMARY_TEMPERATURE, signal })
  return parseJson<MixGeminiResult>(raw, config.language)
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
