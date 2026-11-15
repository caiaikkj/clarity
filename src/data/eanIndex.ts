import { toEan13 } from '../lib/barcode'
import { getExtraMeds, type AnvisaMed } from './anvisaMeds'
import { loadCmedMeds } from './cmedMeds'

type EanEntry = [medIndex: number, strength: string, pills: number, pmc: number]

export interface EanMatch {
  code: string
  med: AnvisaMed
  strength: string
  pills: number
  pmc: number
}

const EAN_URL = `${import.meta.env.BASE_URL}data/cmed-eans.json`

let pending: Promise<Record<string, EanEntry> | null> | null = null

const loadEanIndex = () => {
  pending ??= fetch(EAN_URL)
    .then((response) => (response.ok ? (response.json() as Promise<Record<string, EanEntry>>) : null))
    .catch(() => null)
    .then((index) => {
      if (!index) pending = null
      return index
    })
  return pending
}

export const lookupEan = async (code: string): Promise<EanMatch | null> => {
  const [index] = await Promise.all([loadEanIndex(), loadCmedMeds()])
  const meds = getExtraMeds()
  if (!index || meds.length === 0) throw new Error('ean-data-unavailable')
  const entry = index[toEan13(code)]
  const med = entry ? meds[entry[0]] : undefined
  if (!entry || !med) return null
  return { code, med, strength: entry[1], pills: entry[2], pmc: entry[3] }
}
