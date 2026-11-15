import type { Category } from '../types'
import type { Lang } from '../i18n/translations'
import { normalizeKey, normalizeText } from '../lib/text'
import raw from './anvisaMeds.json'

export interface AnvisaMed {
  commercialName: string
  activeIngredient: string
  englishGeneric: string
  commonDosages: string[]
  defaultAdminRulePt: string
  defaultAdminRuleEn: string
  category?: Category
  form?: string
  brazilianOnly?: boolean
}

export const ANVISA_MEDS: AnvisaMed[] = raw as AnvisaMed[]

const MULTI_SEPARATOR = '+'
const DEFAULT_LIMIT = 8
const MIN_QUERY_LENGTH = 2

const splitMulti = (value: string) =>
  value
    .split(MULTI_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean)

export const englishGenerics = (med: AnvisaMed) => splitMulti(med.englishGeneric).map((name) => name.toLowerCase())

export const adminRuleFor = (med: AnvisaMed, lang: Lang) => (lang === 'pt-BR' ? med.defaultAdminRulePt : med.defaultAdminRuleEn)

interface IndexedMed {
  med: AnvisaMed
  name: string
  active: string
  english: string
  key: string
}

let index: IndexedMed[] | null = null

const getIndex = () => {
  index ??= ANVISA_MEDS.map((med) => ({
    med,
    name: normalizeText(med.commercialName),
    active: normalizeText(med.activeIngredient),
    english: normalizeText(med.englishGeneric),
    key: normalizeKey(med.commercialName),
  }))
  return index
}

interface Weights {
  start: number
  word: number
  any: number
}

const NAME_WEIGHTS: Weights = { start: 100, word: 80, any: 50 }
const ACTIVE_WEIGHTS: Weights = { start: 70, word: 55, any: 30 }
const ENGLISH_WEIGHTS: Weights = { start: 60, word: 45, any: 25 }

const scoreField = (field: string, query: string, weights: Weights) => {
  if (field.startsWith(query)) return weights.start
  if (field.split(/[^a-z0-9]+/).some((word) => word.startsWith(query))) return weights.word
  if (field.includes(query)) return weights.any
  return 0
}

export const searchAnvisaMeds = (query: string, limit = DEFAULT_LIMIT): AnvisaMed[] => {
  const q = normalizeText(query).trim()
  if (q.length < MIN_QUERY_LENGTH) return []
  return getIndex()
    .map((entry) => ({
      med: entry.med,
      score: Math.max(scoreField(entry.name, q, NAME_WEIGHTS), scoreField(entry.active, q, ACTIVE_WEIGHTS), scoreField(entry.english, q, ENGLISH_WEIGHTS)),
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.med.commercialName.localeCompare(b.med.commercialName))
    .slice(0, limit)
    .map((hit) => hit.med)
}

export const findAnvisaMed = (name: string): AnvisaMed | null => {
  const key = normalizeKey(name)
  if (!key) return null
  const entries = getIndex()
  const exact = entries.find((entry) => entry.key === key)
  if (exact) return exact.med
  const partial = [...entries]
    .sort((a, b) => b.key.length - a.key.length)
    .find((entry) => key.startsWith(`${entry.key} `) || key.endsWith(` ${entry.key}`))
  if (partial) return partial.med
  const byActive = entries.find((entry) => normalizeKey(entry.med.activeIngredient) === key)
  return byActive?.med ?? null
}

export const knownAdminRules = () =>
  ANVISA_MEDS.map((med) => ({ pt: med.defaultAdminRulePt, en: med.defaultAdminRuleEn }))
