import type { LeafletSummary } from '../types'

export type LeafletSectionKey = 'indications' | 'administration' | 'sideEffects' | 'contraindications'

export const LEAFLET_SECTION_KEYS: LeafletSectionKey[] = ['indications', 'administration', 'sideEffects', 'contraindications']

export const anvisaLeafletUrl = (commercialName: string) =>
  `https://consultas.anvisa.gov.br/#/bulario/q/?nomeProduto=${encodeURIComponent(commercialName)}`

export const consultaRemediosUrl = (commercialName: string) =>
  `https://consultaremedios.com.br/busca?termo=${encodeURIComponent(commercialName)}`

const toItems = (value: unknown): string[] => {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (!Array.isArray(value)) return []
  return value.flatMap(toItems)
}

export const normalizeLeaflet = (raw: unknown): LeafletSummary | null => {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const summary = {
    indications: toItems(source.indications),
    administration: toItems(source.administration),
    sideEffects: toItems(source.sideEffects),
    contraindications: toItems(source.contraindications),
  }
  const hasContent = LEAFLET_SECTION_KEYS.some((key) => summary[key].length > 0)
  return hasContent ? { ...summary, generatedAt: new Date().toISOString() } : null
}
