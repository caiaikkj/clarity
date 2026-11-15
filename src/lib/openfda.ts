import type { FdaInfo } from '../types'

const ENDPOINT = 'https://api.fda.gov/drug/label.json'
const MAX_TEXT = 700

interface LabelResult {
  active_ingredient?: string[]
  purpose?: string[]
  indications_and_usage?: string[]
  warnings?: string[]
  boxed_warning?: string[]
  warnings_and_cautions?: string[]
  drug_interactions?: string[]
  openfda?: {
    brand_name?: string[]
    generic_name?: string[]
    substance_name?: string[]
    manufacturer_name?: string[]
    product_type?: string[]
  }
}

const clean = (value?: string[]) => {
  const text = value?.[0]
    ?.replace(/^\s*(warnings?|purpose|indications? (and|&) usage|drug interactions?|boxed warning)\s*:?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return undefined
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT).replace(/\s+\S*$/, '')}…` : text
}

const score = (r: LabelResult) =>
  [r.warnings, r.boxed_warning, r.warnings_and_cautions, r.drug_interactions, r.purpose, r.indications_and_usage, r.openfda?.substance_name].filter(
    Boolean,
  ).length

export const lookupDrugLabel = async (rawName: string, signal?: AbortSignal, strict = false): Promise<FdaInfo> => {
  const term = rawName.replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim()
  const miss: FdaInfo = { source: 'none', ingredients: [] }
  if (term.length < 2) return miss

  const q = encodeURIComponent(`"${term}"`)
  const search = `openfda.generic_name:${q}+OR+openfda.brand_name:${q}+OR+openfda.substance_name:${q}`
  const timeout = AbortSignal.timeout(9000)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

  let response: Response
  try {
    response = await fetch(`${ENDPOINT}?search=${search}&limit=15`, { signal: combined })
  } catch {
    return miss
  }
  if (!response.ok) return miss

  const data = (await response.json().catch(() => null)) as { results?: LabelResult[] } | null
  const results = data?.results
  if (!results?.length) return miss

  const lowered = term.toLowerCase()
  const relevant = results.filter((r) => {
    const names = [...(r.openfda?.generic_name ?? []), ...(r.openfda?.brand_name ?? []), ...(r.openfda?.substance_name ?? [])].map((n) =>
      n.toLowerCase(),
    )
    const ingredientCount = r.openfda?.substance_name?.length ?? 1
    if (strict) return ingredientCount === 1 && names.some((n) => n === lowered)
    return names.some((n) => n === lowered || (n.includes(lowered) && ingredientCount === 1))
  })
  if (!relevant.length) return miss

  const size = (r: LabelResult) => r.openfda?.substance_name?.length ?? 1
  const best = [...relevant].sort((a, b) => size(a) - size(b) || score(b) - score(a))[0]
  const ingredients = (best.openfda?.substance_name ?? best.openfda?.generic_name ?? []).map((s) => s.toUpperCase())

  return {
    source: 'openFDA',
    brandName: best.openfda?.brand_name?.[0],
    genericName: best.openfda?.generic_name?.[0],
    manufacturer: best.openfda?.manufacturer_name?.[0],
    ingredients: [...new Set(ingredients)],
    purpose: clean(best.purpose) ?? clean(best.indications_and_usage),
    prescriptionOnly: best.openfda?.product_type?.some((t) => /prescription/i.test(t)),
    warnings: clean(best.boxed_warning) ?? clean(best.warnings) ?? clean(best.warnings_and_cautions),
    interactions: clean(best.drug_interactions),
  }
}
