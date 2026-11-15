import type { Category } from '../types'
import { stripAccents } from './text'
import { findKnownDrug } from './knowledge'
import type { ScannedMedication } from './gemini'

const FORMS: [RegExp, string][] = [
  [/softgel|capsula mole/i, 'Softgel'],
  [/capsule|capsula|\bcaps?\b/i, 'Capsule'],
  [/tablet|comprimido|\btabs?\b|\bcomp\b/i, 'Tablet'],
  [/gummy|gummies|goma/i, 'Gummy'],
  [/liquid|syrup|solution|suspension|xarope|gotas|solucao|suspensao/i, 'Liquid'],
  [/patch/i, 'Patch'],
  [/inhaler/i, 'Inhaler'],
]

const STRENGTH = /(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|g|iu|ml|%)(?![a-z])/i

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\w)/g, (_, a: string, b: string) => a + b.toUpperCase())

export const parsePrescriptionText = (text: string): ScannedMedication => {
  const result: ScannedMedication = { ingredients: [] }
  const flat = stripAccents(text.replace(/\s+/g, ' ').trim())

  const strength = flat.match(STRENGTH)
  if (strength) result.strength = `${strength[1].replace(',', '.')} ${strength[2].toLowerCase() === 'iu' ? 'IU' : strength[2].toLowerCase()}`

  const known = findKnownDrug(flat)
  if (known) {
    result.name = titleCase(known)
  } else {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const candidate = lines.find((l) => /^[A-Za-z][A-Za-z\- ]{2,40}\s+\d/.test(l) && !/^(take|tomar|qty|qtd|quantity|quantidade|rx|receita|refill|dr|dra|patient|paciente)/i.test(l))
    const fromLine = candidate?.match(/^([A-Za-z][A-Za-z\- ]{2,40}?)\s+\d/)?.[1]
    const first = lines.find((l) => /^[A-Za-z][A-Za-z\- ]{2,40}$/.test(l) && !/^(take|tomar|rx|receita|patient|paciente|refill|pharmacy|farmacia)/i.test(l))
    const name = fromLine ?? first
    if (name) result.name = titleCase(name.trim())
  }

  for (const [pattern, form] of FORMS) {
    if (pattern.test(flat)) {
      result.form = form
      break
    }
  }

  const qty =
    flat.match(/\b(?:qty|quantity|dispense[d]?|count)\s*[:.]?\s*(\d{1,4})(?!\d)/i) ??
    flat.match(/\b(?:qtd|quantidade)\s*[:.]?\s*(\d{1,4})(?!\d)/i) ??
    flat.match(/\b(?:caixa|cartela|frasco)\s+(?:com|c\/)\s*(\d{1,4})\b/i) ??
    flat.match(/\b(\d{1,4})\s*(?:tablets?|capsules?|softgels?|pills?|comprimidos?|capsulas?|comp)\b/i)
  if (qty) result.quantity = Number(qty[1])

  result.asNeeded = /as needed|\bprn\b|se necessario|caso necessario|em caso de (dor|febre)|se houver (dor|febre)|\bsos\b/i.test(flat)
  result.bedtime = /bedtime|at night|nightly|\bhs\b|before bed|ao deitar|a noite|antes de dormir/i.test(flat)

  if (/twice\s*(a\s*|per\s*)?(day|daily)|\bbid\b|two times|2 times|every 12 hours|(2|duas)\s*vezes|12\s*(em|\/)\s*12|2x\s*(ao dia|\/dia)/i.test(flat)) result.timesPerDay = 2
  else if (/three times|thrice|\btid\b|3 times|every 8 hours|(3|tres)\s*vezes|8\s*(em|\/)\s*8|3x\s*(ao dia|\/dia)/i.test(flat)) result.timesPerDay = 3
  else if (/four times|\bqid\b|4 times|every 6 hours|(4|quatro)\s*vezes|6\s*(em|\/)\s*6|4x\s*(ao dia|\/dia)/i.test(flat)) result.timesPerDay = 4
  else if (
    /once (a |per )?day|every day|daily|\bqd\b|every morning|each morning|1 time|(1|uma)\s*vez|1x\s*(ao dia|\/dia)|diariamente|todos os dias|pela manha|em jejum|ao dia/i.test(
      flat,
    ) ||
    result.bedtime
  )
    result.timesPerDay = 1

  const directions = text.split(/\r?\n/).find((l) => /\b(take|use|apply|tomar|tome|usar|aplicar|ingerir)\b/i.test(stripAccents(l)))
  if (directions) result.instructions = directions.trim()

  result.category = /\brx\b|prescri|refill|dr\.|dra\.|dispens|pharmacy|receita|\bcrm\b|farmacia|uso continuo/i.test(flat) ? 'prescription' : undefined
  return result
}

export const asCategory = (value: unknown, fallback: Category): Category =>
  value === 'prescription' || value === 'supplement' || value === 'otc' ? value : fallback
