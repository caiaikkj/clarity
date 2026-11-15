import type { Category } from '../types'
import { registerExtraMeds, type AnvisaMed } from './anvisaMeds'

interface CmedRecord {
  n: string
  a: string
  e?: string
  d: string[]
  f: string
  c?: Category
}

const CMED_URL = `${import.meta.env.BASE_URL}data/cmed.json`

const toMed = (record: CmedRecord): AnvisaMed => ({
  commercialName: record.n,
  activeIngredient: record.a,
  englishGeneric: record.e ?? '',
  commonDosages: record.d,
  defaultAdminRulePt: '',
  defaultAdminRuleEn: '',
  category: record.c,
  form: record.f,
})

let pending: Promise<void> | null = null

export const loadCmedMeds = () => {
  pending ??= fetch(CMED_URL)
    .then((response) => (response.ok ? (response.json() as Promise<CmedRecord[]>) : Promise.reject(new Error(String(response.status)))))
    .then((records) => registerExtraMeds(records.map(toMed)))
    .catch(() => {
      pending = null
    })
  return pending
}
