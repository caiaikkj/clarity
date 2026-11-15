import type { LeafletPosology, LeafletSummary } from '../types'

export type LeafletSectionKey = 'indications' | 'posology' | 'administration' | 'sideEffects' | 'contraindications'

export type LeafletPosologyKey = keyof LeafletPosology

export const LEAFLET_SECTION_KEYS: LeafletSectionKey[] = [
  'indications',
  'posology',
  'administration',
  'sideEffects',
  'contraindications',
]

export const POSOLOGY_KEYS: LeafletPosologyKey[] = ['generalUsage', 'frequencyGuidelines', 'safetyNotice']

export const anvisaLeafletUrl = (commercialName: string) =>
  `https://consultas.anvisa.gov.br/#/bulario/q/?nomeProduto=${encodeURIComponent(commercialName)}`

export const consultaRemediosUrl = (commercialName: string) =>
  `https://consultaremedios.com.br/busca?termo=${encodeURIComponent(commercialName)}`

const toItems = (value: unknown): string[] => {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (!Array.isArray(value)) return []
  return value.flatMap(toItems)
}

const emptyPosology = (): LeafletPosology => ({
  generalUsage: [],
  frequencyGuidelines: [],
  safetyNotice: [],
})

const normalizePosology = (value: unknown): LeafletPosology => {
  if (!value || typeof value !== 'object') return emptyPosology()
  const source = value as Record<string, unknown>
  return {
    generalUsage: toItems(source.generalUsage),
    frequencyGuidelines: toItems(source.frequencyGuidelines),
    safetyNotice: toItems(source.safetyNotice),
  }
}

export const hasPosology = (leaflet?: LeafletSummary | null) => {
  const posology = leaflet?.posology
  if (!posology) return false
  return POSOLOGY_KEYS.some((key) => posology[key].length > 0)
}

export const normalizeLeaflet = (raw: unknown): LeafletSummary | null => {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const summary: LeafletSummary = {
    indications: toItems(source.indications),
    posology: normalizePosology(source.posology),
    administration: toItems(source.administration),
    sideEffects: toItems(source.sideEffects),
    contraindications: toItems(source.contraindications),
    generatedAt: new Date().toISOString(),
  }
  const hasContent =
    summary.indications.length > 0 ||
    hasPosology(summary) ||
    summary.administration.length > 0 ||
    summary.sideEffects.length > 0 ||
    summary.contraindications.length > 0
  return hasContent ? summary : null
}
