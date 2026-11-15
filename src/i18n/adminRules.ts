import { knownAdminRules } from '../data/anvisaMeds'
import { normalizeText } from '../lib/text'
import type { Lang } from './translations'

export interface RulePair {
  pt: string
  en: string
}

export const ADMIN_RULE_PRESETS: RulePair[] = [
  { pt: 'Em jejum', en: 'On an empty stomach' },
  { pt: 'Com alimentos', en: 'With food' },
  { pt: 'Espaçar 4h de minerais', en: 'Space 4h from minerals' },
  { pt: 'Ao deitar', en: 'At bedtime' },
]

const SPACING_PATTERN = /(?:espa[cç]ar|space|separate)\s*(\d+(?:[.,]\d+)?)\s*h/i

let lookup: Map<string, RulePair> | null = null

const getLookup = () => {
  if (!lookup) {
    lookup = new Map()
    ;[...ADMIN_RULE_PRESETS, ...knownAdminRules()].forEach((pair) => {
      lookup?.set(normalizeText(pair.pt), pair)
      lookup?.set(normalizeText(pair.en), pair)
    })
  }
  return lookup
}

export const localizeAdminRule = (rule: string | undefined, lang: Lang) => {
  if (!rule) return rule
  const pair = getLookup().get(normalizeText(rule.trim()))
  if (!pair) return rule
  return lang === 'pt-BR' ? pair.pt : pair.en
}

export const adminRuleHours = (rule?: string) => {
  const match = rule?.match(SPACING_PATTERN)
  return match ? Number(match[1].replace(',', '.')) : undefined
}
